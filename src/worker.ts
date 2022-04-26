import { RpcProvider } from '@playcode/worker-rpc'
import Fuse from 'fuse.js'

const rpcProvider = new RpcProvider((message, transfer) => postMessage(message, transfer))
rpcProvider.registerRpcHandler('ready', async () => await readyPromise)
rpcProvider.registerRpcHandler('decode', (s) => handleDecodeState(s))
rpcProvider.registerRpcHandler('ff', async () => await ff)
onmessage = (e) => rpcProvider.dispatch(e.data)

enum Unit {
  REGION = 'regiony',
  PROVINCE = 'rayony',
  DISTRICT = 'hromady'
}

const ONE = { limit: 1 }
const andRx = /\s(?:та)\s/
const fuses = {
  [Unit.REGION]: new Fuse([], {
    useExtendedSearch: true,
    keys: ['properties.region']
  }),
  [Unit.PROVINCE]: new Fuse([], {
    useExtendedSearch: true,
    keys: ['properties.rayon']
  }),
  [Unit.DISTRICT]: new Fuse([], {
    useExtendedSearch: true,
    keys: [
      { name: 'properties.region', weight: 0.2 },
      { name: 'properties.rayon', weight: 0.3 },
      { name: 'properties.hromada', weight: 0.5 }
    ]
  })
}

const ff = fetch(`/ff.geojson`).then((r) => r.json())

ff.then(({ features }) => {
  fuses.ff = new Fuse(features, {
    useExtendedSearch: true,
    keys: ['properties.region']
  })
})

const readyPromise = Promise.all(
  Object.keys(Unit).map((type) =>
    fetch(`/ukrainian_geodata/${Unit[type]}.geojson`)
      .then((response) => response.json())
      .then(({ features }) => fuses[Unit[type]].setCollection(features))
  )
).catch((error) => {
  console.log(error)
  postMessage({ error })
})

function handleDecodeState(state) {
  return Object.keys(state).reduce((result, unit, i, units) => {
    const feature = geoDecode(unit)
    if (feature) {
      let { hromada, rayon, region } = feature.properties
      if (hromada && (~units.indexOf(rayon) || ~units.indexOf(region))) {
        return result
      }
      if (!hromada && !region) {
        const hromadaInRayon = fuses[Unit.DISTRICT].search(`^${rayon}`, ONE)[0]
        if (hromadaInRayon && ~units.indexOf(hromadaInRayon.item.properties.region)) {
          return result
        }
      }
      result[unit] = feature
    }
    return result
  }, {})
}

function geoDecode(place) {
  if (andRx.test(place)) {
    return place.split(andRx).map(geoDecode).filter(Boolean)[0]
  }
  let result = []
  if (fuses.ff) {
    result = fuses.ff.search(`="${place}"`, ONE)
    if (result.length) return result[0].item
  }
  if (~place.indexOf('область')) {
    result = fuses[Unit.REGION].search(`="${place}"`, ONE)
  } else if (~place.indexOf('район')) {
    result = fuses[Unit.PROVINCE].search(`="${place}"`, ONE)
  } else if (~place.indexOf('громада')) {
    result = fuses[Unit.DISTRICT].search(`="${place}"`, ONE)
    if (!result.length) {
      result = fuses[Unit.DISTRICT].search(
        `^${place.replace('територіальна', 'міська')}|^${place}`,
        ONE
      )
    }
  } else if (place.indexOf('м') == 0) {
    place = place.slice(place.indexOf(' ')).trim()
    result = fuses[Unit.DISTRICT].search(`^${place} міська громада|^${place}`, ONE)
  }
  if (result.length == 0) console.warn('Decode for', place, 'failed, result is empty.')
  return result.map((r) => r.item)[0]
}
