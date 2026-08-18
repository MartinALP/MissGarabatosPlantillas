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
  {
    key: 'cuenta objetos y elementos de su entorno en su lengua materna con diversos propósitos.',
    optionLabels: [
      'Enfoque en Principios de Conteo (Correspondencia y Cardinalidad)',
      'Enfoque en Uso Práctico y Resolución de Problemas',
      'Enfoque en Rango Numérico y Organización',
    ],
    S: [
      'Cuenta colecciones de objetos en su entorno respetando el orden estable y la correspondencia uno a uno. Dice la cantidad total al finalizar con diversos propósitos.',
      'Emplea el conteo de forma autónoma para resolver problemas prácticos del aula (repartir, comparar o verificar materiales), explicando cuántos elementos hay.',
      'Organiza y cuenta colecciones variadas de su entorno de manera precisa. Mantiene el control del conteo oral adaptándose a diferentes tipos de objetos.',
    ],
    E: [
      'Cuenta elementos de su entorno con apoyo de conteo oral. Asigna un número a cada objeto y logra decir cuántos hay en total en colecciones pequeñas.',
      'Utiliza el conteo oral para responder a preguntas cotidianas del grupo. Identifica la cantidad de objetos en su entorno apoyándose en la manipulación directa.',
      'Cuenta objetos del salón siguiendo una estrategia propia (alinear o señalar). Determina el total de elementos en su lengua materna en situaciones de juego.',
    ],
    P: [
      'Muestra interés por contar elementos del aula, pero omite o repite números al señalar. Requiere apoyo para determinar la cantidad total de una colección.',
      'Cuenta colecciones pequeñas solo cuando la docente se lo indica. Se distrae al manipular los elementos y pierde la secuencia numérica durante el ejercicio.',
      'Cuenta los primeros elementos de una colección con precisión, pero pierde el seguimiento al aumentar la cantidad de objetos. Requiere conteo guiado.',
    ],
    RA: [
      'Dice la serie numérica de forma memorística sin relacionarla con los objetos que señala. Se le dificulta realizar el conteo en actividades cotidianas.',
      'Muestra dificultad para iniciar el conteo de objetos de su entorno. Depende del modelado constante del adulto para intentar contar colecciones.',
      'Se le dificulta seguir la secuencia numérica oral al señalar objetos. Muestra desinterés o frustración al intentar realizar actividades de conteo.',
    ],
  },
  {
    key: 'propone, de manera colaborativa, formas de resolver situaciones cotidianas e imaginarias que involucran acciones de agregar, juntar, quitar, separar, comparar e igualar cantidades.',
    optionLabels: [
      'Enfoque en Resolución de Problemas y Colaboración',
      'Enfoque en Razonamiento y Acciones Sobre Colecciones',
      'Enfoque en Uso de Estrategias y Comunicación de Resultados',
    ],
    S: [
      'Propone con iniciativa soluciones para agregar, quitar o igualar cantidades en problemas cotidianos. Trabaja en equipo y explica con claridad cómo resolvió el reto.',
      'Identifica con facilidad acciones de comparar o igualar elementos en juegos. Aporta ideas lógicas al grupo para determinar dónde hay más, menos o la misma cantidad.',
      'Diseña estrategias novedosas junto a sus compañeros para igualar o comparar cantidades en el aula. Comunica con seguridad el proceso seguido y el resultado final.',
    ],
    E: [
      'Colabora con sus pares para resolver situaciones de juntar, separar o comparar cantidades. Usa material concreto y comparte sus ideas para encontrar el resultado.',
      'Resuelve problemas imaginarios y cotidianos aplicando acciones de juntar y quitar. Escucha las propuestas de sus compañeros y valida el resultado mediante conteo.',
      'Acepta las ideas del grupo para resolver retos cotidianos de cantidades. Aplica acciones de agregar o quitar apoyándose en la manipulación de objetos del entorno.',
    ],
    P: [
      'Participa en la resolución de problemas numéricos cuando trabaja en equipo, pero requiere apoyo directo del adulto para entender si debe agregar o quitar objetos.',
      'Comprende problemas sencillos de agregar o quitar objetos, pero se le dificulta expresar su estrategia o colaborar activamente en la propuesta final del equipo.',
      'Aplica acciones sobre las colecciones por ensayo y error. Requiere preguntas guía de la docente para identificar si la solución planteada fue la correcta.',
    ],
    RA: [
      'Le cuesta trabajo integrarse al trabajo colaborativo para resolver problemas de cantidades. Depende del modelado constante para manipular materiales concretos.',
      'Presenta dificultad para comprender las acciones de agregar o quitar elementos. Muestra desinterés o frustración durante las dinámicas de resolución en equipo.',
      'Muestra dificultad para manipular objetos con una intención numérica. Le cuesta trabajo seguir las dinámicas grupales que involucran transformar cantidades.',
    ],
  },
  {
    key: 'comparte con sus pares información personal acerca de sus gustos, familia, emociones, identidad, entre otros.',
    optionLabels: [
      'Enfoque en Socialización e Identidad',
      'Enfoque en Emociones y Convivencia',
      'Enfoque en Diálogo Abierto y Autoestima',
    ],
    S: [
      'Comparte con fluidez y seguridad aspectos de su identidad, gustos y familia con sus compañeros. Escucha con atención y respeta la información personal de sus pares.',
      'Reconoce y expresa con claridad sus emociones y preferencias ante sus compañeros. Promueve un clima de confianza al intercambiar vivencias familiares.',
      'Explica con orgullo y detalle aspectos de su familia, identidad y preferencias. Muestra apertura para dialogar sobre lo que le hace único frente a otros.',
    ],
    E: [
      'Expresa datos sobre sus gustos, emociones y familia al interactuar con otros niños. Muestra confianza al hablar de su historia personal en el aula.',
      'Comunica cómo se siente y qué le gusta en dinámicas grupales. Logra establecer vínculos con otros niños al compartir intereses e ideas personales.',
      'Participa de manera voluntaria compartiendo información de su vida cotidiana y familia. Reconoce similitudes y diferencias entre sus gustos y los de sus pares.',
    ],
    P: [
      'Menciona aspectos sobre sus gustos o familia solo cuando se le cuestiona directamente. Requiere apoyo de preguntas guía para conversar con sus pares.',
      'Identifica sus gustos personales, pero se le dificulta expresar vivencias familiares ante el grupo. Participa de forma breve durante las asambleas.',
      'Relata breves aspectos de sus gustos o juegos preferidos. Le cuesta mantener una conversación continua sobre su historia personal sin el uso de imágenes.',
    ],
    RA: [
      'Le cuesta trabajo compartir información sobre sí mismo o su familia. Muestra timidez o reserva al participar en dinámicas de intercambio personal.',
      'Presenta dificultad para nombrar sus emociones o gustos con sus pares. Muestra desinterés por escuchar o compartir detalles de su entorno familiar.',
      'Depende del acompañamiento directo del adulto para verbalizar datos sencillos de su identidad o familia. Evade hablar sobre sus emociones con el grupo.',
    ],
  },
  {
    key: 'se expresa y participa con libertad y respeto en diversas situaciones y contextos, favoreciendo una cultura de paz y la convivencia pacífica en un marco de inclusión y diversidad.',
    optionLabels: [
      'Enfoque en Participación e Inclusión',
      'Enfoque en Resolución Pacífica y Cultura de Paz',
      'Enfoque en Respeto a la Diversidad y Expresión Libre',
    ],
    S: [
      'Expresa sus opiniones con libertad y respeto en diversas situaciones. Promueve la integración de todos sus compañeros favoreciendo un ambiente inclusivo y pacífico.',
      'Utiliza el diálogo constante para resolver diferencias dentro del aula. Muestra empatía y promueve acuerdos de convivencia que respetan la diversidad del grupo.',
      'Manifiesta sus ideas con total seguridad y escucha de forma atenta y respetuosa las propuestas del grupo, valorando las diferencias individuales.',
    ],
    E: [
      'Participa en actividades grupales compartiendo sus ideas de forma respetuosa. Incluye a sus pares en juegos y dinámicas cotidianas del salón sin hacer distinciones.',
      'Expresa sus opiniones respetando los turnos de participación. Acude al diálogo para solucionar pequeños conflictos y acepta las diferencias de los demás.',
      'Expresa lo que piensa de manera clara y amable en asambleas. Participa en contextos diversos respetando los acuerdos establecidos para la convivencia.',
    ],
    P: [
      'Expresa sus puntos de vista con apoyo docente. Muestra apertura para integrarse en juegos colaborativos, aunque requiere guía para respetar normas de inclusión.',
      'Muestra comprensión básica sobre el respeto a sus pares, pero se le dificulta mantener el diálogo pacífico cuando surge un conflicto en el juego.',
      'Logra manifestar sus desacuerdos de forma respetuosa con mediación de la docente. Participa en dinámicas grupales de forma esporádica.',
    ],
    RA: [
      'Se le dificulta participar en dinámicas grupales o expresar sus ideas. Presenta conductas que obstaculizan la convivencia pacífica con sus compañeros.',
      'Depende totalmente de la intervención del adulto para solucionar desacuerdos. Muestra resistencia para compartir e integrarse con distintos compañeros.',
      'Le cuesta expresar sus ideas en público y respetar la participación de los demás. Evade participar en actividades colectivas e inclusivas.',
    ],
  },
  {
    key: 'intercambia experiencias y vivencias con sus pares y otras personas, acerca de las diferentes formas de actuar, expresar, nombrar y controlar las emociones.',
    optionLabels: [
      'Enfoque en Autorregulación y Diálogo',
      'Enfoque en Expresión y Empatía',
      'Enfoque en Convivencia y Reflexión',
    ],
    S: [
      'Intercambia con fluidez vivencias personales sobre cómo nombra, expresa y autorregula sus emociones. Escucha a otros y propone estrategias efectivas de autocontrol.',
      'Identifica y valora las distintas formas en que sus pares expresan sus estados de ánimo. Explica con claridad sus propias estrategias de autorregulación emocional.',
      'Promueve el intercambio de ideas sobre el manejo de emociones en el aula. Propone formas pacíficas de actuar ante el enojo o la frustración junto a sus pares.',
    ],
    E: [
      'Comparte con sus compañeros cómo se siente y qué hace para calmarse. Escucha con atención la manera en que otros expresan y nombran sus emociones.',
      'Dialoga en grupo sobre situaciones que le provocan diversas emociones. Reconoce y respeta las diferentes reacciones emocionales de sus compañeros.',
      'Participa de forma activa conversando sobre sus experiencias emocionales. Aplica técnicas sencillas aprendidas en clase para regular sus reacciones.',
    ],
    P: [
      'Menciona cómo se siente o actúa solo cuando la docente le pregunta directamente. Le cuesta identificar estrategias para controlar sus emociones durante un conflicto.',
      'Identifica emociones básicas (alegría, tristeza, enojo), pero se le dificulta expresar verbalmente qué acciones realiza para autorregularse o calmarse.',
      'Comparte experiencias sobre sus emociones de manera breve. Requiere acompañamiento para reflexionar sobre la forma adecuada de actuar al enojarse o frustrarse.',
    ],
    RA: [
      'Presenta dificultad para nombrar sus emociones o hablar sobre sus vivencias. Se le dificulta mantener el autocontrol y evita participar en diálogos emocionales.',
      'Rara vez expresa lo que siente o cómo reacciona ante diversas vivencias. Depende de la intervención del adulto para identificar o regular sus emociones.',
      'Muestra resistencia o desinterés al hablar de sus vivencias emocionales. Se le dificulta reconocer cómo controlar sus impulsos en situaciones cotidianas.',
    ],
  },
  {
    key: 'dice lo que le molesta o incomoda para evitar reaccionar con gritos o agresión; dialoga y respeta las reglas para una mejor convivencia.',
    optionLabels: [
      'Enfoque en Autorregulación y Comunicación Directa',
      'Enfoque en Resolución Pacífica de Conflictos',
      'Enfoque en Acuerdos y Convivencia Armónica',
    ],
    S: [
      'Expresa con claridad y calma aquello que le incomoda, evitando gritos o agresiones. Dialoga de forma autónoma para resolver desacuerdos y respeta las reglas.',
      'Utiliza la palabra como herramienta principal ante situaciones que le molestan. Promueve el diálogo pacífico con sus pares y cumple siempre las reglas.',
      'Identifica a tiempo sus emociones de molestia y las comunica con respeto. Respeta de manera constante las reglas y propone ideas para la buena convivencia.',
    ],
    E: [
      'Verbaliza lo que le molesta antes de reaccionar de forma impulsiva. Utiliza el diálogo para llegar a acuerdos y sigue las normas establecidas en el aula.',
      'Dice de forma comprensible cuando algo no le gusta sin agredir a otros. Escucha las razones de sus compañeros y acepta los acuerdos del grupo.',
      'Manifiesta su incomodidad mediante frases sencillas evitando conductas agresivas. Acata las normas del aula y participa de forma tranquila en las dinámicas.',
    ],
    P: [
      'Menciona su molestia con apoyo docente cuando se siente frustrado. Requiere recordatorios constantes para no gritar y seguir las reglas de convivencia.',
      'Intenta expresar su incomodidad verbalmente, pero suele elevar la voz o frustrarse. Depende del acompañamiento adulto para llegar a un diálogo pacífico.',
      'Expresa su enojo o incomodidad únicamente cuando la docente interviene. Muestra avances para respetar las reglas, aunque a veces actúa con impulsividad.',
    ],
    RA: [
      'Reacciona con llanto, gritos o agresión ante situaciones de incomodidad. Se le dificulta usar las palabras para dialogar y le cuesta respetar las reglas.',
      'Muestra dificultad para controlar sus reacciones impulsivas al enojarse. Evade el diálogo con sus pares y se le complica acatar las normas cotidianas.',
      'Presenta constantes conductas de grito o empuje al sentirse incomodado. Se le dificulta integrarse al diálogo y requiere mediación para seguir las reglas.',
    ],
  },
  {
    key: 'conversa y opina sobre diferentes temas y con varias personas interlocutoras.',
    optionLabels: [
      'Enfoque en Fluidez Dialógica e Interacción',
      'Enfoque en Argumentación e Intercambio de Ideas',
      'Enfoque en Participación Abierta y Variedad de Contextos',
    ],
    S: [
      'Conversa y opina con seguridad sobre diversos temas. Mantiene diálogos fluidos adaptando su lenguaje con distintos compañeros, docentes y adultos.',
      'Argumenta sus puntos de vista con claridad sobre temas variados. Escucha con respeto la opinión de los demás y retroalimenta la conversación.',
      'Participa activamente en asambleas y debates escolares. Muestra confianza para opinar y conversar en variados contextos e interlocutores.',
    ],
    E: [
      'Expresa sus opiniones e ideas durante conversaciones grupales. Escucha y responde de manera coherente al interactuar con diferentes personas.',
      'Comparte lo que piensa sobre situaciones del aula o cuentos. Logra intercambiar opiniones respetando los turnos para hablar con sus pares.',
      'Se integra a conversaciones sobre temas cotidianos. Logra manifestar sus ideas de forma comprensible tanto con sus compañeros como con el personal de la escuela.',
    ],
    P: [
      'Emite opiniones breves sobre temas de su interés. Le cuesta trabajo mantener una conversación fluida cuando interactúa con personas poco conocidas.',
      'Expresa lo que le gusta o disgusta mediante frases cortas. Requiere preguntas guía del docente para ampliar sus respuestas al conversar.',
      'Participa de forma esporádica manifestando opiniones sencillas. Tiende a conversar solo con su círculo cercano de compañeros.',
    ],
    RA: [
      'Muestra timidez o dificultad para iniciar o mantener conversaciones. Evade dar su opinión en dinámicas grupales o al hablar con otros adultos.',
      'Se le dificulta formular respuestas verbales completas ante un tema. Depende de la intervención directa del adulto para comunicar su opinión.',
      'Presenta aislamiento o reserva al momento de dialogar. Muestra resistencia para expresar sus opiniones frente a distintas personas del entorno escolar.',
    ],
  },
  {
    key: 'mantiene el control y equilibrio de los distintos segmentos corporales tanto en situaciones estáticas (sostenerse en un pie, hacer una figura con el cuerpo, entre otras) como en movimientos sin desplazamiento (girar, brincar, etcétera).',
    optionLabels: [
      'Enfoque en Postura y Control Corporal',
      'Enfoque en Coordinación Motriz y Fluidez',
      'Enfoque en Esquema Corporal y Dominio Espacial',
    ],
    S: [
      'Mantiene el equilibrio corporal con total estabilidad en posturas estáticas y movimientos en su lugar. Ajusta sus segmentos corporales con precisión y seguridad.',
      'Coordina sus segmentos corporales con fluidez al realizar retos de equilibrio estático y dinámico sin desplazamiento. Muestra gran dominio de su centro de gravedad.',
      'Explora y sostiene con facilidad diversas figuras corporales estáticas. Salta y gira en su lugar con excelente firmeza y control de cada segmento de su cuerpo.',
    ],
    E: [
      'Logra sostenerse en un pie o hacer figuras con su cuerpo de forma estable. Realiza giros y brincos en su lugar manteniendo el control de su cuerpo.',
      'Ejecuta giros, brincos y posturas corporales coordinadas. Domina el control de sus brazos y piernas al mantenerse en posiciones estáticas por un tiempo adecuado.',
      'Mantiene el control corporal al hacer posturas indicadas y brincos sencillos. Reconoce cómo ajustar su cuerpo para no caerse en un solo pie.',
    ],
    P: [
      'Mantiene el equilibrio por breves momentos en posturas estáticas. Requiere apoyo visual o apoyo docente para no tambalearse al girar o brincar en su lugar.',
      'Muestra avances en el control de su cuerpo, pero pierde la postura al brincar o girar. Requiere recordatorios para utilizar sus brazos como apoyo de equilibrio.',
      'Logra realizar las posiciones estáticas de forma rápida sin sostener la postura. Presenta constante balanceo al intentar girar o brincar sin desplazarse.',
    ],
    RA: [
      'Presenta dificultad para sostener el equilibrio en un solo pie o hacer posturas. Pierde el control corporal al brincar o realizar giros sin desplazamiento.',
      'Le cuesta trabajo controlar sus movimientos sin desplazamiento. Se tambalea con facilidad al intentar posturas estáticas o saltos sencillos en su lugar.',
      'Depende del soporte físico del adulto para sostenerse en un solo pie. Evade o muestra inseguridad al realizar movimientos que impliquen equilibrio en su lugar.',
    ],
  },
  {
    key: 'explora los espacios físicos de su casa, escuela y comunidad para identificar las zonas de seguridad que le permitan mantener su integridad en caso de situaciones de riesgo.',
    optionLabels: [
      'Enfoque en Zonas de Seguridad y Prevención',
      'Enfoque en Reconocimiento de Riesgos y Entorno',
      'Enfoque en Autocuidado y Conciencia Espacial',
    ],
    S: [
      'Explora autónomamente su entorno identificando zonas de seguridad y situaciones de riesgo. Reconoce conductas de autocuidado para no lastimarse ni lastimar a otros.',
      'Reconoce con precisión lugares seguros y conductas de riesgo en la casa, escuela y comunidad. Expresa formas de protegerse y cuidar a sus pares ante el peligro.',
      'Muestra alto sentido de autocuidado al ubicarse en zonas seguras. Promueve comportamientos preventivos en el grupo para mantener la integridad de todos.',
    ],
    E: [
      'Identifica zonas de seguridad en la escuela y su casa. Reconoce acciones o comportamientos que representan un riesgo para su integridad y la de sus compañeros.',
      'Explora los espacios de la escuela identificando áreas seguras. Menciona acciones peligrosas y comprende cómo evitar accidentes en sus actividades cotidianas.',
      'Sigue las indicaciones para ubicarse en zonas de seguridad ante emergencias. Identifica comportamientos que pueden lastimar a otros en su entorno escolar.',
    ],
    P: [
      'Identifica zonas de seguridad básicas con ayuda del docente. Le cuesta prever situaciones o comportamientos en los que puede lastimarse durante el juego.',
      'Ubica áreas seguras solo mediante preguntas guía. Muestra comprensión parcial sobre acciones que pueden causar accidentes a él o a sus compañeros.',
      'Reconoce algunas zonas seguras en la escuela, pero suele realizar acciones de riesgo durante el juego. Requiere recordatorios sobre normas de seguridad.',
    ],
    RA: [
      'Presenta dificultad para reconocer lugares seguros en su entorno. Muestra conductas de riesgo de forma recurrente y le cuesta identificar los peligros.',
      'Le cuesta trabajo identificar zonas de riesgo en los espacios escolares. Depende de la supervisión constante del adulto para evitar lastimarse.',
      'Muestra desinterés por ubicar zonas de seguridad. Le cuesta asociar ciertos comportamientos o acciones impulsivas con el peligro de un accidente.',
    ],
  },
  {
    key: 'identifica acciones, situaciones y comportamientos en los que puede lastimarse o lastimar a las demás personas.',
    optionLabels: [
      'Enfoque en Prevención y Autocuidado',
      'Enfoque en Empatía y Cuidado Mutuo',
      'Enfoque en Conciencia de Riesgo y Consecuencias',
    ],
    S: [
      'Reconoce con precisión acciones y situaciones de riesgo en el aula y patio. Propone medidas preventivas para cuidar su integridad y la de sus compañeros.',
      'Explica con claridad cómo ciertas acciones impulsivas pueden lastimar a sus pares. Promueve de forma activa hábitos seguros de convivencia y juego.',
      'Anticipa las consecuencias de diversos comportamientos peligrosos. Muestra constante autocontrol para desenvolverse de manera segura en distintos espacios.',
    ],
    E: [
      'Identifica comportamientos que pueden causarle daño o lastimar a otros. Modifica sus acciones al reflexionar sobre los riesgos presentes en el entorno.',
      'Reconoce situaciones en las que un compañero o él mismo pueden salir lastimados. Acepta y pone en práctica las indicaciones de seguridad del grupo.',
      'Menciona comportamientos específicos que generan accidentes en la escuela. Elige realizar actividades seguras para mantener su bienestar y el de otros.',
    ],
    P: [
      'Distingue acciones peligrosas cotidianas cuando la docente se las señala. Requiere apoyo para prever las consecuencias de sus comportamientos en el juego.',
      'Identifica riesgos evidentes de lastimarse a sí mismo, pero se le dificulta reconocer cuando sus acciones pueden perjudicar a las demás personas.',
      'Comprende de forma parcial las consecuencias de sus actos. Requiere recordatorios constantes sobre qué conductas ponen en peligro al grupo.',
    ],
    RA: [
      'Le cuesta trabajo identificar situaciones de peligro en su entorno. Presenta conductas impulsivas o de riesgo de forma constante durante las actividades.',
      'Muestra desinterés por prever accidentes en sus juegos. Depende del acompañamiento directo del adulto para evitar lastimarse o dañar a otros.',
      'Presenta dificultad para relacionar un comportamiento peligroso con un posible accidente. Se expone a situaciones de riesgo sin medir consecuencias.',
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
