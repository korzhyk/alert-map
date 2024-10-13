import Redis from 'ioredis'

const client = new Redis(Bun.env.REDIS_URI)

export default client
