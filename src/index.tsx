import { registerSW } from 'virtual:pwa-register'
import { render } from 'solid-js/web'
import App from './App'

render(() => <App />, document.getElementById('app'))

registerSW({
  onRegistered(r) {
    r && setInterval(() => {
      r.update()
    }, 6e5)
  }
})