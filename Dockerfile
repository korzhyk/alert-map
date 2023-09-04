FROM node:18-alpine AS production

RUN apk add git libc6-compat
RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
RUN npm install pnpm@8 --location=global

COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml

ENV NODE_ENV=production
WORKDIR "/app"
RUN pnpm install --frozen-lockfile

FROM production AS builder

ENV NODE_ENV=build

COPY src /app/src
COPY index.html /app/index.html
COPY vite.config.js /app/vite.config.js

WORKDIR "/app"
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM production AS app

COPY --from=builder /app/dist /app/dist
COPY server /app/server

EXPOSE 5000

WORKDIR "/app"
CMD [ "sh", "-c", "pnpm start"]
