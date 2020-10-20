from api.v1.db.user import User
from api.v1.db.clip import Clip
import json

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

    def remove(self, obj):
        print('remove', obj.tablename)
        del self.session[obj.tablename][obj.id]
        self.save()
        self.reload()

    def save(self):
        print(self.session)
        with open(self.db_path, 'w') as dbfile:
            dbfile.write(json.dumps(self.session))

    def add(self, table, obj):
        self.session[obj.tablename][obj.id] = obj.to_dict()
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
