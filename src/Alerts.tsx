import { createSignal, For, Show, createMemo } from 'solid-js'
import { Icon } from 'solid-heroicons'
import { informationCircle, viewList, xMark } from 'solid-heroicons/outline'
import Duration from './Duration'
import { useAlerts } from './AlertsContext'

const andRx = /\s(?:та)\s/
const andSplit = (str) => str.split(andRx)[0]

export default function Alerts(props) {
  const [show, setShow] = createSignal(false)
  const toggle = () => setShow(!show())

  const [store] = useAlerts()
  const list = createMemo(() => props.list || Object.keys(store.state))
  const hasList = createMemo(() => list().length)

  return (
    <div class="absolute bottom-0 left-0 flex flex-col max-h-screen max-w-screen lt-sm:w-full">
      <Show when={hasList() && show()}>
        <div class="z-1 blur-box m-4 p-2 flex flex-col min-w-xs rounded-xl text-sm overflow-y-auto">
          <div class="py-2 mb-2 px-3 flex justify-between font-medium border-b-px border-b-1 border-gray-500/30">
            <h3>Повітряна тривога</h3>
            <h6>Триває</h6>
          </div>
          <ul class="overflow-y-auto">
            <For each={list()}>
              {(unit, i) => (
                <li
                  class="flex justify-between py-2 px-3 hover:bg-gray-500/20 rounded-xl cursor-pointer transition-colors"
                  onMouseEnter={() => props.onEnter(i())}
                  onMouseLeave={() => props.onLeave()}
                >
                  <span>{andSplit(unit)}</span>
                  <span class="ml-4 text-right">
                    <Duration start={store.state[unit] * 1e3} />
                  </span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
      <div class="flex text-sm">
        {props.children}
        <button
          onClick={hasList && toggle}
          class="z-1 blur-box ml-4 mb-4 py-2 px-4 relative flex items-center place-self-start text-opacity-90"
          classList={{
            'active:top-px': hasList(),
            'bg-opacity-45 opacity-90': !hasList()
          }}
        >
          {!hasList() ? (
            <>
              <Icon path={informationCircle} class="icon mr-1.5 text-green-600" />
              Повітряна тривога відсутня
            </>
          ) : show() ? (
            <>
              <Icon path={xMark} class="icon mr-1.5" />
              Сховати
            </>
          ) : (
            <>
              <Icon path={viewList} class="icon mr-1.5 text-red-600 @dark:text-red-400" />
              Показати списком ({hasList()})
            </>
          )}
        </button>
      </div>
    </div>
  )
}
