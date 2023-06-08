import 'uno.css'
import '@unocss/reset/tailwind-compat.css'

import { Suspense, lazy } from 'solid-js'
import { AlertsProvider } from './Alerts'
import AlertsList from './AlertsList'
import { ConnectionProvider } from './Connection'

const Map = lazy(() => import('./Map'))

export default function App({ urlProvider }) {
  return (
    <ConnectionProvider urlProvider={urlProvider} options={{ minReconnectionDelay: 100 }}>
      <AlertsProvider>
        <AlertsList />
        <Suspense fallback={
          <h6 class="fw-bold text-size-2xl absolute inset-0 flex flex-items-center flex-justify-center">
            Мапа завантажується
            <span class="animate-bounce">.</span>
            <span class="animate-bounce animate-delay-100">.</span>
            <span class="animate-bounce animate-delay-200">.</span>
          </h6>}>
          <Map />
        </Suspense>
      </AlertsProvider>
    </ConnectionProvider>
  )
}

/*
 * Easter egg
 */
function triggerEgg(e) {
  const context = new AudioContext()
  fetch(`/audio.mp3`)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      const source = context.createBufferSource()
      source.buffer = audioBuffer
      source.connect(context.destination)
      source.start()
    })
}
