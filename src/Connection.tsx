import { Show } from 'solid-js'
import { Icon } from 'solid-heroicons'
import { wifi, refresh } from 'solid-heroicons/outline'

export default function Connection(props) {
  return (
    <Show when={props.state !== WebSocket.OPEN} fallback={props.children}>
      <button
        class="z-1 blur-box l-4 mb-4 py-2 px-4 flex items-center absolute top-4 left-4 font-light"
        onClick={props.connect}
      >
        {props.state === WebSocket.CLOSED ? (
          <>
            <Icon path={wifi} class="icon text-red-600 mr-1.5" />
            Відсутнє з’єднання з сервером
          </>
        ) : (
          <>
            <Icon path={refresh} class="icon text-yellow-400 mr-1.5" />
            Спроба під’єднання…
          </>
        )}
      </button>
    </Show>
  )
}
