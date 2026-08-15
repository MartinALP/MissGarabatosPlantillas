/**
 * Indicadores de lista de cotejo por PDA.
 * Semilla en código + lo que la educadora agrega (API / localStorage).
 */

const PDA_LPDA2 = 'LEN-C01-G2-01'

export const INDICADORES_DEFAULT_POR_PDA = {
  [PDA_LPDA2]: [
    'Escucha con atención a sus pares y a la educadora.',
    'Expresa ideas, emociones o necesidades con claridad.',
    'Participa en narraciones, cantos o juegos de lenguaje.',
    'Usa gestos, imágenes o movimiento para comunicarse.',
  ],
}

const LS_KEY = 'missgarabatos.indicadoresCotejo.v1'

let extrasCache = null
let ocultosCache = null

function uniqueList(list) {
  const seen = new Set()
  return (Array.isArray(list) ? list : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .filter((t) => {
      if (seen.has(t)) return false
      seen.add(t)
      return true
    })
}

function normalizeMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [pdaId, list] of Object.entries(raw)) {
    if (!pdaId || pdaId === 'extras' || pdaId === 'ocultos') continue
    if (!Array.isArray(list)) continue
    out[pdaId] = uniqueList(list)
  }
  return out
}

function splitPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { extras: {}, ocultos: {} }
  }
  if (raw.extras || raw.ocultos) {
    return {
      extras: normalizeMap(raw.extras),
      ocultos: normalizeMap(raw.ocultos),
    }
  }
  return { extras: normalizeMap(raw), ocultos: {} }
}

function payloadToSave() {
  return { extras: extrasCache || {}, ocultos: ocultosCache || {} }
}

function readLocalState() {
  try {
    if (typeof localStorage === 'undefined') return { extras: {}, ocultos: {} }
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { extras: {}, ocultos: {} }
    return splitPayload(JSON.parse(raw))
  } catch {
    return { extras: {}, ocultos: {} }
  }
}

function writeLocalState() {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(LS_KEY, JSON.stringify(payloadToSave()))
  } catch { /* ignore */ }
}

function persistState() {
  writeLocalState()
  const payload = payloadToSave()
  import('../api/missGarabatosApi.js').then(({ mgPut, MG_KEYS }) => mgPut(MG_KEYS.indicadores, payload)).catch((err) => {
    console.error('No se pudieron guardar indicadores de cotejo', err)
  })
}

function ensureCaches() {
  if (extrasCache && ocultosCache) return
  const local = readLocalState()
  extrasCache = extrasCache || local.extras
  ocultosCache = ocultosCache || local.ocultos
}

export function hydrateIndicadoresFromApi(payload) {
  const fromApi = splitPayload(payload)
  const fromLs = readLocalState()
  extrasCache = { ...fromLs.extras, ...fromApi.extras }
  ocultosCache = { ...fromLs.ocultos, ...fromApi.ocultos }
  writeLocalState()
  return extrasCache
}

export function getExtrasPorPda() {
  ensureCaches()
  return extrasCache
}

export function proponerIndicadores(pdaIds) {
  const ids = Array.isArray(pdaIds) ? pdaIds.filter(Boolean) : pdaIds ? [pdaIds] : []
  ensureCaches()
  const extras = extrasCache || {}
  const ocultos = ocultosCache || {}
  const seen = new Set()
  const out = []
  for (const id of ids) {
    const hidden = new Set(ocultos[id] || [])
    const seed = (INDICADORES_DEFAULT_POR_PDA[id] || []).filter((t) => !hidden.has(t))
    const extra = extras[id] || []
    for (const t of [...seed, ...extra]) {
      if (seen.has(t)) continue
      seen.add(t)
      out.push(t)
    }
  }
  return out
}

export function guardarIndicadorEnPdas(pdaIds, texto) {
  const t = String(texto || '').trim()
  const ids = (Array.isArray(pdaIds) ? pdaIds : [pdaIds]).filter(Boolean)
  if (!t || !ids.length) return proponerIndicadores(ids)
  ensureCaches()
  const extras = { ...extrasCache }
  for (const id of ids) {
    const seed = new Set((INDICADORES_DEFAULT_POR_PDA[id] || []).filter((x) => !(ocultosCache[id] || []).includes(x)))
    if (seed.has(t)) continue
    const list = extras[id] ? [...extras[id]] : []
    if (!list.includes(t)) list.push(t)
    extras[id] = list
  }
  extrasCache = extras
  persistState()
  return proponerIndicadores(ids)
}

export function editarIndicadorEnPdas(pdaIds, anterior, siguiente) {
  const from = String(anterior || '').trim()
  const to = String(siguiente || '').trim()
  const ids = (Array.isArray(pdaIds) ? pdaIds : [pdaIds]).filter(Boolean)
  if (!from || !to || from === to || !ids.length) return proponerIndicadores(ids)
  ensureCaches()
  const extras = { ...extrasCache }
  const ocultos = { ...ocultosCache }
  for (const id of ids) {
    const seed = INDICADORES_DEFAULT_POR_PDA[id] || []
    const extraList = extras[id] ? [...extras[id]] : []
    const hidden = ocultos[id] ? [...ocultos[id]] : []
    const inSeed = seed.includes(from)
    const extraIdx = extraList.indexOf(from)
    if (inSeed && extraIdx < 0) {
      if (!hidden.includes(from)) hidden.push(from)
      if (!extraList.includes(to)) extraList.push(to)
    } else if (extraIdx >= 0) {
      extraList[extraIdx] = to
    } else if (!extraList.includes(to)) {
      extraList.push(to)
    }
    extras[id] = uniqueList(extraList)
    ocultos[id] = uniqueList(hidden)
  }
  extrasCache = extras
  ocultosCache = ocultos
  persistState()
  return proponerIndicadores(ids)
}
