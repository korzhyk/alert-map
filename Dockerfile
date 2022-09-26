FROM node:18-alpine AS pnpm

RUN apk add git libc6-compat
RUN ln -s /lib/libc.musl-x86_64.so.1 /lib/ld-linux-x86-64.so.2
RUN npm install pnpm@7 --location=global

FROM pnpm AS builder

WORKDIR "/app"
COPY . .

RUN pnpm install -P

FROM pnpm AS production

ENV NODE_ENV=production

WORKDIR "/app"
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000

CMD [ "sh", "-c", "pnpm start"]