# pull from node
FROM node:14.14.0-stretch

# set working directory
WORKDIR /usr/src/app


# Copy the resources to container
COPY web /usr/src/app/web
COPY web/entrypoint.sh /usr/src/app/entrypoint.sh

WORKDIR /usr/src/app/web/sol
RUN npm --version
RUN npm config ls
# RUN npm install @tensorflow/tfjs @tensorflow-models/body-pix react-webcam react react-scripts
RUN npm install react-scripts
# RUN npm update

WORKDIR /usr/src/app
# run the entrypoint
ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]


