#!/usr/bin/python3

from flask import jsonify, request, Response, send_file, stream_with_context
from api.v1.media import app_video
from api.v1.media.rgb import list_to_image
from api.v1.auth import token_required, DB, Clip, User
from scipy.io.wavfile import write
import numpy as np
from uuid import uuid4
from mhmovie.code import *
import ffmpeg
from ffmpeg import Error as FFmpegError
import time as tm
import traceback
from moviepy.editor import *
import cv2
import subprocess
import os
import sys
import shutil
import json
import base64
from PIL import Image
from io import BytesIO

def save_video(data, dimensions, process_id):
    """
    Stores the image chunks
    """
    folder = f'/usr/src/app/api/v1/tmpVideo/{process_id}'
    if not os.path.isdir(folder):
        os.mkdir(folder)
        data = data.split(',')[1]
        data = f"{data}{'=' * (4 - (len(data) % 4))}"
        im = Image.open(BytesIO(base64.b64decode(data)))
        im.save(f'{folder}/0.png', 'PNG')
        # list_to_image(data, '0.png', f'{folder}/', dimensions)
    else:
        pos = len(os.listdir(folder))
        im = Image.open(BytesIO(base64.b64decode(data)))
        im.save(f'{folder}/{pos}.png', 'PNG')
        # list_to_image(data, f'{pos:06}.png', f'{folder}/', dimensions)
    return True

def save_audio(data, process_id):
    """
    Stores the audio chunks
    """
    folder = f'/usr/src/app/api/v1/tmpAudio/{process_id}'
    if not os.path.isdir(folder):
        os.mkdir(folder)
        with open(f'{folder}/0.json', 'w') as aufile:
            aufile.write(json.dumps(data))
    else:
        pos = len(os.listdir(folder))
        with open(f'{folder}/{pos:06}.json', 'w') as aufile:
            aufile.write(json.dumps(data))
    return True

def merge_clips(clips):
    """
    Merge all Clips in one video
    """
    videoid = str(uuid4())
    inputs = []
    for clip in clips:
        path = f'/usr/src/app/api/v1/tmpRender/{clip}/rendered.mp4'
        inp = ffmpeg.input(path)
        inputs.append(inp['v'])
        inputs.append(inp['a'])
    os.mkdir(f'/usr/src/app/api/v1/rendered/{videoid}')
    (ffmpeg.concat(*inputs, v=1, a=1)
        .output(f'/usr/src/app/api/v1/rendered/{videoid}/rendered.mp4')
        .run(overwrite_output=True))
    for clip in clips:
        shutil.rmtree(f'/usr/src/app/api/v1/tmpRender/{clip}', ignore_errors=True)
    return videoid


@app_video.route('/join',
                methods=['POST'])
@token_required
def join_video_tracks():
    data = request.get_json()
    if data['type'] == 'audio':
        save_audio(data['data'], data['id'])
    elif data['type'] == 'video':
        # print(data)
        save_video(data['data'], data['dimensions'], data['id'])
    elif data['type'] == 'render':
        render_video(data['id'], data['time'])
    elif data['type'] == 'merge':
        _id = merge_clips(data['clips'])
        duration = ffmpeg.probe(f'./api/v1/rendered/{_id}/rendered.mp4')['format']['duration']
        clip = Clip()
        clip.id = _id
        clip.src = f'http://127.0.0.1:3001/video/clips/{_id}'
        clip.user_id = request.user
        clip.duration = duration
        clip.save()
        return jsonify(id=_id)
    return jsonify(message='success')

@app_video.route('/clips/urls',
                methods=['GET'],
                strict_slashes=False)
@token_required
def get_video_clips():
    db = DB()
    clips = db.filter_by('clips', 'user_id', request.user)
    if not clips:
        clips = []
    for clip in clips:
        if 'duration' not in clip.to_dict().keys() or clip.duration == '':
            _id = clip.id
            try:
                sys.stderr = open('err_file', 'w')
                duration = ffmpeg.probe(f'/usr/src/app/api/v1/rendered/{_id}/rendered.mp4')['format']['duration']
                print(duration)
                clip.duration = duration
                clip.save()
            except FFmpegError as e:
                print(e.stderr.decode('utf8'))
                # for line in sys.stderr:
                #     print(line)

                # print()
                # print(ffmpeg.Error)
                # with open('err_file', 'r') as err:
                #     print(err.read())
                # print(e)
    print(clips)
    return Response(json.dumps([clip.to_dict() for clip in clips]), mimetype='application/json')

@app_video.after_request
def after_request(response):
    response.headers.add('Accept-Ranges', 'bytes')
    return response

@app_video.route('/clips/<clip_id>',
                methods=['GET'],
                strict_slashes=False)
def get_video_clip(clip_id):
    render_folder = f'/usr/src/app/api/v1/rendered/{clip_id}/rendered.mp4'
    return send_file(
        render_folder, attachment_filename='video.mp4',
        mimetype='video/mp4'
    )

def render_video(process_id, time):
    """
    render the video based on the tmpAudio and tmpVideo content
    """
    folder = f'/usr/src/app/api/v1/tmpAudio/{process_id}'
    audio_list = sorted(os.listdir(folder))
    audio_data = []
    for audio_file in audio_list:
        with open(f'{folder}/{audio_file}', 'r') as aufile:
            data = json.loads(aufile.read())
            for byte in data:
                audio_data.append(byte)
    audio_np_array = np.array(audio_data)
    fs = 44100
    render_folder = f'/usr/src/app/api/v1/tmpRender/{process_id}'
    os.mkdir(render_folder)
    print('saving audio at ', fs, 'per second')
    duration = len(audio_np_array) / fs
    print('audio duration: ', duration)
    matrix = np.array([audio_np_array]).T
    write(f'{render_folder}/audio_file.wav', fs, matrix)
    # compose the image with the photos
    img_folder = f'/usr/src/app/api/v1/tmpVideo/{process_id}'
    images_list = sorted(os.listdir(img_folder))
    frames = len(images_list)
    fps = frames / duration
    print('video duration:', duration)
    print('fps: ', fps)
    img_array = []
    for filename in images_list:
        img = cv2.imread(f'{img_folder}/{filename}')
        height, width, layers = img.shape
        size = (width, height)
        img_array.append(img)
    out = cv2.VideoWriter(f'{render_folder}/video_file.mp4', cv2.VideoWriter_fourcc(*'MP4V'), int(fps), size)
    for i in range(len(img_array)):
        out.write(img_array[i])
    out.release()
    tm.sleep(3)
    print(os.listdir(f'{render_folder}'))
    print(os.path.exists(f'{render_folder}/audio_file.wav'))
    try:
        input_video = ffmpeg.input(f'{render_folder}/video_file.mp4')
        input_audio = ffmpeg.input(f'{render_folder}/audio_file.wav')
        (ffmpeg.concat(input_video, input_audio, v=1, a=1)
            .output(f'{render_folder}/rendered.mp4')
            .run(overwrite_output=True))
    except Exception as e:
        traceback.print_exc()
        print(e)
    # ffmpeg.concat(input_video, input_audio, v=1, a=1).output()
    shutil.rmtree(f'{folder}', ignore_errors=True)
    shutil.rmtree(f'{img_folder}', ignore_errors=True)
    
    