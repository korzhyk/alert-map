import debug from 'debug'
import { createSignal, createEffect, createContext, useContext, onMount, onCleanup } from 'solid-js'
import { useConnection } from './Connection'
// @ts-ignore
import GeoDecodeWorker from './worker?worker'

const log = debug('app')
const AlertsContext = createContext()
export const useAlerts = () => useContext(AlertsContext)

export function AlertsProvider(props) {
  let worker
  const [_, { onMessage }] = useConnection()
  const [state, setState] = createSignal()
  const [geoJSON, setGeoJSON] = createSignal()
  const [selected, setSelected] = createSignal()

  onMessage((event) => {
    try {
      const json = JSON.parse(event.data)
      if (json.state) {
        const stateMap = new Map()
        for (const [unit, ts] of Object.entries(json.state)) {
          stateMap.set(unit, {
            id: null,
            timestamp: +ts
          })
        }
        return setState(stateMap)
      }
    } catch (e) {
      log('error during JSON parse', event.data)
    }
  })

  onMount(() => {
    worker = new GeoDecodeWorker()
    worker.onmessage = (event) => {
      switch (event.data.type) {
        case 'decode':
          const features = []
          event.data.payload.forEach(([unit, geoJSON]) => {
            if (state().has(unit)) {
              state().get(unit).id = geoJSON.id
            }
            features.push(geoJSON)
          })
          setGeoJSON({
            type: 'FeatureCollection',
            features
          })
          break;
        default:
          log('no handler for action', event.data)
      }
    }
  })

  createEffect(() => {
    worker.postMessage({
      type: 'decode',
      payload: state()
    })
  })

  onCleanup(() => {
    worker?.terminate()
  })

  return (
    <AlertsContext.Provider value={[state, geoJSON, { selected, setSelected }]}>
      {props.children}
    </AlertsContext.Provider>
  )
}
