FROM node:4.4.3-slim

COPY package.json /src/
WORKDIR /src/
RUN npm install

ADD . /src/

ENTRYPOINT node /src/script.js
