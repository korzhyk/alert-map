import { registerSW } from 'virtual:pwa-register'
import { render } from 'solid-js/web'
import App from './App'

render(() => <App />, document.getElementById('app'))
registerSW()