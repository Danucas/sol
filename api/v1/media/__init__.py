#!/usr/bin/python3
from flask import Blueprint

app_video = Blueprint(
    'video_app',
    __name__,
    url_prefix='/video',
)
from api.v1.media.video import *