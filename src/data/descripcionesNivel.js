/**
 * Descriptores diagnósticos para preescolar (Fase 2 / NEM).
 * Cada opción: 190–200 caracteres (espacios incluidos).
 *
 * El tramo ANTES del primer punto matiza el PDA según el nivel
 * (no afirma logro en P/RA). El tramo DESPUÉS del punto es el cierre pedagógico.
 */

import { getActiveNivelesConfig } from './nivelesStore'

export const MIN_CHARS = 190
export const MAX_CHARS = 200

const DANGLE =
  /^(o|y|e|u|de|del|en|con|sin|para|por|al|a|cuando|que|una|un|el|la|los|las|lo|le|se|su|sus|mi|tu|si|más|muy|ya|ni|como|entre|sobre|hasta|desde|hacia)$/i

function normalize(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripDangling(base) {
  let t = normalize(base).replace(/[,:;.\-–—]$/, '').trim()
  while (t) {
    const parts = t.split(' ')
    const last = parts[parts.length - 1]
    if (DANGLE.test(last) || last.length <= 1) {
      parts.pop()
      t = parts.join(' ').replace(/[,:;.\-–—]$/, '').trim()
      continue
    }
    break
  }
  return t
}

function clipWord(text, max) {
  const t = normalize(text)
  if (t.length <= max) return stripDangling(t)
  const cut = t.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  let base = (sp > Math.floor(max * 0.5) ? cut.slice(0, sp) : cut).trim()
  return stripDangling(base)
}

function cleanPda(pda) {
  let t = normalize(pda).replace(/\.$/, '')
  t = t
    .replace(/^(Las?|Los)\s+niñ[oa]s?\s+/i, '')
    .replace(/^El alumnado\s+/i, '')
    .replace(/^Se espera que\s+/i, '')
    .replace(/^Que\s+/i, '')
  return t
}

function nucleoRaw(pda) {
  let t = cleanPda(pda)
  if (!t) return 'participa con interés en las experiencias del aula'
  if (/^(de los|de las|del |de la |en |con |por |para |paisajes|elementos|historias|textos|recursos)/i.test(t)) {
    t = `explora, expresa y disfruta ${t}`
  }
  return t.charAt(0).toLowerCase() + t.slice(1)
}

function shrinkNucleo(raw, max) {
  let t = raw
  if (t.length <= max) return stripDangling(t)
  for (const c of [', para ', ', mediante ', ', a través ', ', desde ', '; ']) {
    const i = t.indexOf(c)
    if (i > 40 && i <= max) {
      t = t.slice(0, i)
      break
    }
  }
  if (t.length > max) {
    for (const c of [', y ', ', o ']) {
      const i = t.indexOf(c)
      if (i > 40 && i <= max) {
        t = t.slice(0, i)
        break
      }
    }
  }
  if (t.length > max) t = clipWord(t, max)
  return stripDangling(t)
}

function capitalizar(s) {
  const t = normalize(s)
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Separa el primer verbo conjugado del resto del PDA. */
function splitVerbRest(raw) {
  const t = normalize(raw)
  const m = t.match(/^([A-Za-záéíóúüñÁÉÍÓÚÜÑ]+)\s+(.+)$/u)
  if (!m) {
    return { verb: 'participa', rest: 'en las experiencias del aula', full: t }
  }
  return { verb: m[1].toLowerCase(), rest: m[2], full: t }
}

/** Heurística simple 3ª persona → infinitivo (preescolar / PDA frecuentes). */
function toInfinitive(verb) {
  const v = verb.toLowerCase()
  const map = {
    es: 'ser',
    está: 'estar',
    son: 'ser',
    tiene: 'tener',
    hace: 'hacer',
    dice: 'decir',
    ve: 'ver',
    va: 'ir',
    viene: 'venir',
    pone: 'poner',
    puede: 'poder',
    quiere: 'querer',
    sabe: 'saber',
    hay: 'haber',
    lee: 'leer',
    oye: 'oír',
    ríe: 'reír',
    sonríe: 'sonreír',
  }
  if (map[v]) return map[v]
  if (v.endsWith('ándose')) return `${v.slice(0, -6)}arse`
  if (v.endsWith('iéndose')) return `${v.slice(0, -7)}irse`
  if (v.endsWith('a')) return `${v.slice(0, -1)}ar`
  if (v.endsWith('e')) return `${v.slice(0, -1)}er`
  return v
}

const MICRO = [
  ' Se observa en la cotidianeidad del aula.',
  ' Queda evidenciado en la observación docente.',
  ' Se registra como avance del periodo.',
  ' Se evidencia en el trabajo con el grupo.',
  ' Forma parte del seguimiento del aula.',
]

const LONG_FILL = [
  ' La observación en juego, rutinas e interacción con pares permite documentar el avance y orientarlo con la familia.',
  ' Se valoran evidencias del aula y se comparten con la familia pautas claras de acompañamiento en casa.',
]

/** Textos fijos (200 caracteres) para PDA específicos, en lugar del generador. */
const PDA_OVERRIDES = [
  {
    key: 'emplea palabras, gestos, señas, imágenes, sonidos o movimientos corporales que aprende en su comunidad, para expresar necesidades, ideas, emociones y gustos que reflejan su forma de interpretar y actuar en el mundo.',
    S: [
      'Emplea con autonomía palabras, gestos, señas, imágenes, sonidos y movimientos corporales de su comunidad para expresar necesidades, ideas, emociones y gustos, e interpretar y actuar mejor en su mundo.',
      'Utiliza con gran seguridad palabras, gestos, señas, imágenes, sonidos y movimientos corporales aprendidos en su comunidad para comunicar necesidades, ideas, emociones y gustos en situaciones diversas.',
      'Comunica de forma autónoma necesidades, ideas, emociones y gustos mediante palabras, gestos, señas, imágenes, sonidos y movimientos corporales de su comunidad, actuando con seguridad en su entorno ya.',
    ],
    E: [
      'Emplea palabras, gestos, señas, imágenes, sonidos y movimientos corporales para expresar necesidades, ideas, emociones y gustos; lo realiza la mayoría de las veces con apoyo breve del adulto en clase.',
      'Utiliza palabras, gestos, señas, imágenes, sonidos y movimientos corporales de su comunidad para comunicar necesidades, ideas, emociones y gustos; en ocasiones necesita una orientación breve y amable.',
      'Expresa necesidades, ideas, emociones y gustos con palabras, gestos, señas, imágenes, sonidos o movimientos corporales; generalmente lo hace con claridad y requiere apoyo breve u ocasional del adulto.',
    ],
    P: [
      'Intenta emplear palabras, gestos, señas, imágenes, sonidos y movimientos corporales para expresar necesidades, ideas, emociones y gustos; requiere modelado, práctica y acompañamiento frecuente y guía.',
      'Ensaya palabras, gestos, señas, imágenes, sonidos y movimientos corporales para comunicar necesidades, ideas, emociones y gustos; avanza con ejemplos, preguntas, práctica y apoyo frecuente del adulto.',
      'Empieza a expresar necesidades, ideas, emociones y gustos mediante palabras, gestos, señas, imágenes, sonidos o movimientos corporales; necesita tiempo, modelado y acompañamiento frecuente del adulto.',
    ],
    RA: [
      'Se le dificulta emplear palabras, gestos, señas, imágenes, sonidos y movimientos corporales para expresar necesidades, ideas y emociones; necesita apoyo cercano, continuo y personalizado para avanzar.',
      'Requiere apoyo constante para usar palabras, gestos, señas, imágenes, sonidos o movimientos corporales al expresar necesidades, ideas, emociones; responde aún mejor con ejemplos y atención individual.',
      'Aún presenta dificultad para comunicar necesidades, ideas, emociones y gustos con palabras, gestos, señas, imágenes, sonidos o movimientos corporales; necesita mediación cercana y ocasiones de ensayo.',
    ],
  },
  {
    key: 'reconoce que cuando juega y socializa con sus pares, se expresan desde sus posibilidades, vivencias y cultura.',
    S: [
      'Reconoce con autonomía que al jugar y socializar con sus pares, cada persona se expresa desde sus posibilidades, vivencias y cultura; escucha con respeto y valora las distintas formas de comunicación.',
      'Identifica durante el juego que sus pares comunican ideas, emociones y experiencias según sus posibilidades, vivencias y cultura; participa con respeto, interés y apertura activa ante las diferencias.',
      'Reconoce que sus compañeras y compañeros se expresan de diversas maneras durante el juego, de acuerdo con sus posibilidades, vivencias y cultura; convive, escucha y responde con respeto y con empatía.',
    ],
    E: [
      'Reconoce que sus pares se expresan desde distintas posibilidades, vivencias y culturas cuando juegan y socializan; generalmente escucha y participa con respeto mutuo, aunque precisa orientación breve.',
      'Identifica en el juego varias formas de expresión de sus compañeras y compañeros relacionadas con sus vivencias y cultura; muestra respeto mutuo y requiere apoyo ocasional para comprender diferencias.',
      'Observa que cada integrante del grupo se expresa según sus posibilidades, experiencias y cultura al jugar; suele escuchar y convivir con respeto con recordatorios breves simples cuando son necesarios.',
    ],
    P: [
      'Comienza a reconocer que sus pares se expresan desde sus posibilidades, vivencias y cultura durante el juego; aún necesita preguntas, ejemplos y acompañamiento frecuente para valorar esas diferencias.',
      'Intenta identificar distintas formas de expresión de sus compañeras y compañeros durante el juego; avanza con modelado, diálogo amable y apoyo frecuente para relacionarlas con sus vivencias y cultura.',
      'Explora cómo se expresan sus pares al jugar y convivir, pero aún requiere mediación para reconocer que sus posibilidades, experiencias y cultura influyen en sus formas de comunicación dentro del aula.',
    ],
    RA: [
      'Se le dificulta reconocer que sus pares se expresan desde sus posibilidades, vivencias y cultura durante el juego; ya necesita apoyo cercano, ejemplos concretos y mediación continua para comprenderlo.',
      'Requiere acompañamiento constante para observar y aceptar las distintas formas de expresión de sus pares en el juego; aún responde mejor con situaciones concretas, diálogo breve y atención individual.',
      'Aún necesita más apoyos para comprender que sus compañeras y compañeros expresan vivencias y cultura de diversas maneras; conviene ofrecer modelado, juego guiado y oportunidades breves de interacción.',
    ],
  },
  {
    key: 'espera su turno al participar en una conversación con sus compañeras o compañeros.',
    S: [
      'Espera su turno con autonomía al conversar con sus compañeras y compañeros; escucha con atención, respeta las intervenciones y participa en el momento oportuno con seguridad, interés y cortesía mutua.',
      'Participa en conversaciones, respetando su turno y el de sus pares; mantiene la escucha, espera con paciencia y expresa sus ideas cuando corresponde, favoreciendo un diálogo muy ordenado y respetuoso.',
      'Regula su participación al conversar: escucha a sus compañeras y compañeros, espera su turno sin recordatorios y toma la palabra de manera pertinente, respetuosa y muy segura en distintas situaciones.',
    ],
    E: [
      'Espera su turno al conversar con sus compañeras y compañeros la mayoría de las veces; escucha y participa de manera adecuada aunque puede requerir solo un recordatorio breve para organizar el diálogo.',
      'Participa en conversaciones y suele respetar los turnos de habla; atiende a sus pares y expresa sus ideas con claridad con orientación ocasional cuando necesita esperar o retomar la escucha del grupo.',
      'Reconoce cuándo corresponde escuchar y cuándo participar en una conversación; generalmente espera su turno y responde con respeto aunque requiere apoyo breve en situaciones de mayor entusiasmo grupal.',
    ],
    P: [
      'Empieza a esperar su turno al conversar con sus compañeras y compañeros; aún necesita recordatorios, señales visuales y práctica frecuente para escuchar, regular su impulso y participar oportunamente.',
      'Intenta respetar los turnos durante una conversación, pero a veces interrumpe o pierde la escucha; avanza con modelado, acuerdos muy sencillos y acompañamiento frecuente en pequeños grupos en el aula.',
      'Practica la espera y la escucha al conversar con sus pares; precisa apoyo frecuente para identificar cuándo intervenir, mantener la atención y expresar bien sus ideas sin interrumpir a otras personas.',
    ],
    RA: [
      'Se le dificulta esperar su turno y escuchar durante las conversaciones con sus pares; necesita acompañamiento muy cercano, señales claras y tiempos muy breves para participar sin interrumpir al grupo.',
      'Requiere apoyo muy constante para reconocer y respetar los turnos de habla; responde mejor, con modelado individual, apoyos visuales, consignas breves y oportunidades guiadas para practicar la espera.',
      'Aún participa de manera impulsiva o se desconecta mientras otras personas hablan; conviene ofrecer mediación continua, juegos de turnos y refuerzo positivo para favorecer la escucha y la espera mutua.',
    ],
  },
  {
    key: 'manifiesta oralmente y de manera clara necesidades, emociones, gustos, preferencias e ideas, que construye en la convivencia diaria, y se da a entender apoyándose de distintos lenguajes.',
    S: [
      'Manifiesta con claridad necesidades, emociones, gustos, preferencias e ideas construidas en la convivencia diaria; utiliza distintos lenguajes con autonomía, seguridad y detalle para darse a entender.',
      'Comunica oralmente necesidades, emociones, gustos, preferencias e ideas relacionadas con su convivencia cotidiana; se apoya con autonomía en gestos, imágenes y otros lenguajes para hacerse comprender.',
      'Expresa de manera clara y espontánea lo que necesita, siente, prefiere y piensa a partir de sus experiencias diarias; combina el lenguaje oral con más recursos, y logra darse a entender con seguridad.',
    ],
    E: [
      'Manifiesta oralmente necesidades, emociones, gustos, preferencias e ideas de forma comprensible la mayoría de las veces; utiliza otros lenguajes, y requiere orientación breve para precisar su mensaje.',
      'Comunica necesidades, emociones, gustos e ideas surgidas en la convivencia diaria; generalmente habla con claridad y se apoya en gestos, imágenes u otros lenguajes, cuando necesita hacerse comprender.',
      'Expresa lo que necesita, siente, prefiere o piensa mediante el lenguaje oral y otros recursos; suele darse a entender, aunque requiere preguntas breves o apoyo ocasional para organizar bien sus ideas.',
    ],
    P: [
      'Comienza a manifestar oralmente necesidades, emociones, gustos, preferencias e ideas; necesita modelado, pregunta y tiempo para organizar su mensaje y apoyarse en otros lenguajes para ser comprendido.',
      'Intenta comunicar lo que necesita, siente, le gusta o piensa durante la convivencia diaria; avanza con ejemplos, opciones visuales claras y acompañamiento frecuente para expresarse con mayor claridad.',
      'Ensaya formas orales, gestuales y visuales para expresar necesidades, emociones, gustos e ideas; requiere apoyo frecuente para ampliar su mensaje, ordenar lo que quiere decir y darse a entender mejor.',
    ],
    RA: [
      'Se le dificulta expresar oralmente necesidades, emociones, gustos, preferencias e ideas y darse a entender; necesita apoyo cercano, apoyos visuales, modelado simple y tiempo suficiente para responder.',
      'Requiere acompañamiento constante para comunicar lo que necesita, siente, prefiere o piensa; ya responde mejor con preguntas sencillas, imágenes, gestos y oportunidades breves de expresión individual.',
      'Aún presenta dificultad para organizar y comunicar sus necesidades, emociones, gustos e ideas; conviene ofrecer mediación continua, recursos visuales y modelos breves que faciliten su expresión oral.',
    ],
  },
  {
    key: 'de manera oral, expresa ideas completas sobre necesidades, vivencias, emociones, gustos, preferencias y saberes a distintas personas, combinando los lenguajes.',
    optionLabels: [
      'Enfoque Integral (Proceso de Comunicación)',
      'Enfoque en Convivencia y Diálogo',
      'Enfoque en Variedad Lingüística y Contexto',
    ],
    S: [
      'Expresa con claridad e ideas completas sus emociones, vivencias y gustos a diferentes personas. Combina gestos y palabras de forma fluida y espontánea para hacerse entender.',
      'Comparte con seguridad sus saberes y vivencias en asamblea. Organiza sus ideas de manera lógica, utilizando lenguaje verbal y corporal para integrarse de forma activa al grupo.',
      'Explica con detalle sus emociones, gustos y saberes adaptando su lenguaje a diferentes interlocutores. Combina recursos gráficos y gestuales para enriquecer sus explicaciones.',
    ],
    E: [
      'Comunica sus necesidades, emociones y gustos usando frases claras frente a sus compañeros y docentes. Apoya su lenguaje oral con gestos o imágenes al compartir sus ideas.',
      'Participa en conversaciones expresando sus preferencias y vivencias con oraciones sencillas pero comprensibles. Logra transmitir sus necesidades a distintos adultos del preescolar.',
      'Logra transmitir sus necesidades e ideas completas en situaciones cotidianas. Usa el lenguaje oral y gestual de forma adecuada para relacionarse con compañeros y docentes.',
    ],
    P: [
      'Expresa necesidades y gustos mediante palabras aisladas o frases cortas. Requiere preguntas guía de la docente para estructurar ideas completas sobre lo que siente o piensa.',
      'Comparte sus vivencias personales solo cuando se le cuestiona directamente. Su discurso oral es breve y confía principalmente en el lenguaje corporal para hacerse comprender.',
      'Menciona sus gustos y emociones de forma esporádica. Le cuesta trabajo estructurar relatos completos sobre sus vivencias sin el apoyo de imágenes o del adulto.',
    ],
    RA: [
      'Presenta dificultad para comunicar sus emociones o vivencias de forma oral. Recurre únicamente a señas o llanto, necesitando acompañamiento constante para expresarse.',
      'Muestra timidez o aislamiento al intentar comunicar sus saberes o gustos. Se le dificulta usar el lenguaje verbal para manifestar necesidades básicas dentro del aula.',
      'Depende del adulto para interpretar lo que necesita o siente. Rara vez expresa sus preferencias de forma oral y evita participar en dinámicas de comunicación grupal.',
    ],
  },
]

function overrideForPda(pdaTexto) {
  const key = normalize(pdaTexto).toLowerCase()
  const found = PDA_OVERRIDES.find((item) => key.includes(item.key) || item.key.includes(key))
  if (!found) return null
  return {
    S: found.S,
    E: found.E,
    P: found.P,
    RA: found.RA,
    optionLabels: found.optionLabels || null,
  }
}

export function getOptionLabelsForPda(pdaTexto) {
  const fixed = overrideForPda(pdaTexto)
  return fixed?.optionLabels || null
}

/** Opciones finales: guardadas en descState, o generadas por PDA. */
export function getOpcionesParaPda(pdaTexto, descState) {
  const base = buildOpcionesParaPda(pdaTexto)
  const saved = descState?.opciones
  if (!saved || typeof saved !== 'object') return base
  const codes = ['S', 'E', 'P', 'RA']
  const out = { ...base }
  for (const code of codes) {
    const list = saved[code]
    if (Array.isArray(list) && list.length >= 3) {
      out[code] = list.slice(0, 3).map((t) => String(t || '').trim())
    }
  }
  return out
}

export function mergeDescripcionState(pdaTexto, saved) {
  const base = defaultDescripcionState(pdaTexto)
  if (!saved || typeof saved !== 'object') return base
  const opciones = getOpcionesParaPda(pdaTexto, saved)
  const codes = ['S', 'E', 'P', 'RA']
  const slots = {}
  for (const code of codes) {
    slots[code] = { ...base[code], ...(saved[code] || {}) }
  }
  return { opciones, ...slots }
}

function getExt(nivel) {
  const cfg = getActiveNivelesConfig()
  return cfg.extensiones?.[nivel] || cfg.extensiones?.E || []
}

function finish(text, extensions) {
  let t = normalize(text).replace(/\s+([.!?…,;:])/g, '$1')
  const pool = [...(extensions || []), ...MICRO, ...LONG_FILL]

  let guard = 0
  while (t.length < MIN_CHARS && guard < 8) {
    guard += 1
    let progressed = false
    const room = MAX_CHARS - t.length
    if (room < 10) break
    for (const chunk of pool) {
      const piece = normalize(chunk)
      if (!piece) continue
      if (t.includes(piece.replace(/\.$/, ''))) continue
      if (/en el aula\.?$/i.test(t) && /en el aula/i.test(piece)) continue
      const candidate = normalize(`${t} ${piece}`)
      if (candidate.length <= MAX_CHARS) {
        t = candidate
        progressed = true
        break
      }
      if (room >= 24) {
        const clipped = clipWord(` ${piece}`, room)
        if (clipped.trim().length >= 18) {
          const next = normalize(t + clipped)
          if (next.length <= MAX_CHARS && next.length > t.length) {
            t = next
            progressed = true
            break
          }
        }
      }
    }
    if (!progressed) break
  }

  if (t.length > MAX_CHARS) t = clipWord(t, MAX_CHARS)
  if (!/[.!?…]$/.test(t) && t.length < MAX_CHARS) t = `${t}.`
  if (t.length > MAX_CHARS) t = clipWord(t, MAX_CHARS)

  if (t.length < MIN_CHARS && t.endsWith('.')) {
    const base = t.slice(0, -1)
    for (const x of [' en el aula.', ' del periodo.', ' con evidencia.', ' hoy en clase.', ' en el grupo.']) {
      const next = base + x
      if (next.length >= MIN_CHARS && next.length <= MAX_CHARS) {
        t = next
        break
      }
    }
  }

  if (t.length > MAX_CHARS) t = clipWord(t, MAX_CHARS)
  if (!/[.!?…]$/.test(t) && t.length < MAX_CHARS) t = `${t}.`
  if (t.length > MAX_CHARS) t = clipWord(t, MAX_CHARS)
  return t
}

/**
 * Apertura según nivel (antes del punto): no afirma logro en P/RA.
 * S: verbo conjugado del PDA · E/P/RA: infinitivo con matiz de avance/ensayo/dificultad.
 */
function buildOpening(raw, nivel, variant, restBudget) {
  const { verb, rest } = splitVerbRest(raw)
  const inf = toInfinitive(verb)
  const r = shrinkNucleo(rest, restBudget)
  const cfg = getActiveNivelesConfig()
  const list = cfg.aperturas?.[nivel] || cfg.aperturas?.E || ['{verb} {rest}']
  const tpl = list[variant % list.length] || list[0]
  const filled = tpl
    .split('{verb}').join(verb)
    .split('{inf}').join(inf)
    .split('{rest}').join(r)
  return capitalizar(filled)
}

/** Une apertura (nivel) + cierre pedagógico (después del punto). */
function craftLevel(raw, nivel, variant, after, extensions) {
  const afterN = normalize(after)
  const budgets = [100, 90, 80, 70, 60, 50, 42]
  let t = ''
  for (const b of budgets) {
    const opening = buildOpening(raw, nivel, variant, b)
    const text = normalize(`${opening}. ${afterN}`)
    if (text.length <= MAX_CHARS) {
      t = text
      if (text.length >= MIN_CHARS - 25) break
    }
  }
  if (!t) {
    const opening = buildOpening(raw, nivel, variant, 40)
    t = clipWord(normalize(`${opening}. ${afterN}`), MAX_CHARS)
  }
  return finish(t, extensions)
}

/**
 * Tres opciones por nivel. Tras el primer punto se mantiene el cierre pedagógico.
 */
export function buildOpcionesParaPda(pdaTexto) {
  const fixed = overrideForPda(pdaTexto)
  if (fixed) return { S: [...fixed.S], E: [...fixed.E], P: [...fixed.P], RA: [...fixed.RA] }

  const raw = nucleoRaw(pdaTexto)
  const cfg = getActiveNivelesConfig()
  const cierres = cfg.cierres || {}
  const codes = ['S', 'E', 'P', 'RA']
  const out = {}
  for (const nivel of codes) {
    const afters = cierres[nivel] || []
    out[nivel] = [0, 1, 2].map((variant) =>
      craftLevel(
        raw,
        nivel,
        variant,
        afters[variant] || afters[0] || 'Se observa en el trabajo del aula.',
        getExt(nivel),
      ),
    )
  }
  return out
}

export function defaultDescripcionState(pdaTexto) {
  const opciones = buildOpcionesParaPda(pdaTexto)
  return {
    opciones,
    S: { optionIndex: 0, useCustom: false, custom: '' },
    E: { optionIndex: 0, useCustom: false, custom: '' },
    P: { optionIndex: 0, useCustom: false, custom: '' },
    RA: { optionIndex: 0, useCustom: false, custom: '' },
  }
}

export function resolveTextoNivel(descState, nivelCode) {
  if (!descState) return ''
  const code = nivelCode === 'L' ? 'S' : nivelCode
  const slot = descState[code] || (code === 'S' ? descState.L : null)
  if (!slot) return ''
  if (slot.useCustom && slot.custom?.trim()) {
    return finish(slot.custom.trim(), getExt(code))
  }
  const opts = descState.opciones?.[code] || descState.opciones?.[nivelCode] || []
  return opts[slot.optionIndex] || opts[0] || ''
}
