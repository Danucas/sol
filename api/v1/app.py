#!/usr/bin/python3
from flask import Flask, jsonify
from api.v1.media import app_video
from api.v1.auth import app_auth
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.register_blueprint(app_video)
app.register_blueprint(app_auth)
app.config['SECRET_KEY'] = 'Some_secret_key'
app.config['SECURITY_PASSWORD_SALT'] = 'some_password_security_salt'

@app.route('/',
            methods=['GET'],
            strict_slashes=False)
def index():
    """
    Index API endpoint
    """
    return jsonify(message="success")



if __name__ == '__main__':
    app.run('0.0.0.0', '3001')