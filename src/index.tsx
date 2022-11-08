import '@unocss/reset/tailwind.css'
import { registerSW } from 'virtual:pwa-register'
import { render } from 'solid-js/web'
import { AlertsProvider } from './AlertsContext'
import App from './App'

let urlIdx = 0
const urls = import.meta.env.VITE_WS_URI.split(',')
const urlSelector = () => urls[urlIdx++ % urls.length]

render(
  () => (
    <AlertsProvider url={urlSelector}>
      <App />
    </AlertsProvider>
  ),
  document.getElementById('app')
)

registerSW({
  onRegistered(r) {
    r &&
      setInterval(() => {
        r.update()
      }, 6e5)
  }
})

function captureMap (selector = 'canvas.maplibregl-canvas') {
  document.querySelector(selector)?.toBlob((blob) => {
    navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])
  })
}

document.querySelectorAll('a[href="#capture-map"]').forEach(el => {
  el.addEventListener('click', (event) => {
    event.preventDefault()
    captureMap()
  })
})
