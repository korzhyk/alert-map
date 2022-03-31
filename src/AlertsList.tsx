import { createSignal, For, Show } from 'solid-js'
import Connection from './Connection'
import Duration from './Duration'

const andRx = /\s(?:та)\s/

export default function AlertsList (props) {
  const [show, setShow] = createSignal()
  const toggle = () => setShow(!show())
  
  return <div class="absolute bottom-0 left-4 max-h-screen">
    <Connection>
      <Show when={show()}>
        <div class="my-4 bg-white/65 backdrop-filter backdrop-blur p-2 rounded-xl shadow-xl text-sm flex-shrink min-w-sm overflow-auto h-full">
          <div class="py-1.5 mb-0.5 px-3 flex justify-between font-medium border-b-px border-b-1">
            <h3>Повітряна тривога</h3>
            <h6>Триває</h6>
          </div>
          <ul class="text-gray-600">
            <For each={props.list}>
              {([unit, start], i) => <li class="flex justify-between py-2 px-3 hover:bg-black/5 rounded-xl cursor-pointer transition-colors hover:text-gray-900" onMouseEnter={ () => props.onEnter(i()) } onMouseLeave={ () => props.onLeave() }>
                <span class>{ unit.split(andRx)[0] }</span>
                <span class="ml-8"><Duration start={start * 1e3} /></span>
              </li>}
            </For>
          </ul>
        </div>
      </Show>
      <Show when={props.list.length} fallback={
      <div class="mb-4 flex items-center bg-white/45 opacity-90 font-light backdrop-filter backdrop-blur py-2 px-4 rounded-full shadow-xl">
        <svg class="w-6 h-6 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Повітряна тривога відсутня
      </div>
    }>
        <button class="mb-4 relative flex items-center bg-white/65 text-opacity-90 font-light backdrop-filter backdrop-blur py-2 px-4 rounded-full shadow-xl active:top-px" onClick={toggle}>
          { !show() ? <>
          <svg class="w-6 h-6 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
          Показати списком {props.list.length ? `(${props.list.length})` : null}
          </>
          : <>
          <svg class="w-6 h-6 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          Сховати
          </> }
          </button>
        </Show>
    </Connection>
  </div>
}