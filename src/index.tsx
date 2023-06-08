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
