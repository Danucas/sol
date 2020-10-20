from uuid import uuid4
import json

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
        from api.v1.db import DB
        db = DB()
        db.add('clips', self)
        db.save()
