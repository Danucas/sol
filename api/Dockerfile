# pull base image
FROM python:3.8.1-slim-buster

# set work dir

WORKDIR /usr/src/app

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1

# install network & python dependencies
RUN apt-get update && apt-get install -y software-properties-common\
	wget \
	netcat \
	apt-utils curl \
	ffmpeg libgl1-mesa-glx\
	python3 python3-pip python3-setuptools

# # install obdc dependencies
# RUN apt-get install -y unixodbc-dev g++
RUN pip3 install --upgrade pip
COPY ./api/requirements.txt /usr/src/app/requirements.txt
RUN python3 -m pip install -r requirements.txt

# copy the flask services and data models
COPY api /usr/src/app/api

# run entrypoint
ENTRYPOINT ["/usr/src/app/api/entrypoint.sh"]