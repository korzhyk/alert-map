import ReconnectingWebSocket from 'reconnecting-websocket'

export function createWebsocket(url, options) {
  return new ReconnectingWebSocket(url, [], options)
}
