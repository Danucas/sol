#!/usr/bin/python3

from itsdangerous import URLSafeTimedSerializer
from api.v1.auth import app_auth
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
    existing_user = db.filter_by('users', 'email', email)[0]
    if existing_user:
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
    user = db.filter_by('users', 'email', email)[0]
    print('user login', user, email, passwd)
    if user and passwd == user.password:
        token = generate_token(user.email)
        return jsonify(token=token)
    else:
        return jsonify(error='Unauthorized'), 401


class Clip:
    def __init__(self, *args, **kwargs):
        """"""
        self.id = str(uuid4())
        self.tablename = 'clips'
        self.src = ''
        self.user_id = ''
        self.duration = ''
        if 'id' in kwargs.keys():
            self.id = kwargs['id']
        if 'src' in kwargs.keys():
            self.src = kwargs['src']
        if 'user_id' in kwargs.keys():
            self.user_id = kwargs['user_id']
        if 'duration' in kwargs.keys():
            self.duration = kwargs['duration']

    def to_dict(self):
        return {
            "tablename": self.tablename,
            "id": self.id,
            "src": self.src,
            "user_id": self.user_id,
            "duration": self.duration
        }

    def save(self):
        db = DB()
        db.add('clips', self.to_dict())
        db.save()

class User:
    def __init__(self, *args, **kwargs):
        """"""
        print(kwargs)
        self.tablename = 'users'
        self.id = str(uuid4())
        self.email = ''
        self.password = ''
        if 'id' in kwargs.keys():
            self.id = kwargs['id']
        if 'email' in kwargs.keys():
            self.email = kwargs['email']
        if 'password' in kwargs.keys():
            self.password = kwargs['password']

    def to_dict(self):
        return {
            "tablename": self.tablename,
            "id": self.id,
            "email": self.email,
            "password": self.password
        }

    def save(self):
        db = DB()
        db.add('users', self.to_dict())
        db.save()


class DB:
    def __init__(self, *args, **kwargs):
        self.db_path = './api/tmp_db/db.json'
        self.session = None
        self.reload()
        self.classes = {
            'users': User,
            'clips': Clip
        }

    def reload(self):
        with open(self.db_path, 'r') as dbfile:
            self.session = json.loads(dbfile.read())

    def save(self):
        print(self.session)
        with open(self.db_path, 'w') as dbfile:
            dbfile.write(json.dumps(self.session))

    def add(self, table, obj):
        self.session[obj['tablename']][obj['id']] = obj
        self.save()
        self.reload()

    def filter_by(self, table, attr, value):
        with open(self.db_path, 'r') as dbfile:
            db = json.loads(dbfile.read())
            self.session = db
        objs = []
        for key in db[table].keys():
            if attr in db[table][key] and db[table][key][attr] == value:
                obj = self.classes[table](**db[table][key])
                objs.append(obj)
        if len(objs) > 0:
            return objs
        else:
            return None
