require('dotenv').config()
const API = require('./api')
const debug = require('debug')
const uWS = require('uWebSockets.js')

const log = debug('server:listen')

const port = +process.env.PORT

let listenSocket
const ws = uWS
.App()
.ws('/ADB9004C-7C71-495F-8F3C-D69830B81597', {
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 32,
  idleTimeout: 60,
  open: ws => {
    ws.subscribe('broadcast')
    telegram.storage.client.HGETALL('alertHash').then(state => {
      ws.send(JSON.stringify({ state, online: ws.numSubscribers('broadcast') }))
    }).catch(log)
  }
})
.any('/*', res => {
  res.end('.')
}).listen(port, token => {
  listenSocket = token
  if (token) {
    log('ws server on', port)
  } else {
    log('failed to listen on port', port)
    process.exit()
  }
})

const wsPing = setInterval(() => {
  ws.publish('broadcast', JSON.stringify({ online: ws.numSubscribers('broadcast') }))
}, 3e4)

const telegram = new API(process.env.API_ID, process.env.API_HASH)

let watchChannelId

telegram
  .call('contacts.resolveUsername', {
    username: 'air_alert_ua'
  })
  .then(result => {
    const { title, username, id } = result.chats.find(chat => chat.id === result.peer.channel_id)
    log('resolved peer: %o', { title, username, id })
    watchChannelId = id
  })

telegram.mtproto.updates.on('updates', updateInfo => {
  updateInfo.updates
    .filter(
      ({ _, message }) =>
        _ === 'updateNewChannelMessage' && message.peer_id.channel_id === watchChannelId
    )
    .forEach(({ message: { id, date, message } }) => {
      let parsed
      try {
        parsed = parseMessage(message)
        const [ clear, alerts ] = parsed
        if (clear.length && alerts.length) {
          telegram.storage.client.HGET('alertHash', clear[0]).then(value => {
            telegram.storage.client.HSET('alertHash', alerts[0], value || date)
          })
        } else {
          telegram.storage.client.HDEL('alertHash', ...clear)
          alerts.forEach(unit => telegram.storage.client.HSETNX('alertHash', unit, date))
        }
      } catch (e) {
        log('error: %s', e.message)
      }
      log('received update: %o', { id, date, message, parsed })
      ws.publish('broadcast', JSON.stringify({ alert: { id, date, message, parsed } }))
    })
})

process.on('SIGINT', async () => {
  clearInterval(wsPing)
  ws.us_listen_socket_close(listenSocket)
  await telegram.storage.client.quit()
  process.exit(0)
})

const mainRx = /тривог[аи] в (.+)/
const stillRx = /^- (.+)/gm
const clearRx = /(🟢|відбій)/i
const pendingRx = /(🟡|триває)/i
const airalertRx = /(🔴|повітряна)/i

function parseMessage(message) {
  const type = pendingRx.test(message)
  ? 'pending' : airalertRx.test(message)
  ? 'alert' : clearRx.test(message)
  ? 'clear' : 'unknown'
  const except = []
  const main = []

  let m = mainRx.exec(message)

  if (m) {
    main.push(replaceDots(m[1]))
  }

  switch (type) {
    case 'alert':
      return [except, main]
    case 'pending':
      while ((m = stillRx.exec(message))) {
        except.push(replaceDots(m[1]))
      }
    case 'clear':
      return [main, except]
    default:
      return [[], []]
  }
}

function replaceDots (str) {
  str = str.replaceAll('.', '')
  if (str.indexOf('м') == 0) {
    str = 'місто ' + str.slice(str.indexOf(' '))
  }
  return str.trim()
}