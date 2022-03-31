const uWS = require('uWebSockets.js')

module.exports = uWS
  .App()
  .ws('/*', {
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 32,
    idleTimeout: 60,
    open: ws => ws.subscribe('broadcast')
  })
  .any('/*', res => {
    res.end('.')
  })
