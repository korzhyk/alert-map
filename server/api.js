const { createHmac } = require('crypto')
const MTProto = require('@mtproto/core')
const { sleep } = require('@mtproto/core/src/utils/common')
const RedisStorage = require('./redis')
const input = require('input')
const debug = require('debug')

const log = debug('server:api')

class API {
  constructor (api_id, api_hash) {
    this.storage = new RedisStorage(createHmac('sha256', api_hash).update(api_id).digest('hex'))
    this.mtproto = new MTProto({
      api_id,
      api_hash,
      storageOptions: {
        instance: this.storage
      }
    })
  }

  async call (method, params, options = {}) {
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

            const checkPasswordResult = await this.checkPassword({ srp_id, A, M1 })
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

  sendCode (phone) {
    return this.call('auth.sendCode', {
      phone_number: phone,
      settings: {
        _: 'codeSettings'
      }
    })
  }

  signIn ({ code, phone, phone_code_hash }) {
    return this.call('auth.signIn', {
      phone_code: code,
      phone_number: phone,
      phone_code_hash: phone_code_hash
    })
  }

  signUp ({ phone, phone_code_hash }) { 
    return this.call('auth.signUp', {
      phone_number: phone,
      phone_code_hash: phone_code_hash,
      first_name: 'MTProto',
      last_name: 'Core'
    })
  }

  getPassword () {
    return this.call('account.getPassword')
  }

  checkPassword ({ srp_id, A, M1 }) {
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

module.exports = API