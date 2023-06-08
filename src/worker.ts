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

const readyPromise = Promise.all(Object.keys(Unit).map((type) =>
  fetch(`/ukrainian_geodata/${Unit[type]}.geojson`)
    .then((response) => response.json()).catch(e => ({ features: [] }))
    .then(({ features }) => {
      console.info(`Search collection "${Unit[type]}" is populated with ${features.length} items`)
      fuses[Unit[type]].setCollection(features)
    })
))
  .catch((error) => postMessage({ error }))

onmessage = (e) => {
  switch (e.data.type) {
    case 'decode':
      readyPromise
        .then(() => handleDecodeState(e.data.payload))
        .then(decode => {
          postMessage({ ...e.data, payload: decode })
        })
      break
    default:
      console.log(e)
  }
}

let eggFuse
readyPromise.then(() => {
  fetch(`/egg.geojson`).then((r) => r.json()).then(({ features }) => {
    eggFuse = new Fuse(features, {
      useExtendedSearch: true,
      keys: ['properties.region']
    })
  })
})

function handleDecodeState(state) {
  const result = []
  if (!state) return result
  for (const [unit] of state) {
    const feature = geoDecode(unit)
    if (feature) {
      let { hromada, rayon, region } = feature.properties
      if (hromada && (state.has(rayon) || state.has(region))) {
        continue
      }
      if (!hromada && !region) {
        const hromadaInRayon = fuses[Unit.DISTRICT].search(`^${rayon}`, ONE)[0]
        if (hromadaInRayon && state.has(hromadaInRayon.item.properties.region)) {
          continue
        }
      }

      feature.id = feature.properties.fid || feature.properties.id
      result.push([unit, feature])
    }
  }
  return result
}

function geoDecode(place) {
  if (andRx.test(place)) {
    return place.split(andRx).map(geoDecode).filter(Boolean)[0]
  }
  let result = []
  if (typeof eggFuse !== 'undefined') {
    result = eggFuse.search(`="${place}"`, ONE)
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
  if (result.length == 0) {
    console.warn('Decode for', place, 'failed, result is empty.')
  }
  return result[0]?.item
}
