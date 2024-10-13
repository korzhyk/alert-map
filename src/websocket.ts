import type { SocketteOptions } from "sockette"
import Sockette from "sockette"

export function createWebsocket(url: string, options: SocketteOptions) {
  return new Sockette(url, options)
}
