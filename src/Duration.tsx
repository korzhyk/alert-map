import formatDuration from 'date-fns/formatDuration'
import intervalToDuration from 'date-fns/intervalToDuration'
import differenceInMinutes from 'date-fns/differenceInMinutes'
import { uk } from 'date-fns/locale'
import { createSignal, onCleanup, onMount } from 'solid-js'

export default function Duration(props) {
  let timeout,
    duration = 1000,
    format = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']
  const [fresh, setFresh] = createSignal(true)
  const [formatted, setFormatted] = createSignal()
  const update = () => {
    const start = props.start || new Date()
    const end = props.end || new Date()
    const interval = intervalToDuration({ start, end })
    timeout = setTimeout(update, duration)
    if (duration != 6e4 && differenceInMinutes(end, start) >= 1) {
      duration = 6e4
      format.splice(format.indexOf('seconds') >>> 0)
      setFresh(false)
    }
    setFormatted(formatDuration(interval, { format, locale: uk }))
  }
  onMount(() => {
    update()
    onCleanup(() => clearTimeout(timeout))
  })
  return <span classList={{ 'dark:text-red-300 text-red-600 font-medium': fresh() }}>{formatted()}</span>
}
