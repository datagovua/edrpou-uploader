FROM node:4.4.3-slim

COPY package.json /src/
WORKDIR /src/
RUN npm install

ADD . /src/

CMD node /src/script.js
