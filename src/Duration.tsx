import { formatDuration, intervalToDuration, differenceInSeconds } from 'date-fns'
import { uk } from 'date-fns/locale'
import { createSignal, onCleanup, onMount } from 'solid-js'

const timer = {
  interval: null,
  subscribers: new Set(),
  subscribe(fn) {
    this.subscribers.add(fn)
    this.interval ??= setInterval(() => {
      if (this.subscribers.size === 0) {
        this.interval = clearInterval(this.interval)
        return
      }
      this.subscribers.forEach(fn => fn())
    }, 1e3)
    return () => this.subscribers.delete(fn)
  }
}

const format = ['years', 'months', 'days', 'hours', 'minutes', 'seconds']
const limitWindow = (duration, max) => {
  if (isNaN(+max)) return duration
  let count = 0
  for (const item of format) {
    if (count || duration[item]) {
      ++count > max && (duration[item] = 0)
    }
  }
  return duration
}

export default function Duration({ start = new Date, end = () => new Date, maxWindow }) {
  const [fresh, setFresh] = createSignal(differenceInSeconds(start, end()) > -60)
  const [duration, setDuration] = createSignal(
    limitWindow(intervalToDuration({ start, end: end() }), maxWindow)
  )

  const unsubscribe = timer.subscribe(() => {
    setFresh(differenceInSeconds(start, end()) > -60)
    setDuration(limitWindow(intervalToDuration({ start, end: end() }), maxWindow))
  })

  onCleanup(unsubscribe)

  return (
    <span class="transition-color" classList={{ '@dark:text-red-300 text-red-600 font-medium': fresh() }}>
      {formatDuration(duration(), { locale: uk })}
    </span>
  )
}
