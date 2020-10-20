#!/usrbin/python3
"""
Auth Blueprint App
"""

from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from itsdangerous import URLSafeTimedSerializer


app_auth = Blueprint(
    'auth_app',
    __name__,
    url_prefix='/auth',
)

def confirm_token(token, expiration=3600):
    """
    Token confirmation utility
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

def token_required(f):
    """
    Wrapper
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        """
        Decorated
        """
        token = request.headers.get('authorization')
        if not token:
            return jsonify(error='Failed unauthorized'), 403
        else:
            email = confirm_token(token)
            if not email:
                return jsonify(error='Failed Unauthorized'), 401
            db = DB()
            user = db.filter_by('users', 'email', email)
            if user:
                request.user = user[0].id
            else:
                return jsonify(error='Failed Unauthorized'), 401
            return f(*args, **kwargs)
    return decorated


from api.v1.auth.auth import *