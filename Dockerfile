FROM cloudflare/cloudflared:latest AS cf
FROM oven/bun:alpine AS base
WORKDIR /home/bun/app

FROM base AS install
WORKDIR /usr/src/app
COPY bun.lockb ./
COPY package.json ./
RUN bun install --frozen-lockfile --production

FROM base AS prerelease
WORKDIR /usr/src/app
COPY --from=install /usr/src/app/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun test
RUN bun build server/index.js --target=bun --outfile=compiled/server.js

FROM base AS release

COPY --from=prerelease /usr/src/app/compiled/server.js ./
COPY --from=prerelease /usr/src/app/package.json ./
COPY --from=cf /usr/local/bin/cloudflared /usr/local/bin/

ENV PORT 3000

USER bun
EXPOSE $PORT

CMD [ "bun", "--smol", "server.js" ]
