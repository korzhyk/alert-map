import { createSignal, createContext, useContext, onMount, onCleanup } from "solid-js"
import { createWebsocket } from './websocket'

const ConnectionContext = createContext()

export function useConnection() { return useContext(ConnectionContext) }

export function ConnectionProvider(props) {
  let websocket
  const pendingHandlers = []
  const [state, setState] = createSignal(-1)

  const connection = [
    state,
    {
      onMessage(callback) {
        if (websocket) {
          websocket.addEventListener('message', callback)
        } else {
          pendingHandlers.push(callback)
        }
      }
    }
  ]

  onMount(() => {
    websocket = createWebsocket(props.urlProvider, props.options)
    const updateState = () => setState(websocket.readyState)
    websocket.addEventListener('open', updateState)
    websocket.addEventListener('close', updateState)
    websocket.addEventListener('error', updateState)
    pendingHandlers.forEach(handler => websocket.addEventListener('message', handler))
    pendingHandlers.length = 0
  })

  onCleanup(() => {
    websocket?.close(1000, 'disconnect')
  })

  return (
    <ConnectionContext.Provider value={connection}>
      {props.children}
    </ConnectionContext.Provider>
  )
}
