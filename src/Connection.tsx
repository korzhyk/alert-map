import {
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js'

import Sockette from 'sockette'

const ConnectionContext = createContext()

export function useConnection() {
  return useContext(ConnectionContext)
}

export function ConnectionProvider(props) {
  let ws

  const handlers = []
  const [state, setState] = createSignal(-1)

  const connection = [
    state,
    {
      onMessage(callback) {
        handlers.push(callback)
        return () => handlers.splice(handlers.indexOf(callback) >>> 0)
      },
    },
  ]

  const connect = () => {
    const url = props.urlProvider()

    ws = new Sockette(url, {
      onopen: () => setState(WebSocket.OPEN),
      onmessage: e => handlers.forEach(handler => handler(e)),
      onreconnect: () => setState(WebSocket.CONNECTING),
      onmaximum: () => setState(4),
      onclose: () => setState(WebSocket.CLOSED),
      onerror: () => setState(WebSocket.CLOSED),
    })
  }

  onMount(() => {
    connect()
  })

  onCleanup(() => {
    handlers.length = 0
    ws?.close()
  })

  return (
    <ConnectionContext.Provider value={connection}>
      {props.children}
    </ConnectionContext.Provider>
  )
}
