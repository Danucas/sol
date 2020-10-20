
from uuid import uuid4
import json

class User:
    def __init__(self, *args, **kwargs):
        """"""
        # print(kwargs)
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
        from api.v1.db import DB
        db = DB()
        db.add('users', self)
        db.save()
