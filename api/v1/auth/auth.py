#!/usr/bin/python3

from itsdangerous import URLSafeTimedSerializer
from api.v1.auth import app_auth
from api.v1.db.user import User
from api.v1.db import DB
from flask import request, current_app, jsonify, render_template, redirect
from datetime import datetime
import json
from uuid import uuid4


def generate_token(email):
    """
    Generate token
    """
    serializer = URLSafeTimedSerializer(
        current_app.config['SECRET_KEY']
    )
    return serializer.dumps(
        email, salt=current_app.config['SECURITY_PASSWORD_SALT']
    )

def confirm_token(token, expiration=3600):
    """
    Verify the token
    """
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        email = serializer.loads(
            token,
            salt=current_app.config['SECURITY_PASSWORD_SALT'],
            max_age=expiration
        )
    except:
        return False
    return email


@app_auth.route('/register',
                methods=['POST'],
                strict_slashes=False)
def register():
    """
    register a new user
    """
    db = DB()
    data = request.get_json()
    email = data['email']
    existing_user = db.filter_by('users', 'email', email)
    if existing_user:
        existing_user = existing_user[0]
        return jsonify(message="Can't create this user"), 309
    password = data['password']
    user = User()
    user.email = email
    user.password = password
    user.save()
    token = generate_token(email)
    return jsonify(token=token, id=user.id)

@app_auth.route('/login',
                methods=['POST'],
                strict_slashes=False)
def login():
    data = request.get_json()
    email = data['email']
    passwd = data['password']
    db = DB()
    user = db.filter_by('users', 'email', email)
    # print('user login', user, email, passwd)
    if user and passwd == user[0].password:
        token = generate_token(user[0].email)
        return jsonify(token=token)
    else:
        return jsonify(error='Unauthorized'), 401
