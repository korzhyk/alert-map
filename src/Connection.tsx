import alerts from './alerts'
import { Show } from 'solid-js'
 
export default function Connection (props) {
  return <Show when={alerts.ready() !== WebSocket.OPEN} fallback={props.children}>
    <div class="ml-4 mb-4 flex items-center bg-white/45 font-light backdrop-filter backdrop-blur py-2 px-4 rounded-full shadow-xl">
      { alerts.ready() === WebSocket.CLOSED
        ? <>
          <svg class="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
          Відсутнє з’єднання з сервером
        </>
        : <>
          <svg class="w-6 h-6 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        Спроба під’єднання…
        </>
      }
    </div>
  </Show>
}