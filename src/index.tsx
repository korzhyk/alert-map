import { registerSW } from 'virtual:pwa-register'
import { render } from 'solid-js/web'
import { AlertsProvider } from './AlertsContext'
import App from './App'

render(
  () => (
    <AlertsProvider url={import.meta.env.VITE_WS_URI}>
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
