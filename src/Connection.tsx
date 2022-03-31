import alerts from './alerts'
import { Show } from 'solid-js'
 
export default function Connection (props) {
  return <Show when={alerts.ready() !== WebSocket.OPEN} fallback={props.children}>
    <div class="mb-4 flex items-center bg-white/45 font-light backdrop-filter backdrop-blur py-2 px-4 rounded-full shadow-xl">
      <svg class="w-6 h-6 mr-1.5" classList={{ 'text-red-600': alerts.ready() === WebSocket.CLOSED, 'text-yellow-400': alerts.ready() === WebSocket.CONNECTING }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
      { alerts.ready() === WebSocket.CLOSED ? `Відсутнє з’єднання з сервером` : 'Під’єднання…' }
    </div>
  </Show>
}