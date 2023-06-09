import { createSignal, createMemo, For, Show, Switch, Match } from 'solid-js'
import { Icon } from 'solid-heroicons'
import { informationCircle, queueList, xMark, wifi, arrowPath } from 'solid-heroicons/outline'
import Duration from './Duration'
import { useAlerts } from './Alerts'
import { useConnection } from './Connection'

/**
 * Handle items to show in "pretty" way.
 * Example `м. Нікополь та Нікопольська територіальна громада`
 **/
const AND_RX = /\s(?:та)\s/
const andSplit = (str) => str.split(AND_RX)[0]
const listSort = ([unitA], [unitB]) => {
  if (unitA[0] === 'м' && unitB[0] !== 'м') { return -1 }
  if (unitA[0] !== 'м' && unitB[0] === 'м') { return 1 }
  return unitA.localeCompare(unitB)
}

export default function AlertsList() {
  const [connectionState] = useConnection()
  const [state, geoJSON, { setSelected }] = useAlerts()
  const [show, setShow] = createSignal(false)
  const list = createMemo(() => {
    let items = []
    if (!geoJSON() || !state()) {
      if (state()) {
        items = [...state()]
      }
    } else {
      for (const [unit, options] of state().entries()) {
        options.id && items.push([unit, options])
      }
    }
    return new Map([...items.sort(listSort)])
  })
  const listCount = createMemo(() => list()?.size)

  return (
    <div class="absolute bottom-0 left-0 flex flex-col max-h-screen max-w-screen lt-sm:w-full">
      <Show when={listCount() && show()}>
        <div class="sm:min-w-md z-1 blur-box m-4 p-2 flex flex-col rounded-xl text-sm overflow-y-auto">
          <div class="py-2 mb-2 px-3 flex justify-between font-medium border-b-px border-b-1 border-gray-500/30">
            <h3>Повітряна тривога</h3>
            <h6>Триває</h6>
          </div>
          <ul class="overflow-y-auto">
            <For each={[...list()]}>
              {([unit, { id, timestamp }], i) => (
                <li
                  class="flex justify-between py-2 px-3 hover:bg-gray-500/20 rounded-xl cursor-pointer transition-bg"
                  onMouseEnter={() => setSelected(id)}
                  onMouseLeave={() => setSelected()}
                >
                  <span>{andSplit(unit)}</span>
                  <span class="ms-3 text-right">
                    <Duration start={timestamp * 1e3} maxWindow={3} />
                  </span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
      <div class="flex text-sm">
        <button
          onClick={() => listCount() && setShow(!show())}
          class="z-1 blur-box ml-4 mb-4 py-2 px-4 relative flex items-center place-self-start text-opacity-90"
          classList={{
            'active:top-px': listCount(),
            'bg-opacity-45 opacity-90': !listCount()
          }}
        >
          <Switch fallback={<>
            <Icon path={wifi} class="icon text-red-600 mr-1.5" />
            Відсутнє з’єднання з сервером
          </>}>
            <Match when={connectionState() === WebSocket.CONNECTING}>
              <>
                <Icon path={arrowPath} class="icon text-yellow-400 mr-1.5" />
                Спроба під’єднання…
              </>
            </Match>
            <Match when={connectionState() === WebSocket.OPEN}>
              {!listCount() ? (
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
                  <Icon path={queueList} class="icon mr-1.5 text-red-600 @dark:text-red-400" />
                  Показати списком ({listCount()})
                </>
              )}
            </Match>
          </Switch>
        </button>
      </div>
    </div>
  )
}
