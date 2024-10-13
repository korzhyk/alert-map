const mainRx = /\s[ву] (.+?)(?: арт.+|\.?)$/m
const stillRx = /-(.+?)\.?$/gm
const clearRx = /(🟢|відбій)/i
const pendingRx = /(🟡|триває)/i
const airalertRx = /(🔴|повітряна|загроза)/i

export function parseMessage(message) {
  const except = []
  const main = []
  const type = pendingRx.test(message)
    ? 'pending'
    : airalertRx.test(message)
      ? 'alert'
      : clearRx.test(message)
        ? 'clear'
        : 'unknown'

  let m = mainRx.exec(message)

  if (m) {
    main.push(m[1].trim())
  }

  switch (type) {
    case 'alert':
      return [except, main]
    case 'pending':
      while ((m = stillRx.exec(message))) {
        except.push(m[1].trim())
      }
    case 'clear':
      return [main, except]
    default:
      return [[], []]
  }
}
