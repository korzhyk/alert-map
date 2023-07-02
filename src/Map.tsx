import { createSignal, createEffect, onMount, onCleanup } from 'solid-js'
import MapGL, { Viewport, Control, Layer, Source, useMap } from 'solid-map-gl'
import { supported } from '@mapbox/mapbox-gl-supported'
import * as maplibre from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAlerts } from './Alerts'

// TODO: https://github.com/GIShub4/solid-map-gl/issues/66
const maplib = { ...maplibre, supported }
const bboxDefault = new maplib.LngLatBounds([22.12, 44.00], [40.17, 52.37]) // Ukraine ❤️
const bboxOptions = { padding: 20 }

function fitBounds(map) {
  if (!bboxDefault.contains(map?.getCenter())) {
    map?.fitBounds(bboxDefault, bboxOptions)
  }
}

function onMoveEnd(event: DragEvent) {
  if (event.target.isMoving() || +localStorage.disableSnap || !event.originalEvent) return
  fitBounds(event.target)
}

export default function Map() {
  const [state, geoJSON, { selected, setSelected }] = useAlerts()
  const [featureState, setFeatureState] = createSignal()
  const [viewport, setViewport] = createSignal({
    center: [0, 0],
    zoom: 0,
  } as Viewport)

  createEffect(() => {
    setFeatureState({
      id: selected(),
      state: { hover: true }
    })
  })

  return (
    <MapGL
      class="h-full bg-[rgba(252, 247, 229, 1)] filter @dark:invert @dark:hue-rotate-180"
      mapLib={maplib}
      options={{
        customAttribution: [
          'сповіщення <a target="_blank" href="https://t.me/air_alert_ua">Повітряна Тривога</a>'
        ],
        bounds: bboxDefault,
        fitBoundsOptions: bboxOptions,
        style: import.meta.env.VITE_STYLE_URI,
        preserveDrawingBuffer: true
      }}
      viewport={viewport()}
      onViewportChange={setViewport}
      onMoveEnd={onMoveEnd}
    >
      <Source source={{
        type: 'geojson',
        data: geoJSON()
      }}>
        <Layer
          beforeType='symbol'
          id='alerts'
          style={{
            type: 'fill',
            paint: {
              'fill-color': '#F00',
              'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.5, 0.3]
            },
          }}
          onMouseEnter={event => setSelected(event.features[0].id)}
          onMouseLeave={event => setSelected(-1)}
          featureState={featureState()}
        />
      </Source>
      <CustomControls />
    </MapGL>
  )
}

function CustomControls() {
  const [map] = useMap()

  const mapSnap = (event) => {
    // [Shift] + [S] – toggle snapping
    if (event.keyCode === 83 && event.shiftKey) { 
      ~(localStorage.disableSnap = ~+localStorage.disableSnap) && fitBounds(map())
    }
  }

  onMount(() => {
    document.addEventListener('keydown', mapSnap)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', mapSnap)
  })

  return null
}
