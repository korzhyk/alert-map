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
  const [state, geoJSON, { selected }] = useAlerts()
  const [featureState, setFeatureState] = createSignal()
  const [viewport, setViewport] = createSignal({
    center: [0, 0],
    zoom: 0,
  } as Viewport)

  let lastHiglihtedId
  createEffect(() => {
    switch (selected()) {
      case null:
      case false:
      case undefined:
        setFeatureState({
          id: lastHiglihtedId,
          state: { hover: false }
        })
        break;
      default:
        setFeatureState({
          id: (lastHiglihtedId = selected()),
          state: { hover: true }
        })
    }
  })

  return (
    <MapGL
      class="h-full bg-[rgba(252, 247, 229, 1)] filter @dark:invert @dark:hue-rotate-180"
      mapLib={maplib}
      options={{
        attributionControl: false,
        bounds: bboxDefault,
        fitBoundsOptions: bboxOptions,
        style: import.meta.env.VITE_STYLE_URI,
        preserveDrawingBuffer: true
      }}
      viewport={viewport()}
      onViewportChange={setViewport}
      onMoveEnd={onMoveEnd}
    >
      <Control type="attribution" options={{ compact: true }} />
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
          featureState={featureState()}
        />
      </Source>
      <CustomControls />
    </MapGL>
  )
}

function CustomControls({ setFeatureState }) {
  const [map] = useMap()
  const [state, geoJSON, { setSelected }] = useAlerts()

  const mapSnap = (event) => {
    if (event.keyCode === 83 && event.shiftKey && event.ctrlKey) {
      ~(localStorage.disableSnap = ~+localStorage.disableSnap) && fitBounds(map())
    }
  }

  createEffect(() => {
    map().on('mousemove', 'alerts', (event) => setSelected(event.features[0].id))
    map().on('mouseleave', 'alerts', () => setSelected())
  })

  onMount(() => {
    document.addEventListener('keydown', mapSnap)
  })

  onCleanup(() => {
    document.removeEventListener('keydown', mapSnap)
  })

  return null
}
