# About

🚨 [Map](https://air-alert.pp.ua/) of Air Alert in Ukraine 🇺🇦
This service uses official data from [telegram channel](https://t.me/air_alert_ua).

[![Map preview](https://i.imgur.com/1NhH4LP.png)](https://air-alert.pp.ua/)

# Dependencies

- Telegram application ([Telegram Apps](https://my.telegram.org/apps)) for API keys
- Redis server

# Prerequirements

Create a `.env` file with your ENV variables, see `.env.example`

# Front-end

[SolidJS](https://www.solidjs.com/) + WebSockets
For automated deployments I use auto builds of Cloudflare Pages or you can run locally:

```bash
pnpm install && pnpm build && pnpm serve
```

# Back-end

[@mtproto/core](https://mtproto-core.js.org/) official telegram proto library + [μWebSockets](https://github.com/uNetworking/uWebSockets.js) fast and light websocket/http(s) server

> For first run of back-end you need to complete authentication of you telegram app. Make sure you are running only one instance of back-end.

```
pnpm start
```

### Docker image

```
docker run --name alert-map-ws-server \
  -p 5000:5000/tcp \
  -e REDIS_URI=redis://localhost \
  -e API_ID=11111111 \
  -e API_HASH=22222222222222222222222222222222 \
  -d korzhyk/alert-map:latest
```
