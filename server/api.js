const debug = require('debug')
const input = require('input')
const { createHmac } = require('crypto')
const MTProto = require('@mtproto/core')
const { sleep } = require('@mtproto/core/src/utils/common')
const RedisStorage = require('./redis')

const log = debug('server:api')

class API {
  constructor(api_id, api_hash) {
    this.storage = new RedisStorage(createHmac('sha256', api_hash).update(api_id).digest('hex'))
    this.mtproto = new MTProto({
      api_id,
      api_hash,
      storageOptions: {
        instance: this.storage
      }
    })
  }

  async call(method, params, options = {}) {
    try {
      const result = await this.mtproto.call(method, params, options)
      return result
    } catch (error) {
      const { error_code, error_message } = error

      if (error_code === 401) {
        switch (error_message) {
          case 'AUTH_KEY_UNREGISTERED':
            const phone = await input.text('Phone number')
            const { phone_code_hash } = await this.sendCode(phone)
            const code = await input.text('Code')
            try {
              const signInResult = await this.signIn({
                code,
                phone,
                phone_code_hash
              })

              if (signInResult._ === 'auth.authorizationSignUpRequired') {
                await this.signUp({
                  phone,
                  phone_code_hash
                })
              }
            } catch (error) {}
            break
          case 'SESSION_PASSWORD_NEEDED':
            // 2FA
            const password = await input.password('Password')
            const { srp_id, current_algo, srp_B } = await this.getPassword()
            const { g, p, salt1, salt2 } = current_algo
            const { A, M1 } = await this.mtproto.crypto.getSRPParams({
              g,
              p,
              salt1,
              salt2,
              gB: srp_B,
              password
            })

            await this.checkPassword({ srp_id, A, M1 })
            break
          default:
            log('error:', error)
            return
        }
        return this.call(method, params, options)
      }

      if (error_code === 420) {
        const seconds = Number(error_message.split('FLOOD_WAIT_')[1])
        const ms = seconds * 1000

        await sleep(ms)

        return this.call(method, params, options)
      }

      if (error_code === 303) {
        const [type, dcIdAsString] = error_message.split('_MIGRATE_')

        const dcId = Number(dcIdAsString)

        // If auth.sendCode call on incorrect DC need change default DC, because
        // call auth.signIn on incorrect DC return PHONE_CODE_EXPIRED error
        if (type === 'PHONE') {
          await this.mtproto.setDefaultDc(dcId)
        } else {
          Object.assign(options, { dcId })
        }

        return this.call(method, params, options)
      }

      return Promise.reject(error)
    }
  }

  async getUser() {
    try {
      const user = await this.call('users.getFullUser', {
        id: {
          _: 'inputUserSelf'
        }
      })
      return user
    } catch (error) {
      return null
    }
  }

  sendCode(phone) {
    return this.call('auth.sendCode', {
      phone_number: phone,
      settings: {
        _: 'codeSettings'
      }
    })
  }

  signIn({ code, phone, phone_code_hash }) {
    return this.call('auth.signIn', {
      phone_code: code,
      phone_number: phone,
      phone_code_hash: phone_code_hash
    })
  }

  signUp({ phone, phone_code_hash }) {
    return this.call('auth.signUp', {
      phone_number: phone,
      phone_code_hash: phone_code_hash,
      first_name: 'MTProto',
      last_name: 'Core'
    })
  }

  getPassword() {
    return this.call('account.getPassword')
  }

  checkPassword({ srp_id, A, M1 }) {
    return this.call('auth.checkPassword', {
      password: {
        _: 'inputCheckPasswordSRP',
        srp_id,
        A,
        M1
      }
    })
  }
}

const getChannelByUserName = (pool, username) =>
  pool.client.call('contacts.resolveUsername', { username })

const handleChannelUpdates = (pool, channel) => {
  pool.state.channelsIds.add(channel.id)
  if (!pool.state.handlers.has('updates')) {
    pool.client.mtproto.updates.on('updates', (updateInfo) => {
      const updates = updateInfo.updates.filter(
        ({ _, message }) =>
          _ === 'updateNewChannelMessage' && pool.state.channelsIds.has(message.peer_id.channel_id)
      )
      updates.length && pool.onUpdate(updates)
    })
    pool.state.handlers.add('updates')
  }
}

const loadHistory = async (pool, channel) => {
  const historyResult = await pool.client.call('messages.getHistory', {
    peer: {
      _: 'inputPeerChannel',
      channel_id: channel.id,
      access_hash: channel.access_hash
    },
    limit: pool.options.history || 50
  })
  pool.onUpdate(historyResult.messages.reverse().map((message) => ({ message })))
}

const handleUpdatesFactory = async (dependencies, options) => {
  const pool = {
    loadHistory,
    getChannelByUserName,
    handleChannelUpdates,
    ...dependencies,
    options,
    state: {
      handlers: new Set(),
      channelsIds: new Set()
    }
  }

  const lookupResult = await pool.getChannelByUserName(pool, options.channel)

  if (lookupResult.peer?._ === 'peerChannel') {
    const channel = lookupResult.chats.find((chat) => chat.id === lookupResult.peer.channel_id)
    pool.loadHistory(pool, channel)
    pool.handleChannelUpdates(pool, channel)
  }
}

module.exports = { API, handleUpdatesFactory }
