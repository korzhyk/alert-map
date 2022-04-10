import { onMount, createSignal, createEffect } from 'solid-js'

export default function Map(props) {
  let container,
    map,
    loaded = false
  const [progress, setProgress] = createSignal('Мапа завантажується…')

  createEffect(() => {
    props.showFeatures?.(map)
  })

  onMount(async () => {
    loaded = await Promise.resolve()
      .then(() => {
        setProgress('Завантаження стилів…')
        return import('maplibre-gl/dist/maplibre-gl.css')
      })
      .then(() => {
        setProgress('Завантаження бібліотеки MapLibreGL…')
        return import('maplibre-gl')
      })
      .then(({ Map, LngLatBounds, LngLat }) => {
        setProgress('Ініціалізація мапи…')
        map = new Map({
          container,
          style: import.meta.env.VITE_STYLE_URI,
          bounds: new LngLatBounds(new LngLat(21, 44), new LngLat(41, 53)),
          fitBoundsOptions: {
            padding: 5
          },
          maxZoom: 6,
          minZoom: 3.5
        })
        return new Promise((resolve) => {
          setProgress('Завантаження стилів шарів…')
          map.on('load', resolve)
        })
      })
      .then(() => {
        setProgress('Мапу завантажено.')
        props.onLoad?.(map)
        return true
      })
  })

  return (
    <div ref={container} class="h-full bg-[rgba(252, 247, 229, 1)]">
      <div
        class="m-auto opacity-50 text-size-xl font-bold"
        classList={{
          hidden: loaded
        }}
      >
        {progress()}
      </div>
    </div>
  )
}
