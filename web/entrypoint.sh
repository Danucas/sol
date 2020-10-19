#!/bin/sh
# echo 'npm container ready'
ls -la /usr/src/app
ls -la /usr/src/app/web
ls -la /usr/src/app/web/sol
exec "$@"