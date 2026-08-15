const API = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const EMAIL = import.meta.env.VITE_TEACHER_EMAIL || 'local@missgarabatos.dev'

const KEYS = {
  catalog: 'catalogoFase2',
  niveles: 'nivelesDesempeno',
  evidencias: 'evidencias_borrador',
  indicadores: 'indicadoresCotejo',
}

function headers(json = false) {
  const h = { 'X-Teacher-Email': EMAIL }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

export async function mgHealth() {
  const r = await fetch(`${API}/api/missgarabatos/health`)
  if (!r.ok) throw new Error(`health ${r.status}`)
  return r.json()
}

export async function mgGetAll() {
  const r = await fetch(`${API}/api/missgarabatos/configs`, { headers: headers() })
  if (!r.ok) throw new Error(`configs ${r.status}`)
  return r.json()
}

export async function mgPut(key, payload) {
  const r = await fetch(`${API}/api/missgarabatos/configs/${key}`, {
    method: 'PUT',
    headers: headers(true),
    body: JSON.stringify({ payload }),
  })
  if (!r.ok) throw new Error(`put ${key} ${r.status}`)
  return r.json()
}

export async function mgDelete(key) {
  const r = await fetch(`${API}/api/missgarabatos/configs/${key}`, {
    method: 'DELETE',
    headers: headers(),
  })
  if (!r.ok) throw new Error(`delete ${key} ${r.status}`)
  return r.json()
}

const LS = {
  catalog: 'missgarabatos.catalogoFase2.v1',
  niveles: 'missgarabatos.nivelesDesempeno.v1',
  evidencias: 'mg_evidencias_borrador_v1',
  indicadores: 'missgarabatos.indicadoresCotejo.v1',
}

function readLocal(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isEmptyConfig(key, value) {
  if (value == null) return true
  if (key === KEYS.catalog) return !(Array.isArray(value) && value.length)
  if (key === KEYS.niveles) {
    if (typeof value !== 'object' || Array.isArray(value)) return true
    if (value.probe === true) return true
    return !value.niveles && !value.aperturas
  }
  if (key === KEYS.evidencias) {
    if (typeof value !== 'object') return true
    const hasSlides = Array.isArray(value.slides) && value.slides.length
    const hasDraft = Boolean(value.draft?.tipo)
    return !hasSlides && !hasDraft
  }
  if (key === KEYS.indicadores) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return true
    const extras = value.extras && typeof value.extras === 'object' ? value.extras : value
    const ocultos = value.ocultos && typeof value.ocultos === 'object' ? value.ocultos : {}
    return !Object.keys(extras || {}).length && !Object.keys(ocultos || {}).length
  }
  return false
}

/** Sube localStorage a la BD. Combina pdaAjustes; no borra el navegador. */
export async function migrateLocalStorageToDb(existingConfigs = {}, { force = false } = {}) {
  const migrated = []
  const pairs = [
    [KEYS.catalog, LS.catalog],
    [KEYS.niveles, LS.niveles],
    [KEYS.evidencias, LS.evidencias],
    [KEYS.indicadores, LS.indicadores],
  ]
  for (const [apiKey, lsKey] of pairs) {
    const fromDb = existingConfigs[apiKey]
    const fromLs = readLocal(lsKey)
    if (isEmptyConfig(apiKey, fromLs)) continue

    let payload = fromLs
    if (apiKey === KEYS.niveles) {
      const dbAdj = fromDb?.pdaAjustes && typeof fromDb.pdaAjustes === 'object' ? fromDb.pdaAjustes : {}
      const lsAdj = fromLs?.pdaAjustes && typeof fromLs.pdaAjustes === 'object' ? fromLs.pdaAjustes : {}
      const mergedAdj = { ...dbAdj, ...lsAdj }
      const lsHasMore = Object.keys(lsAdj).length > Object.keys(dbAdj).length
      if (!force && !isEmptyConfig(apiKey, fromDb) && !lsHasMore && Object.keys(lsAdj).length === 0) continue
      payload = {
        ...(typeof fromDb === 'object' && fromDb && !Array.isArray(fromDb) ? fromDb : {}),
        ...fromLs,
        pdaAjustes: mergedAdj,
      }
    } else if (apiKey === KEYS.catalog) {
      if (!force && !isEmptyConfig(apiKey, fromDb)) continue
    } else if (apiKey === KEYS.evidencias) {
      if (!force && !isEmptyConfig(apiKey, fromDb)) continue
      payload = {
        ...fromLs,
        draft: fromLs.draft ? { ...fromLs.draft, pptAdjunto: null } : fromLs.draft,
        slides: Array.isArray(fromLs.slides)
          ? fromLs.slides.map((s) => {
              const { pptBlob, ...rest } = s || {}
              return rest
            })
          : [],
      }
    } else if (apiKey === KEYS.indicadores) {
      const asMaps = (v) => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return { extras: {}, ocultos: {} }
        if (v.extras || v.ocultos) {
          return {
            extras: v.extras && typeof v.extras === 'object' ? v.extras : {},
            ocultos: v.ocultos && typeof v.ocultos === 'object' ? v.ocultos : {},
          }
        }
        return { extras: v, ocultos: {} }
      }
      const dbMap = asMaps(fromDb)
      const lsMap = asMaps(fromLs)
      payload = {
        extras: { ...dbMap.extras, ...lsMap.extras },
        ocultos: { ...dbMap.ocultos, ...lsMap.ocultos },
      }
      if (!force && !isEmptyConfig(apiKey, fromDb) && Object.keys(lsMap.extras).length <= Object.keys(dbMap.extras).length) continue
    }

    await mgPut(apiKey, payload)
    migrated.push(apiKey)
  }
  return migrated
}

export { API as MG_API_URL, EMAIL as MG_TEACHER_EMAIL, KEYS as MG_KEYS }
