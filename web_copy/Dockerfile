# pull from node
FROM node:14.11.0-stretch

# set working directory
WORKDIR /usr/src/app

# RUN npm install @tensorflow/tfjs @tensorflow-models/body-pix react-webcam

# Copy the resources to container
COPY web /usr/src/app/web
COPY web/entrypoint.sh /usr/src/app/entrypoint.sh

# run the entrypoint
ENTRYPOINT [ "/usr/src/app/entrypoint.sh" ]


