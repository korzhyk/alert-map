import { createContext, onCleanup, onMount, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'
import { createWebsocket } from './websocket'

const defaultState = {
  state: {},
  decoded: [],
  online: 0,
  readyState: WebSocket.CLOSED
}

export const AlertsContext = createContext([defaultState])

export const useAlerts = () => useContext(AlertsContext)

export const AlertsProvider = (props) => {
  let ws
  const [store, setStore] = createStore({ ...defaultState })
  const { connect, destroy } = createWebsocket(setStore)
  const setDecoded = (decoded) => setStore('decoded', decoded)
  const add = (region, date) => setStore('state', region, date)
  const c = () => ws.reconnect()

  onMount(() => {
    ws = connect(props.url)
    onCleanup(() => destroy('cleanUp'))
  })

  return (
    <AlertsContext.Provider value={[store, { add, setDecoded, connect: c }]}>
      {props.children}
    </AlertsContext.Provider>
  )
}
