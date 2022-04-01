import mitt from 'mitt'
import debug from 'debug'
import { createSignal, createRoot } from "solid-js"

const log = debug('App:alerts')

let reconnectTimeout
let reconnectCount = 0

function createConnection ({ url, setReady, emit, reconnect = null }) {
  const s = new WebSocket(url)
  setReady(s.readyState)

  s.onopen = () => {
    clearTimeout(reconnectTimeout)
    reconnectCount = 0
    log('[open]', s)
    setReady(s.readyState)
    s.onmessage = ({ data }) => {
      try {
        const json = JSON.parse(data)
        if (typeof json === 'object' && !Array.isArray(json)) {
          for (const event in json) {
            emit(event, json[event])
          }
        } else emit('message', json)
      } catch (e) {
        log('[message] failed to parse message', e)
        emit('data', data)
      }
    }
  }

  s.onclose = event => {
    setReady(s.readyState)
    if (event.wasClean) {
      log(`[close] connection closed cleanly, code=${event.code} reason=${event.reason}`)
    } else {
      log('[close] connection died')
    }
    if (reconnect instanceof Function) {
      log('[reconnect] after %i seconds', reconnectCount++)
      reconnectTimeout = setTimeout(() => {
        reconnect(url)
      }, reconnectCount * 1000)
    }
  }

  return s
}

function createWebsocket () {
  let websocket
  const emitter = mitt()
  const [ready, setReady] = createSignal(WebSocket.CLOSED)
  const call = command => {
    if (websocket) {
      websocket.send(command)
    } else console.warn('No active websocket connection')
  }
  const connect = (url) => {
    if (!websocket) {
      reconnectFn(url)
    }
  }
  const reconnectFn = (url) => {
    websocket = createConnection({ url, setReady, emit: emitter.emit, reconnect: reconnectFn })
  }

  const destroy = () => {
    if (websocket) {
      websocket.onclose = null
      websocket.close()
      websocket = null
    }
    emitter.all.clear()
    clearTimeout(reconnectTimeout)
  }

  return { ready, call, destroy, connect, emitter, on: emitter.on }
}

export default createRoot(createWebsocket)