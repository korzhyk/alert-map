import { registerSW } from 'virtual:pwa-register'
import { render } from 'solid-js/web'
import debug from 'debug'
import App from './App'

const log = debug('bootstrap')

const urlProvider = (i => {
  const urls = import.meta.env.VITE_WS_URI.split(',')
  return () => urls[i++ % urls.length]
})(0)

render(() => <App urlProvider={urlProvider} />, document.getElementById('app') as HTMLElement)

registerSW({
  onRegistered(r) {
    log('ServiceWorker is registered', r)
    r &&
      setInterval(() => {
        log('ServiceWorker update…')
        r.update()
      }, 6e5)
  }
})

document.querySelectorAll('[href="#capture-map"]').forEach((button) => {
  button.addEventListener('click', captureMap)
})

function loadImage (src) {
  if (!src) return Promise.reject(src)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = src
    img.onload = () => resolve(img)
  })
}

async function captureMap(event) {
  event.preventDefault()
  
  const canvas = document.querySelector('[aria-label="Map"], canvas') as HTMLCanvasElement
  let { width, height } = canvas

  const [map, attribution] = await Promise.all([
    loadImage(canvas.toDataURL()),
    loadImage('/attribution.png')
  ])

  const blank = Object.assign(document.createElement("canvas"), { width, height })
  const context = blank.getContext('2d')

  width = attribution.width / 2
  height = attribution.height / 2

  context.drawImage(map, 0, 0)
  const [x, y] = [
    blank.width - width - 16,
    blank.height - height - 16
  ]
  context.drawImage(attribution, x, y, width, height)

  blank?.toBlob((blob) => {
    if (blob === null) return
    navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ])
  })
}
