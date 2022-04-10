require('dotenv').config()
const debug = require('debug')
const uWS = require('uWebSockets.js')
const { API, handleUpdatesFactory } = require('./api')
const { parseMessage } = require('./utils')

const log = debug('server:listen')
const port = +process.env.PORT

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
        .HGETALL('alertHash')
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

handleUpdatesFactory({ client: telegram, onUpdate }, { channel: 'air_alert_ua' })

async function onUpdate(updates) {
  log('new updates %i', updates.length)

  for (const update of updates) {
    const { id, date, message } = update.message
    let parsed
    try {
      const [clear, alerts] = (parsed = parseMessage(message))
      let transition
      if (clear.length && alerts.length) {
        transition = await redis.HGET('alertHash', clear[0])
      }
      await Promise.all(
        alerts
          .map((unit) => redis.HSETNX('alertHash', unit, transition || date))
          .concat(redis.HDEL('alertHash', ...clear))
      )
    } catch (e) {
      log(e.message)
    }
    broadcast({ alert: { id, date, message, parsed } })
  }
  redis
    .HGETALL('alertHash')
    .then((state) => broadcast({ state }))
    .catch(log)
}

process.on('SIGINT', async () => {
  clearInterval(wsPing)
  uWS.us_listen_socket_close(listenSocket)
  await redis.quit()
  process.exit(0)
})
