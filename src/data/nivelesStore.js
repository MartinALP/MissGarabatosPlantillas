/**
 * Niveles de desempeño (L / E / P / RA) editables + plantillas de texto.
 * Persistencia en localStorage; la generación del Excel usa la versión activa.
 */

export const NIVELES_DEFAULT = [
  { code: 'L', label: 'Logrado', short: 'Nivel 4', color: '#2ecc71', bg: '#A9DFBF', fg: '#1C2833' },
  { code: 'E', label: 'Esperado', short: 'Nivel 3', color: '#82e0aa', bg: '#D5F5E3', fg: '#1C2833' },
  { code: 'P', label: 'Proceso', short: 'Nivel 2', color: '#f1c40f', bg: '#F9E79F', fg: '#1C2833' },
  { code: 'RA', label: 'Requiere apoyo', short: 'Nivel 1', color: '#e74c3c', bg: '#F5B7B1', fg: '#1C2833' },
]

/** Prefijos de apertura. Placeholders: {verb} conjugado, {inf} infinitivo, {rest} resto del PDA. */
export const APERTURAS_DEFAULT = {
  L: ['{verb} {rest}', 'Logra {inf} {rest}', 'Demuestra al {inf} {rest}'],
  E: ['Avanza al {inf} {rest}', 'En lo esperado, suele {inf} {rest}', 'Con guía breve logra {inf} {rest}'],
  P: ['Intenta {inf} {rest}', 'Todavía ensaya {inf} {rest}', 'Con mediación practica {inf} {rest}'],
  RA: ['Aún le cuesta {inf} {rest}', 'Se le dificulta {inf} {rest}', 'Requiere apoyo para {inf} {rest}'],
}

/** Cierres pedagógicos (después del primer punto). Tres variantes por nivel. */
export const CIERRES_DEFAULT = {
  L: [
    'Lo demuestra con autonomía y de forma sostenida en el juego, las rutinas y situaciones nuevas; actúa con seguridad y puede orientar a sus pares.',
    'Se observa con soltura y sin depender del adulto: participa, muestra lo que sabe y lo transfiere a momentos espontáneos del aula preescolar.',
    'Lo hace con constancia, iniciativa y disfrute; consolida el aprendizaje y lo comparte con sus pares de forma natural.',
  ],
  E: [
    'Lo logra en lo esperado la mayoría de las veces, con disposición y solo una guía breve si se complica; responde bien al modelado corto.',
    'Mantiene un ritmo adecuado, pide ayuda cuando la necesita y retoma la tarea con acompañamiento ligero del adulto.',
    'Cumple lo esperado del PDA con apoyo ocasional: sigue consignas claras, practica con material concreto y muestra avance estable en el aula.',
  ],
  P: [
    'Está en proceso: lo intenta con interés, aunque aún requiere mediación frecuente, ensayo y juegos estructurados para sostener la acción en clase.',
    'Avanza con modelado, material concreto y consignas en pasos pequeños; la observación cercana ayuda a ajustar el apoyo.',
    'Participa de forma intermitente y necesita recordatorios amables, práctica diaria y un clima de aula paciente y seguro.',
  ],
  RA: [
    'Requiere apoyo cercano y sostenido: se le dificulta completar la acción sin mediación constante, metas pequeñas y un entorno seguro y predecible.',
    'Necesita acompañamiento individualizado, tiempos flexibles y vínculo escuela-familia para ensayar con calma y sin presión.',
    'Conviene un plan sencillo, mediación adulta continua y evidencias breves que permitan celebrar avances mínimos del periodo.',
  ],
}

export const EXT_DEFAULT = {
  L: [
    'Se documenta como logro consolidado del periodo.',
    'La evidencia se recoge en juego y rutinas diarias.',
    'Transfiere lo aprendido a momentos espontáneos.',
  ],
  E: [
    'Se observa en la mayoría de las experiencias del día.',
    'Con práctica breve suele sostener el avance.',
    'La evidencia aparece en juego dirigido y libre.',
  ],
  P: [
    'Conviene modelado corto y ensayo con material concreto.',
    'Se sugiere observar en juegos de pequeño grupo.',
    'Avanza cuando la consigna se parte en pasos simples.',
  ],
  RA: [
    'Se recomienda plan sencillo y seguimiento cercano.',
    'Es clave alinear escuela y familia con metas pequeñas.',
    'Un ambiente seguro favorece que se anime a intentar.',
  ],
}

const STORAGE_KEY = 'missgarabatos.nivelesDesempeno.v1'

function clone(x) {
  return JSON.parse(JSON.stringify(x))
}

export function getDefaultNivelesConfig() {
  return {
    niveles: clone(NIVELES_DEFAULT),
    aperturas: clone(APERTURAS_DEFAULT),
    cierres: clone(CIERRES_DEFAULT),
    extensiones: clone(EXT_DEFAULT),
    pdaAjustes: {},
  }
}

export function getActiveNivelesConfig() {
  if (typeof localStorage === 'undefined') return getDefaultNivelesConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultNivelesConfig()
    const parsed = JSON.parse(raw)
    const def = getDefaultNivelesConfig()
    return {
      niveles: Array.isArray(parsed.niveles) && parsed.niveles.length ? parsed.niveles : def.niveles,
      aperturas: { ...def.aperturas, ...(parsed.aperturas || {}) },
      cierres: { ...def.cierres, ...(parsed.cierres || {}) },
      extensiones: { ...def.extensiones, ...(parsed.extensiones || {}) },
      pdaAjustes: parsed.pdaAjustes && typeof parsed.pdaAjustes === 'object' ? parsed.pdaAjustes : {},
    }
  } catch {
    return getDefaultNivelesConfig()
  }
}

export function saveNivelesConfig(cfg) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export function resetNivelesConfig() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function hasCustomNiveles() {
  if (typeof localStorage === 'undefined') return false
  return Boolean(localStorage.getItem(STORAGE_KEY))
}

export function getActiveNiveles() {
  return getActiveNivelesConfig().niveles
}
