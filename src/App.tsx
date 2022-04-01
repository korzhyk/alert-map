import 'virtual:windi.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import debug from 'debug'
import { onMount, onCleanup, createSignal } from 'solid-js'
import mitt from 'mitt'
import alerts from './alerts'
import AlertsList from './AlertsList'
// @ts-ignore
import GeoDecodeWorker from './worker?worker'

interface Alert {
  id?: number,
  date?: number,
  message?: string,
  parsed?: string[][]
}

const log = debug('App')
const workerEvents = mitt()
let map, [ workerReady, readySignal ] = waitFor()

export default function App() {
  const [state, setState] = createSignal({})
  const [showState, setShowState] = createSignal([])

  let container
  onMount(() => {
    const worker = new GeoDecodeWorker()
    worker.addEventListener('message', ({ data }) => {
      if (typeof data == 'object' && !Array.isArray(data)) {
        for (const event in data) {
          workerEvents.emit(event, data[event])
        }
      } else { 
        workerEvents.emit('*', data)
      }
    })
    worker.postMessage('ready?')
    workerEvents.on('ready', readySignal)
    workerEvents.on('decoded', state => {
      map.getSource('alerts-poly').setData({
        type: 'FeatureCollection',
        features: state.map(([unit, start, feature]) => feature)
      })
      setShowState(state)
    })
    alerts.on('state', state => {
      setState(state)
      worker.postMessage({ decodeState: state })
    })
    alerts.on('alert', (alert: Alert) => {
      log('alert: %o', alert)
      if (!alert.parsed) {
        alert.parsed = parseMessage(alert.message)
      }
      const newState = state()
      const [ clear, alerts ] = alert.parsed
      if (clear.length && alerts.length) {
        newState[alerts[0]] = newState[clear[0]]
        delete newState[clear[0]]
      } else {
        alerts.forEach(u => (newState[u] = alert.date))
        clear.forEach(u => delete newState[u])
      }
      setState(newState)
      worker.postMessage({ decodeState: newState })
    })
    Promise.all([
      initMap(container),
      workerReady
    ]).then(() => {
      alerts.connect(import.meta.env.VITE_WS_URI)
    })
    const egg = document.querySelector('a[href*="https://www.comebackalive.in.ua"]')
    if (egg) {
      egg.addEventListener('touchstart', onPress, { once: true })
      egg.addEventListener('mousedown', onPress)
      egg.addEventListener('mouseup', onUp)
    }
    onCleanup(() => {
      if (egg) {
        egg.removeEventListener('mousedown', onPress)
        egg.removeEventListener('mouseup', onUp)
      }
      alerts.destroy()
      worker.terminate()
    })
  })
  return <div class="h-full">
    <div ref={container} class="h-full" />
    <AlertsList list={showState()} onEnter={onEnter} onLeave={onLeave} />
  </div>
}

function initMap (container) {
  return import('maplibre-gl').then(({ Map, LngLatBounds, LngLat }) => {
    return new Promise(resolve => {
      map = new Map({
        container,
        style: import.meta.env.VITE_STYLE_URI,
        bounds: new LngLatBounds(new LngLat(21, 44), new LngLat(41, 53)),
        fitBoundsOptions: {
          padding: 5
        },
        maxZoom: 9,
        minZoom: 3.5
      })
      map.on('load', () => {
        let firstSymbolId
        const layers = map.getStyle().layers
        for (let i = 0, l = layers.length; i < l; i++) {
          if (layers[i].type === 'symbol') {
          firstSymbolId = layers[i].id
          break
          }
        }
        map.addSource('alerts-poly', {
          generateId: true,
          type: 'geojson',
          data: null
        })
        map.addLayer({
          id: 'alerts-poly',
          type: 'fill',
          source: 'alerts-poly',
          paint: {
            'fill-color': '#F00',
            'fill-opacity': [
              'case', ['boolean', ['feature-state', 'hover'], false],
              .5, .3
            ]
          }
        }, firstSymbolId)
        map.on('mousemove', 'alerts-poly', (e) => {
          if (e.features.length > 0) {
            onEnter(e.features[0].id)
          }
        })
        map.on('mouseleave', 'alerts-poly', onLeave)
        resolve(map)
      })
    })
  })
}

/*
 * Map interaction handlers
 */

 let hoveredStateId = null

 function onClick (id) {
 
 }
 
 function onEnter (id) {
  if (hoveredStateId != null) {
    map.setFeatureState({ source: 'alerts-poly', id: hoveredStateId }, { hover: false })
  }
  hoveredStateId = id
  map.setFeatureState({ source: 'alerts-poly', id }, { hover: true })
 }
 
 
 function onLeave () {
  if (hoveredStateId != null) {
    map.setFeatureState({ source: 'alerts-poly', id: hoveredStateId }, { hover: false })
  }
  hoveredStateId = null
 }
 
/*
 * Utils
 */

function waitFor () {
  let resolve
  const p = new Promise(r => {
    resolve = r
  })
  return [p, resolve]
}

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
    str = 'місто' + str.slice(str.indexOf(' '))
  }
  return str.trim()
}

/*
 * Easter egg
*/

let pressTimeout
let rocketSent

function onUp (e) {
  clearTimeout(pressTimeout)
}

function onPress (e) {
  e.preventDefault()
  if (rocketSent) return
  pressTimeout = setTimeout(() => {
    e.target.addEventListener('click', e => e.preventDefault(), { once: true })
    rocketSent = true
    const date = new Date()
    alerts.emitter.emit('alert', { date: Date.now()/1e3, message: `🔴 ${date.getHours()}:${date.getMinutes()} Повітряна тривога в Бєлгородська область` })
    const ctx = new AudioContext()
    fetch(`/audio.mp3`)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination);
      source.start()
    })
    setTimeout(() => {
      rocketSent = false
      alerts.emitter.emit('alert', { date: Date.now()/1e3, message: `🟢 ${date.getHours()}:${date.getMinutes()} Відбій тривоги в Бєлгородська область` })
    }, 6e4)
  }, 3e3)
}

