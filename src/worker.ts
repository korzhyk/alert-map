import Fuse from 'fuse.js'

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
    keys: [
      'properties.region'
    ]
  }),
  [Unit.PROVINCE]: new Fuse([], {
    useExtendedSearch: true,
    keys: [
      'properties.rayon'
    ]
  }),
  [Unit.DISTRICT]: new Fuse([], {
    useExtendedSearch: true,
    keys: [
      { name: "properties.region", weight: .2 },
      { name: "properties.rayon", weight: .3 },
      { name: "properties.hromada", weight: .5 }
    ]
  })
}

let ready = false

onmessage = ({ data }) => {
  if (data === 'ready?') return postMessage({ ready })
  if (data.decodeState) {
    handleDecodeState(data.decodeState)
  }
}

Promise.all(Object.keys(Unit).map(type =>
  fetch(`/ukrainian_geodata/${Unit[type]}.geojson`)
  .then(response => response.json())
  .then(geojson => {
    if (Unit[type] === Unit.REGION) {
      return fetch(`/pig-dog.geojson`).then(r => r.json()).then(g => (geojson.features.push(g), geojson))
    } else return geojson
  })
  .then(({ features }) => fuses[Unit[type]].setCollection(features))
)).then(() => {
  ready = true
  postMessage({ ready })
}).catch(error => {
  console.log(error)
  postMessage({ error })
})

function handleDecodeState (state) {
  const decoded = Object.keys(state).sort().reduce((result, unit, i, units) => {
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
    }
    result.push([unit, state[unit], feature])
    return result
  }, [])
  return postMessage({ decoded })
}

function geoDecode (place) {
  if (andRx.test(place)) {
    return place.split(andRx).map(geoDecode).filter(Boolean)[0]
  }
  let result = []
  if (~place.indexOf('область')) {
    result = fuses[Unit.REGION].search(`^${place}`, ONE)
  }
  if (~place.indexOf('район')) {
    result = fuses[Unit.PROVINCE].search(`^${place}`, ONE)
  }
  if (~place.indexOf('громада')) {
    result = fuses[Unit.DISTRICT].search(`^${place.replace('територіальна', 'міська')}`, ONE)
    if (!result.length) {
      result = fuses[Unit.DISTRICT].search(`^${place}`, ONE)
    }
  }
  if (place.indexOf('м') == 0) {
    place = place.slice(place.indexOf(' ')).trim()
    result = fuses[Unit.DISTRICT].search(`^${place} міська громада|^${place}`, ONE)
  }
  if (result.length == 0) console.warn('Decode for', place, 'failed, result is empty.')
  return result.map(r => r.item)[0]
}
