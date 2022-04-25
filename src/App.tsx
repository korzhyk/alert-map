import 'virtual:windi.css'
import debug from 'debug'
import { RpcProvider } from '@playcode/worker-rpc'
import { createMemo, createSignal, onCleanup } from 'solid-js'
import { unwrap } from 'solid-js/store'
import { Icon } from 'solid-heroicons'
import { user, users, userGroup } from 'solid-heroicons/outline'
import Alerts from './Alerts'
import { useAlerts } from './AlertsContext'
import Connection from './Connection'
import Map from './Map'
// @ts-ignore
import GeoDecodeWorker from './worker?worker'

const log = debug('App:Main')

export default function App() {
  const [store, { setDecoded, connect }] = useAlerts()
  const [map, setMap] = createSignal()
  const list = createMemo(() => store.decoded.length && store.decoded)

  const worker = new GeoDecodeWorker()
  const rpcProvider = new RpcProvider((message, transfer) => worker.postMessage(message, transfer))
  worker.onmessage = (e) => rpcProvider.dispatch(e.data)

  onCleanup(() => {
    worker.terminate()
  })

  const showFeatures = (add) => {
    return async (m) => {
      if (!m) return
      await rpcProvider.rpc('ready')
      const decoded = await rpcProvider.rpc('decode', {
        ...unwrap(store.state),
        ...add
      })
      const show = Object.keys(decoded).sort()
      setDecoded(show)
      m.getSource('alerts-poly')?.setData({
        type: 'FeatureCollection',
        features: show.map((unit) => decoded[unit])
      })
    }
  }

  const onLoad = (map) => {
    showFeatures()(map)
    setMap(map)
    const layers = map.getStyle().layers
    let symbolsLayerId
    for (let i = 0, l = layers.length; i < l; i++) {
      if (layers[i].type === 'symbol') {
        symbolsLayerId = layers[i].id
        break
      }
    }
    map.addSource('alerts-poly', {
      generateId: true,
      type: 'geojson',
      data: null
    })
    map.addLayer(
      {
        id: 'alerts-poly',
        type: 'fill',
        source: 'alerts-poly',
        paint: {
          'fill-color': '#F00',
          'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0.3]
        }
      },
      symbolsLayerId
    )
    map.on('mousemove', 'alerts-poly', (e) => onEnter.call(map, e.features[0]?.id))
    map.on('mouseleave', 'alerts-poly', onLeave.bind(map))
  }

  const cb = (yes) => showFeatures(yes ? { 'Бєлгородська область': yes } : null)(map())

  const egg = document.querySelector('a[href*="https://www.comebackalive.in.ua"]')
  if (egg) {
    egg.addEventListener('touchstart', (e) => triggerEgg(e, cb), {
      passive: true,
      once: true
    })
    egg.addEventListener('mousedown', (e) => triggerEgg(e, cb))
    egg.addEventListener('mouseup', clearEgg)
  }

  return (
    <>
      <Connection state={store.readyState} connect={connect}>
        <Alerts onEnter={onEnter.bind(map())} onLeave={onLeave.bind(map())} list={list()}>
          <div
            class="z-1 blur-box ml-4 mb-4 py-2 px-4 flex items-center font-light"
            title="Кількість користувачів котрі переглядають мапу"
          >
            <Icon
              path={store.online == 1 ? user : store.online == 2 ? users : userGroup}
              class="icon mr-1.5 text-blue-600 dark:text-blue-400"
            />
            {store.online}
          </div>
        </Alerts>
      </Connection>
      <Map onLoad={onLoad} showFeatures={showFeatures(store.state)} />
    </>
  )
}

/*
 * Map interaction handlers
 */

let hoveredStateId = null

function onEnter(id) {
  if (typeof id === 'undefined') return log('[onEnter] invalid feature id: %s', id)
  if (hoveredStateId != null) {
    this.setFeatureState({ source: 'alerts-poly', id: hoveredStateId }, { hover: false })
  }
  hoveredStateId = id
  this.setFeatureState({ source: 'alerts-poly', id }, { hover: true })
}

function onLeave() {
  if (hoveredStateId != null) {
    this.setFeatureState({ source: 'alerts-poly', id: hoveredStateId }, { hover: false })
  }
  hoveredStateId = null
}

/*
 * Easter egg
 */

let pressTimeout
let rocketSent

function clearEgg(e) {
  clearTimeout(pressTimeout)
}

function triggerEgg(e, callback) {
  e.preventDefault()
  if (rocketSent) return
  pressTimeout = setTimeout(() => {
    e.target.addEventListener('click', (e) => e.preventDefault(), {
      once: true
    })
    rocketSent = true
    const ctx = new AudioContext()
    fetch(`/audio.mp3`)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(ctx.destination)
        source.start()
      })
    callback(rocketSent)
    setTimeout(() => {
      rocketSent = false
      callback(rocketSent)
    }, 6e4)
  }, 3e3)
}
