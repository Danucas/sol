#!/usr/bin/python3
"""
.PNG correcter
"""
from PIL import Image
import os
import math

def list_to_image(data, name, path, dimensions):
    array = [(
        data[i],
        data[i + 1],
        data[i + 2],
        data[i + 3]
    ) for i in range(0, len(data), 4)]
    im = Image.new('RGBA', (dimensions[0], dimensions[1]))
    im.putdata(array)
    if path == '':
        path = os.path.abspath(os.getcwd())
    filename = '{}{}'.format(
        path,
        name
    )
    print('Saving:', filename)
    im.save(filename)