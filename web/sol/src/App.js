import React, { useRef } from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom'; 
import * as tf from "@tensorflow/tfjs";
import * as bodyPix from "@tensorflow-models/body-pix";
import Webcam from "react-webcam";
import './App.css';
import menuStyles from './Menu.module.css';
import videoStyles from './VideoFrame.module.css';
import backVideo from './airport.mp4';
import testVideo from './rendered.mp4';
import { v4 as uuidv4 } from 'uuid';
import { Login } from './Login.js'
import { time } from '@tensorflow/tfjs';

const framerate = 44100;

const global = {
	domain: 'https://dnart.tech/snap'
};

class RecorderEditor extends React.Component {
	constructor (props) {
		super(props);
		// console.log(props.data);
		this.callback = props.callback;
		this.appendClip = props.appendClip;
		this.playing = false;
		this.data = props.data;
		this.currentTime = this.data.start;
		this.duration = props.data.duration;
		this.fps = this.data.images.length / this.duration;
	}
	componentDidMount () {
		this.toggleControls();
		this.setCropPositions();
		this.play();
	}
	playAudio () {
		let context = new AudioContext();
		let buffer = context.createBuffer(1, this.data.audio.length, framerate);
		let buf = buffer.getChannelData(0);
		for (let i = 0; i < this.data.audio.length; i++) {
			buf[i] = this.data.audio[i];
		}
		const source = context.createBufferSource();
		source.buffer = buffer;
		const streamNode = context.createMediaStreamDestination();
		source.connect(streamNode);
		const audio = document.querySelector('audio');
		audio.srcObject = streamNode.stream;
		this.audio = audio;
		this.audioContext = source;
		source.start(this.currentTime);
		audio.play();
	}
	setCropPositions () {
		const timeline = document.getElementsByClassName(videoStyles.recorded_editor_timeline)[0];
		const width = timeline.clientWidth - 6;
		const sPos = Math.round(this.data.start * (width / this.duration));
		const ePos = Math.round(this.data.end * (width / this.duration));
		const start = timeline.querySelector('[pos="start"]').parentNode;
		const end = timeline.querySelector('[pos="end"]').parentNode;
		start.style.left = sPos + 'px';
		end.style.left = ePos + 'px';
		console.log(timeline, width, sPos, ePos, start, end);
	}
	getImageAtTime(second) {
		const timeline = document.getElementsByClassName(videoStyles.recorded_editor_timeline)[0];
		const pointer = timeline.querySelector('div');
		const index = Math.round(second * (this.data.images.length / this.duration));
		return index;
	}
	updateTime (evn) {
		console.log(evn.target.tagName);
		if (evn.target.tagName === 'DIV') {
			const x = evn.clientX - 20;
			const width = evn.target.clientWidth;
			const newTime = x * (this.duration / width);
			if (this.croped_selected) {
				console.log('move crop dial');
				const cropSelector = document.querySelector(`[pos="${this.croped_selected}"]`).parentNode;
				this.data[this.croped_selected] = newTime;
				cropSelector.style.left = Math.round(x) + 'px';
			} else {
				this.currentTime = newTime;
				this.setTimePoint();
			}
			console.log(this.croped_selected);
		} else if (evn.target.tagName === 'H2') {
			const pointer = evn.target.getAttribute('pos');
			if (pointer === 'current') {
				this.croped_selected = undefined;
				this.cleanCropSelectors(evn.target.parentNode.parentNode);
			} else {
				this.cleanCropSelectors(evn.target.parentNode.parentNode);
				this.croped_selected = evn.target.getAttribute('pos');
				evn.target.style.backgroundColor = 'blue';
				evn.target.parentNode.style.backgroundColor = 'blue';
			}
		}
	}
	setTimePoint () {
		const currentTime = this.currentTime;
		const timeline = document.getElementsByClassName(videoStyles.recorded_editor_timeline)[0];
		const pointer = timeline.querySelector('div');
		const width = timeline.clientWidth - 6;
		console.log(timeline.clientWidth);
		const position = currentTime * (width / this.duration);
		pointer.style.left = Math.round(position) + 'px';
	}
	cleanCropSelectors (timeline) {
		const dials = timeline.querySelectorAll('div');
		dials[1].style.backgroundColor = 'white';
		dials[2].style.backgroundColor = 'white';
		dials[1].firstChild.style.backgroundColor = 'white';
		dials[2].firstChild.style.backgroundColor = 'white';
	}
	play () {
		const editor = this;
		const timeline = document.getElementsByClassName(videoStyles.recorded_editor_timeline)[0];
		this.croped_selected = undefined;
		this.cleanCropSelectors(timeline);
		const player = document.getElementsByClassName(videoStyles.recorded_editor_player)[0];
		const canvas = player.querySelector('canvas');
		canvas.width = this.data.dimensions[0];
		canvas.height = this.data.dimensions[1];
		const context = canvas.getContext('2d');
		const imageData = context.createImageData(this.data.dimensions[0], this.data.dimensions[1]);
		// console.log(imageData);
		// console.log(this.data.duration);
		// console.log(this.duration);
		const data = imageData.data;
		function tic () {
			try {
				const index = editor.getImageAtTime(editor.currentTime);
				for (let i = 0; i < editor.data.images[0].length; i++) {
					data[i]= editor.data.images[index][i];
				}
				context.putImageData(imageData, 0, 0);
				editor.currentTime += (1000 / editor.fps) / 1000;
				const timeTxt = document.getElementsByClassName(videoStyles.recorded_editor_time)[0];
				let currentPos = editor.duration - editor.currentTime;
				let minutes = Math.round(currentPos / 60);
				let seconds = Math.round(currentPos % 60);
				if (minutes < 10) {
					minutes = '0' + minutes;
				}
				if (seconds < 10) {
					seconds = '0' + seconds;
				}
				timeTxt.innerHTML = `${minutes}:${seconds}`;
				editor.setTimePoint();
			} catch (err) {
				clearInterval(editor.playInterval);
			}
		}
		
		if (this.playing) {
			// Pause
			this.playing = false;
			this.audio.pause();
			this.audioContext.stop();
			// this.audio.pause();
			clearInterval(this.playInterval);
			const playBtn = player.querySelectorAll('button')[1];
			playBtn.classList.remove(videoStyles.preview_pause);
			const index = editor.getImageAtTime(editor.currentTime);
			for (let i = 0; i < editor.data.images[0].length; i++) {
				if (index >= editor.data.images.length) {
					// end of video
					editor.currentTime = editor.data.start;
					editor.audio.currentTime = editor.data.start;
					data[i]= editor.data.images[editor.data.images.length - 1][i];
				} else {
					data[i]= editor.data.images[index][i];
				}
				
			}
			context.putImageData(imageData, 0, 0);
			// this.audio.currentTime = editor.currentTime;
		} else {
			this.playing = true;
			this.playAudio();
			const playBtn = player.querySelectorAll('button')[1];
			this.playInterval = setInterval(tic, 1000 / this.fps);
			playBtn.classList.add(videoStyles.preview_pause);
		}
	}
	toggleControls () {
		const controls = document.getElementsByClassName(videoStyles.recorded_editor_player_controls)[0];
		controls.classList.toggle(videoStyles.recorded_editor_player_visible);
	}
	save () {
		console.log('saving clip', this.data);
		this.appendClip(this.data, this.data.index);
		this.close();
	}
	close () {
		this.playing = false;
		unmountComponentAtNode(document.getElementById('editor'));
		this.callback();
	}
	render () {
		return (
			<div className={ videoStyles.recorded_editor }>
				
				<button className={ videoStyles.close_recorded } onClick={ ()=>{ this.close() }}></button>
				<button className={ videoStyles.save_recorded } onClick={ ()=>{ this.save() }}></button>
				<ul>
					<li></li>
					<li></li>
					<li></li>
					<li></li>
				</ul>
				<div className={ videoStyles.recorded_editor_timeline } onClick={ (evn)=>{ this.updateTime(evn) } }>
					<div className={ videoStyles.recorded_editor_timeline_current }><h2 pos="current"></h2></div>
					<div className={ videoStyles.recorded_editor_timeline_start }><h2 pos="start"></h2></div>
					<div className={ videoStyles.recorded_editor_timeline_end }><h2 pos="end"></h2></div>
				</div>
				<audio></audio>
				<div className={ videoStyles.recorded_editor_player }>
					<canvas onClick={ ()=>{ this.toggleControls() } }></canvas>
					<audio className={ videoStyles.recorded_editor_player_audio }></audio>
					<h1 className={ videoStyles.recorded_editor_time }>00:00</h1>
					<div className={ videoStyles.recorded_editor_player_controls }>
						<button></button>
						<button onClick={ ()=> { this.play() } }></button>
						<button></button>
						<h1></h1>
						<button></button>
					</div>
				</div>
			</div>
		)
	}
}


const root = document.getElementById('root');
class PreviewPlayer extends React.Component {
	constructor (props) {
		super(props);
		this.clipUrl = this.props.clipUrl;
		this.playingPreview = false;
	}
	mute (evn) {
		const videoPreview = document.getElementsByClassName(videoStyles.record_preview)[0];
		const video = videoPreview.querySelector('video');
		evn.target.classList.toggle(videoStyles.preview_unmuted);
		video.muted = (!video.muted)
		console.log(video.muted);
	}
	updatePreviewTime (evn) {
		const previewer = this;
		const videoPreview = document.getElementsByClassName(videoStyles.record_preview)[0];
		this.video.pause();
		const timeline = videoPreview.getElementsByClassName(videoStyles.preview_timeline)[0];
		const timepoint = timeline.querySelector('h2');
		const total = this.video.duration;
		const width = timeline.clientWidth;
		let time = (evn.clientX - 12) * (total / width);
		this.video.currentTime = Number(time.toFixed(4));
		this.placeTimePreviewPointer();
		this.video.onseeked = function () {
			if (previewer.playingPreview) {
				previewer.playingPreview = false;
				const playBtn = document.getElementsByClassName(videoStyles.preview_play)[0];
				// console.log(previewer.video.currentTime);
				previewer.playPreview({
					target: playBtn
				})
			}
			
		}
	}
	placeTimePreviewPointer () {
		const videoPreview = document.getElementsByClassName(videoStyles.record_preview)[0];
		const video = videoPreview.querySelector('video');
		const timeline = videoPreview.getElementsByClassName(videoStyles.preview_timeline)[0];
		const timepoint = timeline.querySelector('h2');
		let currentPos = video.currentTime;
		const total = video.duration;
		const width = timeline.clientWidth;
		const position = Math.round(currentPos * (width / total));
		timepoint.style.marginLeft = (position - 10) + 'px';
		const timeTxt = document.getElementsByClassName(videoStyles.preview_time)[0];
		currentPos = total - currentPos;
		let minutes = Math.round(currentPos / 60);
		let seconds = Math.round(currentPos % 60);
		if (minutes < 10) {
			minutes = '0' + minutes;
		}
		if (seconds < 10) {
			seconds = '0' + seconds;
		}
		timeTxt.innerHTML = `${minutes}:${seconds}`;
		// // console.log(video.currentTime);
	}
	playPreview (evn) {
		const previewer = this;
		evn.target.style.opacity = 1;
		// // console.log('preview');
		if (!this.playingPreview) {
			setTimeout(() => {
				try {
					const playBtn = document.getElementsByClassName(videoStyles.preview_play)[0];
					playBtn.style.opacity = 0;
				} catch (err) {
					console.log(err);
				}
			}, 1200);
			this.playingPreview = true;
			// video.load();
			previewer.video.play();
			// // console.log(video.duration, video.played, video.buffered);
			previewer.video.addEventListener('timeupdate', this.placeTimePreviewPointer);
			evn.target.classList.add(videoStyles.preview_pause);
			this.placeTimePreviewPointer();
		} else {
			evn.target.classList.remove(videoStyles.preview_pause);
			this.playingPreview = false;
			previewer.video.pause();
			previewer.video.removeEventListener('timeupdate', this.placeTimePreviewPointer);
		}
	}
	componentDidMount () {
		const videoPreview = document.getElementsByClassName(videoStyles.record_preview)[0];
		const video = videoPreview.querySelector('video');
		const muted = document.getElementsByClassName(videoStyles.preview_muted)[0];
		muted.classList.toggle(videoStyles.preview_unmuted);
		this.video = video;
		this.video.load();
		// video.play();
		// this.playingPreview = true;
		const playBtn = document.getElementsByClassName(videoStyles.preview_play)[0];
		this.playPreview({
			target: playBtn
		})
		const player = this;
		this.video.onended = function (evn) {
			console.log('ended');
			player.playingPreview = false;
			playBtn.classList.remove(videoStyles.preview_pause);
			video.currentTime = 0;
		}
		// playBtn.classList.add(videoStyles.preview_pause);
		// video.addEventListener('timeupdate', this.placeTimePreviewPointer);
	}
	save () {
		this.close();
	}
	close () {
		const previewer = this;
		unmountComponentAtNode(document.getElementById('preview'));
		previewer.video.removeEventListener('timeupdate', this.placeTimePreviewPointer);
	}
	render() {
		let clipUrl = this.clipUrl;
		return (
			(
				<div className={ videoStyles.record_preview }>
					<div className={ videoStyles.preview_navigation }>
						<div>
							<button className={ videoStyles.preview_nav_back }
									onClick={ (evn)=>{ this.close() } }></button>
						</div>
						<div>
							<button className={ videoStyles.preview_nav_delete }></button>
						</div>
						<div>
							<button className={ videoStyles.preview_nav_save }
									onClick={ (evn)=>{ this.save() } }></button>
						</div>
					</div>
					<video className={ videoStyles.preview_unmuted } muted={ false }>
					<source type="video/mp4" src={ clipUrl }
					></source>
					</video>
					<div className={ videoStyles.preview_controls }>
						<button className={ videoStyles.preview_back }></button>
						<button className={ videoStyles.preview_play } onClick={(evn)=>{ this.playPreview(evn) }}></button>
						<button className={ videoStyles.preview_ford }></button>
						<button className={ videoStyles.preview_muted } onClick={ (evn)=>{ this.mute(evn) } }></button>
						<h1 className={ videoStyles.preview_time }>00:00</h1>
						<div className={ videoStyles.preview_timeline } onClick={ (evn)=>{ this.updatePreviewTime(evn)} }>
							<h2></h2>
						</div>
					</div>
				</div>
				
			)
		)
	}
}

function VideoFrame () {
	const loadingRef = useRef(null);
	const triggerRef = useRef(null);
	const galleryRef = useRef(null);
	const webcamRef = useRef(null);
	const canvasRef = useRef(null);
	const backVideoRef = useRef(null);
	const clips = [];
	let render = false;
	let recPressed = false;
	let recording = false;
	let currentMask;
	let recordedframes = [];

	const dimensions = [window.innerWidth, window.innerHeight];
	let cropedDimensions;
	// console.log(dimensions);

	const videoConstraints = {
		width: dimensions[0],
		height: dimensions[1],
		facingMode: "user"
	}

	// Navigation

	const back = () => {
		stop();
		ReactDOM.render(
			(
				<MainView></MainView>
			),
			root
		);
	}
	let interval;
	let clockInterval;
	/**
	 * runBodySegment - startpoint for the background extraction
	 */
	const runBodySegment = async () => {
		const toolBtn = document.getElementsByClassName(videoStyles.back_remove)[0];
		if (render) {
			render = false;
			toolBtn.classList.remove(videoStyles.active);
			canvasRef.current.style.display = 'none';
			clearInterval(interval);
		} else {
			loadingRef.current.style.visibility = 'visible';
			toolBtn.classList.add(videoStyles.active);
			render = true;
			const net = await bodyPix.load();
			if (backVideoRef.current) {
				backVideoRef.current.play();
			}
			canvasRef.current.style.display = 'block';
			interval = setInterval(async function(){
				if (render) {
					// webcamRef.current.video.style.visibility = 'hidden';
					loadingRef.current.style.visibility = 'hidden';
					galleryRef.current.style.filter = 'opacity(1)';
					detect(net);
				} else if (!render) {
					clearInterval(interval);
					// console.log('no rendering');
					canvasRef.current.style.display = 'none';
				}
			}, 29);
		}
	}
	/**
	 * backMask - utility to apply the mask and compose the image using the video background
	 * @param {ImageData} image 
	 * @param {ImageData} mask 
	 * @returns {ImageData} image - after the mask is applied
	 */
	const backMask = (image, mask) => {
		// // console.log(image, mask, backVideoRef.current);
		const cv = document.createElement('canvas');
		let imageData;
		try {
			const videoW = backVideoRef.current.videoWidth;
			const videoH = backVideoRef.current.videoHeight;
			cv.style.width = image.height * (videoW / videoH);
			cv.style.height = image.height;
			cv.width = image.height * (videoW / videoH);;
			cv.height = image.height;
			const ctx = cv.getContext('2d');
			ctx.drawImage(backVideoRef.current, 0, 0, cv.width, cv.height);
			imageData = ctx.getImageData(0, 0, image.width, image.height);
		} catch (err) {
			// console.log(err);
			return null;
		}
		// // console.log(image, mask, imageData);
		for (let i = 0; i < image.data.length; i+=4) {
			const vector = [
				mask.data[i],
				mask.data[i + 1],
				mask.data[i + 2],
				mask.data[i + 3],
			]
			if (
				(vector[0] === 255 &&
				vector[1] === 255 &&
				vector[2] === 255)
				) {
					image.data[i] = imageData.data[i];
					image.data[i + 1] = imageData.data[i + 1];
					image.data[i + 2] = imageData.data[i + 2];
					image.data[i + 3] = imageData.data[i + 3];
			}
		}
		return image;
	}
	/**
	 * detect - prediction for each WebCam frame
	 * @param {TensorFlowNet} net 
	 */
	const detect = async (net) => {
		if (
			typeof webcamRef.current !== "undefined" &&
			webcamRef.current !== null &&
			webcamRef.current.video.readyState === 4
			) {
				const videoTrack = webcamRef.current.stream.getVideoTracks()[0];
				const video = webcamRef.current.video;
				backVideoRef.current.width = video.videoWidth;
				backVideoRef.current.height = video.videoHeight;
				cropedDimensions = [video.videoWidth, video.videoHeight];
				videoTrack.applyConstraints(videoConstraints);
				const videoHeight = video.videoHeight;
				const videoWidth = video.videoWidth;
				webcamRef.current.video.width = videoWidth;
				webcamRef.current.video.height = videoHeight;
				canvasRef.current.width = videoWidth;
				canvasRef.current.height = videoHeight;
				const outStride = 16;
				const segThreshold = 0.5;
				const cv = document.createElement('canvas');
				cv.style.width = videoWidth;
				cv.style.height = videoHeight;
				cv.width = videoWidth;
				cv.height = videoHeight;
				const ctx = cv.getContext('2d');
				ctx.drawImage(video, 0, 0, cv.width, cv.height);
				const imageData = ctx.getImageData(0, 0, cv.width, cv.height);
				const person = await net.segmentPersonParts(video, outStride, segThreshold);
				const coloredPart = bodyPix.toColoredPartMask(person);
				const back = backMask(imageData, coloredPart);
				if (!back) {
					// console.log('no segmentation data');
					const ctx2 = canvasRef.current.getContext('2d');
					ctx2.putImageData(imageData, 0, 0);
					if (recording) {
						recordedframes.push(Array.from(imageData.data));
					}
				} else {
					const ctx2 = canvasRef.current.getContext('2d');
					ctx2.putImageData(back, 0, 0);
					if (recording) {
						// // console.log(back.width, back.height);
						recordedframes.push(Array.from(back.data));
					}
				}
			}
	}
	/**
	 * stop - Stop each streaming Track and sets render as false to stop detection
	 */
	const stopDetection = () => {
		render = false;
	}
	const stop = () => {
		render = false;
		backVideoRef.current.pause();
		const tracks = webcamRef.current.stream.getTracks();
		// // console.log(tracks);
		for (const track of tracks) {
			track.stop();
		}
	}
	const checkVideoTrack = () => {
	}
	let recordedChuncks = [];
	let audioStream;
	const chunkl = 256 * 64;
	const recordAudio = function () {
		audioStream = webcamRef.current.stream;
		const options = {
			mimeType: 'audio/webm'
		};
		recordedChuncks = [];
		// console.log(audioStream);
		var context = new AudioContext({sampleRate: framerate});
		var source = context.createMediaStreamSource(audioStream)
		var processor = context.createScriptProcessor(chunkl, 1, 1);
		source.connect(processor);
		processor.connect(context.destination);
		const event = async function (e) {
			if (recording) {
				// // console.log(e.inputBuffer);
				recordedChuncks.push(...e.inputBuffer.getChannelData(0));
			} else {
				processor.onaudioprocess = null;
			}
		}
		processor.onaudioprocess = event;
	}
	let minutes = 0;
	let seconds = 0;
	let mill = 0;
	const activeClock = function () {
		minutes = 0;
		seconds = 0;
		const clock = document.getElementsByClassName(videoStyles.record_time)[0];
		const timeTXT = clock.querySelector('h1');
		const timeButton = clock.querySelector('button');
		timeButton.classList.add(videoStyles.recording);
		const tic = function () {
			if (recording) {
				let timeStr = ``;
				// modify the time
				seconds++;
				if (seconds > 59) {
					seconds = 0;
					minutes++;
				}
				// add padding for the minutes and seconds
				if (minutes < 10) {
					timeStr += '0' + minutes;
				} else {
					timeStr += minutes;
				}
				timeStr += ':'
				if (seconds < 10) {
					timeStr += '0' + seconds;
				} else {
					timeStr += seconds;
				}
				// draw the time in browser
				timeTXT.innerHTML = timeStr;
			} else {
				timeButton.classList.remove(videoStyles.recording);
				clearInterval(clockInterval);
			}
		}
		clockInterval = setInterval(tic, 1000);
	}
	let int;
	let context = this;
	const record = () => {
		const triggerView = triggerRef.current;
		// console.log(triggerRef.current.querySelector('h1'));
		if (!recording && !recPressed) {
			recPressed = true;
			recordedframes = [];
			const clock = document.getElementsByClassName(videoStyles.record_time)[0];
			const timeTXT = clock.querySelector('h1');
			timeTXT.innerHTML = '00:00';
			const recButton = document.getElementsByClassName(videoStyles.recordBtn)[0];
			recButton.className = videoStyles.recordingBtn;
			// console.log();
			// console.log('animation init');
			let count = 3;
			// console.log(videoStyles.trigger_anim);
			function x(){
				triggerView.querySelector('h1').className = '';
				if (count === 0) {
					// console.log('stop trigger');
					triggerView.style.display = 'none';
					triggerView.querySelector('h1').className = '';
					triggerView.querySelector('h1').classList.remove(videoStyles.trigger_anim);
					clearInterval(int);
					recording = true;
					activeClock();
					recordAudio();
				} else {
					triggerView.querySelector('h1').innerHTML = count + '!';
					triggerView.querySelector('h1').classList.add(videoStyles.trigger_anim);
					triggerView.style.display = 'block';
					count--;
				}
			}
			x();
			int = setInterval(x, 1000);
		} else {
			const recButton = document.getElementsByClassName(videoStyles.recordingBtn)[0];
			recButton.className = videoStyles.recordBtn;
			recording = false;
			recPressed = false;
			clearInterval(int);
			triggerView.style.display = 'none';
			if (recordedframes.length > 0) {
				const props = {
					images: recordedframes,
					audio: recordedChuncks,
					dimensions: cropedDimensions,
					duration: recordedChuncks.length / framerate,
					start: 0,
					end: recordedChuncks.length / framerate
				}
				renderEditor(props, drawRecordedClips);
			} else {
				deleteRecorded();
			}
		}
	}
	const renderEditor = function (props, callback) {
		render = false;
		const toolBtn = document.getElementsByClassName(videoStyles.back_remove)[0];
		toolBtn.classList.remove(videoStyles.active);
		const editor = document.getElementById('editor');
		// console.log(callback);
		ReactDOM.render(
			(
				<RecorderEditor data={ props } callback={ callback } appendClip={ appendClip }></RecorderEditor>
			),
			editor
		);
	}
	const uploadClip = async function (clip) {
		const processId = uuidv4();
		// Uploading Audio fragments
		let audioStartindex = Math.round(clip.start * (clip.recordedChuncks.length / clip.duration));
		let audioEndindex = Math.round(clip.end * (clip.recordedChuncks.length / clip.duration));
		for (let aIndex = audioStartindex; aIndex < audioEndindex; aIndex += chunkl) {
			const diff = clip.recordedChuncks.length - aIndex;
			let chunk;
			if (diff < chunkl) {
				chunk = clip.recordedChuncks.slice(aIndex, clip.recordedChuncks.length) 
			} else {
				chunk = clip.recordedChuncks.slice(aIndex, aIndex + (chunkl));
			}
			const req = await fetch(`${global.domain}_api/video/join`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': localStorage.getItem('token')
					},
					body: JSON.stringify({
						id: processId,
						type: 'audio',
						data: chunk
					})
				}
			);
			// console.log(await req.json());
		}
		// Uploading Video fragments
		let videoStartindex = Math.round(clip.start * (clip.recordedframes.length / clip.duration));
		let videoEndindex = Math.round(clip.end * (clip.recordedframes.length / clip.duration));
		for (let vIndex = videoStartindex; vIndex < videoEndindex; vIndex++) {
			let chunk;
			chunk = Array.from(clip.recordedframes[vIndex]);
			const req = await fetch(`${global.domain}_api/video/join`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': localStorage.getItem('token')
					},
					body: JSON.stringify({
						id: processId,
						type: 'video',
						dimensions: clip.dimensions,
						data: chunk
					})
				}
			);
			// console.log(await req.json());
		}
		// Render the clip
		const req = await fetch(`${global.domain}_api/video/join`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': localStorage.getItem('token')
				},
				body: JSON.stringify({
					id: processId,
					type: 'render',
					time: {
						minutes: minutes,
						seconds: seconds
					}
				})
			}
		);
		const res = await req.json();
		// console.log(res);
		return processId;
	}
	const renderVideo = async function () {
		loadingRef.current.style.visibility = 'visible';
		const renderedClips = [];
		// render each clip
		for (let i = 0; i < clips.length; i++) {
			const clipId = await uploadClip(clips[i]);
			renderedClips.push(clipId);
		}
		// Then merge all
		const processId = uuidv4();
		const req = await fetch(`${global.domain}_api/video/join`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': localStorage.getItem('token')
				},
				body: JSON.stringify({
					id: processId,
					type: 'merge',
					clips: renderedClips
				})
			}
		);
		const res = await req.json();
		// console.log(res);
		return res.id;
		
	}
	const save = async function () {
		const renderedVideoId = await renderVideo();
		loadingRef.current.style.visibility = 'hidden';
		openPreview(`${global.domain}_api/video/clips/${renderedVideoId}`);
	}
	const openPreview = function (url) {
		const videoPreview = document.getElementById('preview');
		ReactDOM.render(
			(
				<PreviewPlayer clipUrl={ url }></PreviewPlayer>
			),
			videoPreview
		);
	}
	const lowerSize = function () {
		return cropedDimensions[0] > cropedDimensions[1] ? cropedDimensions[1] : cropedDimensions[0];
	}
	const openClip = function (index) {
		const props = {
			images: clips[index].recordedframes,
			audio: clips[index].recordedChuncks,
			dimensions: clips[index].dimensions,
			duration: clips[index].duration,
			index: index,
			start: clips[index].start,
			end: clips[index].end,
		}
		render = false;
		renderEditor(props, drawRecordedClips);
	}
	const appendClip = function (data, index) {
		const newData = {
			recordedChuncks: data.audio,
			recordedframes: data.images,
			dimensions: data.dimensions,
			duration: data.duration,
			start: data.start,
			end: data.end
		}
		if (index !== undefined && index !== null) {
			newData.index = index;
			clips[index] = newData;
		} else {
			clips.push(newData);
		}
		deleteRecorded();
	}
	const drawRecordedClips = function() {
		const editor = document.getElementById('editor');
		let clipIndex = 0;
		const renderClips = clips.map((clip) => {
			const frame = clip.recordedframes[0];
			const canvas = document.createElement('canvas');
			canvas.width = cropedDimensions[0];
			canvas.height = cropedDimensions[1];
			const ctx = canvas.getContext('2d');
			const imageData = ctx.createImageData(dimensions[0], dimensions[1]);
			for (let i = 0; i < frame.length; i++) {
				imageData.data[i] = frame[i];
			}
			ctx.putImageData(imageData, 0, 0);
			const cropped = ctx.getImageData(0, cropedDimensions[1] - lowerSize(), lowerSize(), lowerSize());
			ctx.canvas.width = lowerSize();
			ctx.canvas.height = lowerSize();
			ctx.putImageData(cropped, 0, 0);
			const dataUrl = ctx.canvas.toDataURL('image/png');
			const tmpIndex = clipIndex;
			clipIndex++;
			return (
				<li className={ videoStyles.clip } key={ uuidv4() }
					onClick={(evn) => { openClip(tmpIndex) }}>
					<img src={ dataUrl } alt="" key={ uuidv4() }/>
				</li>
			);
		});
		// console.log(renderClips);
		ReactDOM.render(
			(
				<div className={ videoStyles.clips }>
					<button className={ videoStyles.clips_back } onClick={ (evn)=>{ scrollClips(evn, -20) } }></button>
					<ul>
					{ renderClips }
					</ul>
					<button className={ videoStyles.clips_next } onClick={ (evn)=>{ scrollClips(evn, 20) } }></button>
				</div>
			),
			editor
		);
	}
	const scrollClips = function (evn, steps) {
		const parent = evn.target.parentNode;
		const clipList = parent.querySelector('ul');
		let scroll = clipList.scrollLeft;
		scroll += steps;
		clipList.scrollLeft = scroll;
	}
	const deleteRecorded = function () {
		recordedChuncks = [];
		recordedframes = [];
		const clock = document.getElementsByClassName(videoStyles.record_time)[0];
		const timeTXT = clock.querySelector('h1');
		timeTXT.innerHTML = '00:00';
	}
	// runBodySegment();
	navigator.mediaDevices.getUserMedia({audio:true, video:false}).then(function(result) {
			audioStream = result;
	});
	const renderView = function () {
		return (
			<div className={ videoStyles.container }>
			<div id="preview">
			</div>
			<div className={ videoStyles.loading } ref={loadingRef}>
				<h1></h1>
				<h2>Loading...</h2>
			</div>
			<div className={ videoStyles.trigger } ref={triggerRef}>
				<h1>3!</h1>
			</div>
			<div className={ videoStyles.back } onClick={() => { back() }}></div>
				<div className={ videoStyles.toolsMenu }>
					<ul>
						<li className={ videoStyles.save } onClick={()=>{save()}}></li>
						<li className={ videoStyles.back_remove } onClick={ ()=>{runBodySegment()} }></li>
						<li className={ videoStyles.other }></li>
					</ul>
				</div>
				<Webcam ref={webcamRef} className={ videoStyles.webcam }
					videoConstraints={ videoConstraints }
					/>
				<canvas ref={canvasRef}
					className={ videoStyles.render_canvas }></canvas>
				<video 
					ref={ backVideoRef } className={ videoStyles.back_video }
					>
					<source src={ backVideo } type="video/mp4"/>
				</video>
				<div className={ videoStyles.record_time }>
					<h1>00:00</h1>
					<button></button>
				</div>
				<div id="editor"></div>
				<div className={ videoStyles.controls }>
				
					<button className={ videoStyles.galleryBtn } onClick={()=> {}} ref={galleryRef}></button>
					<button className={ videoStyles.recordBtn } onClick={()=> { record() }}></button>
					<button className={ videoStyles.deleteBtn } onClick={()=> { deleteRecorded() } }></button>
					
				</div>
			</div>
		)
	}
	return renderView();
}

export class MainView extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}
	playClip (url) {
		ReactDOM.render(
			(
				<PreviewPlayer clipUrl={ url }></PreviewPlayer>
			),
			document.getElementById('preview')
		)
	}
	render () {
		const videos = this.state.videos;
		let rendered;
		console.log(videos);
		if (videos) {
			rendered = videos.map((clip)=>{
				const url = `${global.domain}_api/video/clips/${clip.id}`;
				const sec = Math.round(Number(clip.duration));
				return (
					<li className={ menuStyles.gallery_clip } key={ uuidv4() }>
						<h2>{ sec } sec</h2>
						<video src={ url } onClick={ ()=>{ this.playClip(url) } }></video>
					</li>
					
				)
			});
		}
		return (
			<div>
				<div id="preview">
				</div>
				<ul className={ menuStyles.gallery_container }>
					{ rendered }
				</ul>
				<div className={ menuStyles.menu }>
					<button className={ menuStyles.gallery } onClick={()=>{this.gallery()}}></button>
					<button className={ menuStyles.creator } onClick={()=>{this.creator()}}></button>
					<button className={ menuStyles.user } onClick={()=>{this.user()}}></button>
				</div>
			</div>
		);
	}
	componentDidMount () {
		const gallery = this;
		fetch(`${global.domain}_api/video/clips/urls`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': localStorage.getItem('token')
			}
		}).then(res=>{
			if (res.status !== 200) {
				this.user();
			} else {
				return res.json()
			}
		})
		.then(json=>{
			// console.log(json);
			const state = gallery.state;
			state.videos = json;
			this.setState(state);
		});
	}	
	gallery () {

	}
	creator () {
		ReactDOM.render(
			(
				<VideoFrame></VideoFrame>
			),
			root
		);
	}
	user () {
		localStorage.removeItem('token');
		window.location.reload();
	}
}

function App() {
	const renderVideoCapture = () => {
		React.render(
			(
				<VideoFrame>
				</VideoFrame>
			),
			root
		)
	};
	if (localStorage.getItem('token')) {
		return (
			<MainView></MainView>
		  );
	} else {
		return (
			<Login></Login>
		);
	}
  
}

export default App;
