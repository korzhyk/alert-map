import debug from 'debug'
import ReconnectingWebSocket from 'reconnecting-websocket'

const log = debug('App:WebSocket')

export function createWebsocket(setStore) {
  let ws, pingTimeout
  const updateState = () => setStore('readyState', ws.readyState)
  const connect = (url) => {
    if (ws && ws.readyState === WebSocket.OPEN) return ws
    ws = new ReconnectingWebSocket(url)
    ws.addEventListener('open', updateState)
    ws.addEventListener('close', updateState)
    ws.addEventListener('error', updateState)
    ws.addEventListener('message', ({ data }) => {
      clearTimeout(pingTimeout)
      pingTimeout = setTimeout(() => ws.send('ping'), 6e4)
      if (data === 'pong') return
      try {
        const json = JSON.parse(data)
        if (typeof json === 'object' && !Array.isArray(json)) {
          setStore(json)
        } else log(`Got some unpredicted data: %s`, data)
      } catch (e) {
        log('[message] failed to parse message: %s', e.message)
      }
    })
    return ws
  }
  const call = (command) => {
    if (ws) {
      ws.send(command)
    } else console.warn('No active websocket connection')
  }
  const destroy = (reason) => {
    if (ws) {
      ws.close(1000, reason)
    }
  }
  return { call, destroy, connect }
}
