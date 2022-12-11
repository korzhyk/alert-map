FROM node:19-alpine AS dependencies

RUN apk add git libc6-compat
RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
RUN npm install pnpm@7 --location=global

COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml

ENV NODE_ENV=production
WORKDIR "/app"
RUN pnpm install

FROM dependencies AS builder

ENV NODE_ENV=build

COPY src /app/src
COPY index.html /app/index.html
COPY vite.config.js /app/vite.config.js

WORKDIR "/app"
RUN pnpm install
RUN pnpm run build

FROM dependencies AS runner

COPY --from=builder /app/dist /app/dist
COPY server /app/server

EXPOSE 5000

WORKDIR "/app"
CMD [ "sh", "-c", "pnpm start"]