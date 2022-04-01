FROM node:16-alpine

RUN apk add git libc6-compat
RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2

RUN mkdir -p /src/app
WORKDIR /src/app

COPY . /src/app
RUN ENV=production npm install

EXPOSE 5000
CMD [ "npm", "start" ]