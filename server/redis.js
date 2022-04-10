const debug = require('debug')
const { createClient } = require('redis')

const log = debug('server:redisStorage')

class RedisStorage {
  constructor(hash) {
    this.storageHash = hash
    this.client = createClient({
      url: process.env.REDIS_URI
    })
    this.client.on('error', (e) => log(e.message))
    this.client.connect()
  }
  set(key, value) {
    return this.client.HSET(this.storageHash, key, value)
  }
  get(key) {
    return this.client.HGET(this.storageHash, key)
  }
}

module.exports = RedisStorage
