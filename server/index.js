require('dotenv').config()
const debug = require('debug')
const uWS = require('uWebSockets.js')
const Limiter = require('async-limiter')
const { API, handleUpdatesFactory } = require('./api')
const { parseMessage } = require('./utils')

const log = debug('server:listen')
const port = +process.env.PORT
const ALERTS_HASH = 'alertHash'

let listenSocket
const ws = uWS
  .App()
  .ws('/ADB9004C-7C71-495F-8F3C-D69830B81597', {
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 32,
    idleTimeout: 60,
    open: (socket) => {
      socket.subscribe('broadcast')
      redis
        .HGETALL(ALERTS_HASH)
        .then((state) => {
          socket.send(JSON.stringify({ state, online: ws.numSubscribers('broadcast') }))
        })
        .catch((e) => {
          log('redis error %s', e.message, e.code)
        })
    },
    message: (socket) => socket.send('pong')
  })
  .any('/*', (res) => res.end('🚨'))
  .listen(port, (token) => {
    listenSocket = token
    if (token) {
      log('WebSocket server running on: %i', port)
    } else {
      log('WebSocket server failed to listen on port: %i', port)
      process.exit()
    }
  })

const broadcast = (data) => {
  return ws.publish(
    'broadcast',
    JSON.stringify({ ...data, online: ws.numSubscribers('broadcast') })
  )
}

const wsPing = setInterval(broadcast, 6e4)
const telegram = new API(process.env.API_ID, process.env.API_HASH)
const redis = telegram.storage.client

const telegramHealthCheck = setInterval(() => {
  telegram.getUser().then((user) => user || log('failed to get user'))
}, 6e4)

const queue = new Limiter({ concurrency: 1 })

handleUpdatesFactory(
  { client: telegram, onUpdate: onUpdate.bind(queue) },
  { channel: 'air_alert_ua' }
)

function onUpdate(updates) {
  this.push(async (done) => {
    log('updates count: %i', updates.length)
    for (const update of updates) {
      const alert = ['id', 'date', 'message'].reduce(
        (acc, prop) => ((acc[prop] = update.message[prop]), acc),
        {}
      )
      log('update: %o', alert)
      broadcast({ alert })
      try {
        const [clear, alerts] = parseMessage(alert.message)
        let transition
        if (clear.length && alerts.length) {
          transition = await redis.HGET(ALERTS_HASH, clear[0])
        }
        await Promise.all(
          alerts
            .map((unit) => redis.HSETNX(ALERTS_HASH, unit, transition || alert.date))
            .concat(redis.HDEL(ALERTS_HASH, ...clear))
        )
      } catch (e) {
        log(e.message)
      }
    }
    done()
  })
  this.onDoneCbs.length ||
    this.onDone(() => {
      redis
        .HGETALL(ALERTS_HASH)
        .then((state) => broadcast({ state }))
        .catch(log)
    })
}

process.on('SIGINT', async () => {
  clearInterval(wsPing)
  clearInterval(telegramHealthCheck)
  uWS.us_listen_socket_close(listenSocket)
  await redis.quit()
  process.exit(0)
})
