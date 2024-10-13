import { env } from 'process'
import { consola } from 'consola'
import redis from './redis'
import { Logger, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl'
import { sleep } from 'telegram/Helpers'
import { parseMessage } from './utils'

class DebugLogger extends Logger {
  log(...args) { consola.info(...args) }
}

const sessionKey = `sess:${env.FLY_APP_NAME}:${env.FLY_REGION}`
const session = await redis.get(sessionKey) || ''

const channelUsername = 'air_alert_ua'
const stringSession = new StringSession(session)
const tgClient = new TelegramClient(stringSession,
  +env.API_ID,
  env.API_HASH,
  { connectionRetries: 5, baseLogger: new DebugLogger }
)

await tgClient.start({ botAuthToken: env.BOT_HASH })

consola.info('You have successfully logged in!')

await redis.set(sessionKey, stringSession.save())

async function getUpdates() {
  consola.info('Waiting for new messages…')

  const channel = await tgClient.getEntity(channelUsername)
  let pts = 0
  const limit = 100

  try {
    const fullChannel = await tgClient.invoke(
      new Api.channels.GetFullChannel({
        channel,
      }),
    )
    pts = fullChannel.fullChat.pts
  }
  catch (error) {
    consola.info('Error getting initial value of pts:', error)
    return
  }

  while (true) {
    try {
      const updates = await tgClient.invoke(
        new Api.updates.GetChannelDifference({
          channel,
          filter: new Api.ChannelMessagesFilterEmpty(),
          pts,
          limit,
        }),
      )

      pts = updates.pts

      if (updates instanceof Api.updates.ChannelDifference) {
        for (const message of updates.newMessages) {
          const [clear, alerts] = parseMessage(message.message)
          consola.info('new notification', message.message)
          for (const ok of clear) {
            await redis.hdel('alerts', ok)
          }
          for (const alert of alerts) {
            await redis.hsetnx('alerts', alert, message.date)
          }
        }
        await getState()
        await broadcastState()
      }

      if (updates instanceof Api.updates.ChannelDifferenceEmpty) {
        await sleep((updates.timeout || 10) * 1000)
      }
    }
    catch (error) {
      consola.info('Error getting updates:', error)
      await sleep(5000)
    }
  }
}

let state = {}

async function getState() {
  state = await redis.hgetall('alerts')
  return state
}

const server = Bun.serve({
  port: env.PORT || 3000,
  async fetch(req): Promise<any> {
    const url = new URL(req.url)
    switch (url.pathname) {
      case '/ADB9004C-7C71-495F-8F3C-D69830B81597':
        const success = server.upgrade(req, { data: { channel: 'legacy' } })
        return success
          ? void 0
          : new Response('upgrade error', { status: 400 })
      case '/':
        return new Response(JSON.stringify({
          state
        }), {
          headers: {
            'content-type': 'application/json'
          }
        })
      default:
    }
    return new Response('not found', { status: 404 })
  },
  websocket: {
    maxPayloadLength: 64,
    idleTimeout: 60,
    message(ws, message) {
      consola.info('ws message', message)
    },
    async open(ws) {
      ws.subscribe(ws.data?.channel)
      ws.send(JSON.stringify({ state }))
    },
    close(ws) {
      ws.unsubscribe(ws.data?.channel)
    },
  },
})

async function broadcastState() {
  server.publish('legacy', JSON.stringify({
    state
  }))
}

getState()

getUpdates()

setInterval(broadcastState, 30000)

consola.info(`Listening on ${server.url}`)

let cf

if (Bun.env.TUNNEL_TOKEN) {
  try {
    cf = Bun.spawn(['cloudflared', 'tunnel', '--no-autoupdate', 'run', '--url', server.url])
  } catch (e) {
    consola.error('cloudflared', e)
  }
}

process.once('SIGTERM', () => {
  info('Server is stopping…')
  server.stop()
  cf?.kill()
})
