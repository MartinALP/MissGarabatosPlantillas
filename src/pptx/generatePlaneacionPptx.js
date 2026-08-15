import PptxGenJS from 'pptxgenjs'
import { saveAs } from 'file-saver'
import { getCampo, getContenido, getPda, parsePdaKey } from '../data/catalogoFase2'
import { EJES_ARTICULADORES, EJE_FILL_ON, EJE_FILL_OFF, EJE_TEXT_ON, EJE_TEXT_OFF } from '../data/ejesArticuladores'

const FONT = 'Century Gothic'

const CAMPO_PASTEL = {
  lenguajes: { fill: 'F5CBA7', text: '6E2C00' },
  saberes: { fill: 'AED6F1', text: '1A5276' },
  etica: { fill: 'A9DFBF', text: '145A32' },
  humano: { fill: 'D2B4DE', text: '4A235A' },
}


function buildItems(pdaKeys) {
  return pdaKeys.map((key) => {
    const { campoId, contenidoId, pdaId } = parsePdaKey(key)
    return {
      campo: getCampo(campoId),
      contenido: getContenido(campoId, contenidoId),
      pda: getPda(campoId, contenidoId, pdaId),
    }
  }).filter((x) => x.campo && x.pda)
}

export async function generatePlaneacionPptx({ meta = {}, pdaKeys = [], modalidad, porDia = false, ejes = [] }) {
  const items = buildItems(pdaKeys)
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'CARTA', width: 11, height: 8.5 })
  pptx.layout = 'CARTA'
  pptx.author = 'Miss Garabatos'
  pptx.title = `Planeación · ${modalidad?.nombre || 'Modalidad'}`

  addPortada(pptx, meta, modalidad, ejes)
  addPdaSlide(pptx, items)
  if (porDia) {
    addPlantillaPorDia(pptx)
    addCuadroSemana(pptx)
  } else {
    addCuadroModalidad(pptx, modalidad)
    addCuadroSemana(pptx)
  }

  const blob = await pptx.write({ outputType: 'blob' })
  const grupo = String(meta.grupo || 'Grupo').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') || 'Grupo'
  const modo = String(modalidad?.nombre || 'Modalidad').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') || 'Modalidad'
  saveAs(blob, `Planeacion_${grupo}_${modo}.pptx`)
}

function addPortada(pptx, meta, modalidad, ejes = []) {
  const s = pptx.addSlide()
  const M = 0.28
  const W = 10.44
  const edge = { pt: 1.2, color: '8D959B' }
  const cellBorder = [edge, edge, edge, edge]

  s.addShape(pptx.ShapeType.roundRect, {
    x: M, y: 0.18, w: W, h: 0.52, fill: { color: '8E44AD' },
  })
  s.addText('PLANEACIÓN DIDÁCTICA · Fase 2 Preescolar', {
    x: M + 0.12, y: 0.24, w: W - 0.24, h: 0.4, fontSize: 20, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Century Gothic',
  })

  const rows = [
    [
      { text: 'Jardín / Escuela', options: { fill: { color: 'F5EEF8' }, bold: true, fontSize: 11 } },
      { text: meta.escuela || '______________________________', options: { fontSize: 12 } },
      { text: 'CCT', options: { fill: { color: 'F5EEF8' }, bold: true, fontSize: 11 } },
      { text: '________________', options: { fontSize: 12 } },
    ],
    [
      { text: 'Grupo y grado', options: { fill: { color: 'F5EEF8' }, bold: true, fontSize: 11 } },
      { text: meta.grupo || '________________', options: { fontSize: 12 } },
      { text: 'Educadora', options: { fill: { color: 'F5EEF8' }, bold: true, fontSize: 11 } },
      { text: meta.docente || '______________________________', options: { fontSize: 12 } },
    ],
    [
      { text: 'Periodo / duración', options: { fill: { color: 'F5EEF8' }, bold: true, fontSize: 11 } },
      { text: meta.periodo || '________________', options: { fontSize: 12 } },
      { text: 'Modalidad de trabajo', options: { fill: { color: 'F5EEF8' }, bold: true, fontSize: 11 } },
      { text: modalidad?.nombre || '', options: { fontSize: 11, color: '6C3483' } },
    ],
  ]
  s.addTable(rows, {
    x: M, y: 0.82, w: W, colW: [2.2, 3.12, 2.1, 3.02],
    border: [{ pt: 0.5, color: 'D5D8DC' }],
    valign: 'middle',
    fontFace: 'Century Gothic',
    rowH: 0.38,
  })

  function recTitle(t) {
    return {
      text: t,
      options: {
        fill: { color: 'E5E8E8' },
        color: '2C3E50',
        bold: true,
        fontSize: 12,
        align: 'center',
        valign: 'middle',
        border: cellBorder,
      },
    }
  }
  function recBody(hint, fill) {
    return {
      text: hint,
      options: {
        fill: { color: fill },
        color: '7F8C8D',
        italic: true,
        fontSize: 12,
        align: 'left',
        valign: 'top',
        border: cellBorder,
      },
    }
  }
  s.addTable(
    [
      [recTitle('Propósito (llena aquí)'), recTitle('Justificación (llena aquí)')],
      [recBody('Escribe el propósito de esta planeación…', 'FCF3CF'), recBody('¿Por qué es pertinente en tu grupo y comunidad?', 'D5F5E3')],
      [recTitle('Vinculación con la comunidad'), recTitle('Actividades permanentes')],
      [recBody('Entrevistas, reuniones, cierre con familias…', 'D6EAF8'), recBody('Saludo, pase de lista, tiempo de compartir, lavado de manos, refrigerio…', 'FDEBD0')],
      [recTitle('Ajustes razonables'), recTitle('Evaluación formativa')],
      [recBody('Apoyos, mediaciones y adecuaciones para que todas las niñas y los niños participen…', 'E8DAEF'), recBody('Cómo observarás el avance durante las actividades (evidencias, preguntas, registro)…', 'FADBD8')],
    ],
    {
      x: M, y: 2.02, w: W, colW: [W / 2, W / 2],
      border: cellBorder,
      fontFace: FONT,
      rowH: [0.28, 1.12, 0.28, 1.12, 0.28, 1.12],
    },
  )

  s.addText('Ejes articuladores', {
    x: M, y: 6.38, w: W, h: 0.26, fontSize: 13, bold: true, color: '6C3483', align: 'center', fontFace: 'Century Gothic',
  })
  s.addTable(
    [EJES_ARTICULADORES.map((e) => {
      const on = ejes.includes(e)
      return {
        text: e,
        options: {
          fontSize: 9,
          align: 'center',
          valign: 'middle',
          bold: on,
          color: on ? EJE_TEXT_ON : EJE_TEXT_OFF,
          fill: { color: on ? EJE_FILL_ON : EJE_FILL_OFF },
          margin: [0.05, 0.04, 0.05, 0.04],
          border: [{ pt: 1.2, color: '8D959B' }, { pt: 1.2, color: '8D959B' }, { pt: 1.2, color: '8D959B' }, { pt: 1.2, color: '8D959B' }],
        },
      }
    })],
    {
      x: M, y: 6.66, w: W, colW: Array(EJES_ARTICULADORES.length).fill(W / EJES_ARTICULADORES.length),
      border: [{ pt: 1.2, color: '8D959B' }, { pt: 1.2, color: '8D959B' }, { pt: 1.2, color: '8D959B' }, { pt: 1.2, color: '8D959B' }],
      fontFace: FONT,
      valign: 'middle',
      rowH: 0.92,
    },
  )
}

function hexC(c, fallback = '8E44AD') {
  return String(c || fallback).replace('#', '').replace(/^FF/i, '')
}

function wrapLines(text, charsPerLine) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  let lines = 1
  let cur = 0
  for (const w of words) {
    const add = cur === 0 ? w.length : w.length + 1
    if (cur + add > charsPerLine) {
      lines += 1
      cur = w.length
    } else {
      cur += add
    }
  }
  return lines
}

function heightForPdaItem(it) {
  const pda = `${it?.pda?.grado ? `${it.pda.grado}°  ·  ` : ''}${it?.pda?.texto || ''}`
  const pdaH = 0.22 + wrapLines(pda, 58) * 0.18
  const contH = 0.22 + wrapLines(it?.contenido?.nombre, 28) * 0.18
  return Math.min(2.4, Math.max(0.62, pdaH, contH * 0.45))
}

function addPdaSlide(pptx, items) {
  const list = items.length ? items : [{ campo: { nombre: 'Campo', color: '#8E44AD', colorSoft: '#F5EEF8', colorDark: '#6C3483' }, contenido: { nombre: '' }, pda: { texto: 'Sin PDA' } }]
  const HEADER_H = 0.42
  const MAX_H = 8.05
  const pages = []
  let bucket = []
  let used = HEADER_H
  for (const it of list) {
    const h = heightForPdaItem(it)
    if (bucket.length && used + h > MAX_H) {
      pages.push(bucket)
      bucket = []
      used = HEADER_H
    }
    bucket.push(it)
    used += h
  }
  if (bucket.length) pages.push(bucket)

  const headFill = 'E5E8E8'
  const edge = { pt: 1.2, color: '8D959B' }
  const cellBorder = [edge, edge, edge, edge]
  const pad = [0.05, 0.07, 0.05, 0.07]
  const header = [
    { text: 'CAMPOS', options: { fill: { color: headFill }, color: '2C3E50', bold: true, fontSize: 12, align: 'center', border: cellBorder } },
    { text: 'CONTENIDOS', options: { fill: { color: headFill }, color: '2C3E50', bold: true, fontSize: 12, align: 'center', border: cellBorder } },
    { text: 'PDA', options: { fill: { color: headFill }, color: '2C3E50', bold: true, fontSize: 12, align: 'center', border: cellBorder } },
  ]

  pages.forEach((pageItems) => {
    const groups = []
    for (const it of pageItems) {
      const id = it?.campo?.id || it?.campo?.nombre || 'x'
      const last = groups[groups.length - 1]
      if (last && last.id === id) last.rows.push(it)
      else groups.push({ id, campo: it?.campo, rows: [it] })
    }

    const s = pptx.addSlide()
    const body = []
    const rowHs = [HEADER_H]
    for (const g of groups) {
      const pastel = CAMPO_PASTEL[g.id] || { fill: hexC(g.campo?.colorSoft, 'F5EEF8'), text: hexC(g.campo?.colorDark, '4A235A') }
      const n = g.rows.length
      g.rows.forEach((it, i) => {
        const row = []
        if (i === 0) {
          row.push({
            text: g.campo?.nombre || 'Campo',
            options: {
              rowspan: n,
              fill: { color: pastel.fill },
              color: pastel.text,
              bold: true,
              fontSize: 11,
              align: 'center',
              valign: 'middle',
              border: cellBorder,
              margin: pad,
            },
          })
        }
        const contId = it?.contenido?.id || it?.contenido?.nombre
        const prevId = i > 0 ? (g.rows[i - 1]?.contenido?.id || g.rows[i - 1]?.contenido?.nombre) : null
        if (i === 0 || contId !== prevId) {
          let span = 1
          for (let j = i + 1; j < n; j++) {
            const cid = g.rows[j]?.contenido?.id || g.rows[j]?.contenido?.nombre
            if (cid === contId) span += 1
            else break
          }
          row.push({
            text: it?.contenido?.nombre || '',
            options: {
              rowspan: span,
              fill: { color: 'FFFFFF' },
              color: '1C2833',
              fontSize: 10,
              valign: 'middle',
              align: 'justify',
              border: cellBorder,
              margin: pad,
            },
          })
        }
        const grado = it?.pda?.grado ? `${it.pda.grado}°  ·  ` : ''
        row.push({
          text: `${grado}${it?.pda?.texto || ''}`,
          options: {
            fill: { color: 'FFFFFF' },
            fontSize: 10,
            color: '1C2833',
            valign: 'middle',
            align: 'justify',
            border: cellBorder,
            margin: pad,
          },
        })
        body.push(row)
        rowHs.push(heightForPdaItem(it))
      })
    }

    const x = 0.28
    const y = 0.22
    const w = 10.44
    s.addTable([header, ...body], {
      x, y, w, colW: [1.85, 2.85, 5.74],
      border: cellBorder,
      valign: 'middle',
      fontFace: FONT,
      rowH: rowHs,
    })
  })
}

function addCuadroModalidad(pptx, modalidad) {
  const momentos = modalidad?.momentos || [{ titulo: 'Momento', intencion: '' }]
  const x = 0.3
  const y = 0.22
  const w = 10.4
  const line = { pt: 1.5, color: '7F8C8D' }
  const cellBorder = [line, line, line, line]

  momentos.forEach((m) => {
    const s = pptx.addSlide()
    const titulo = String(m.titulo || 'Momento').replace(/^\d+\.\s*/, '')
    s.addTable(
      [
        [
          {
            text: titulo,
            options: {
              colspan: 2,
              fill: { color: 'E5E8E8' },
              color: '2C3E50',
              bold: true,
              fontSize: 20,
              align: 'center',
              valign: 'middle',
              border: cellBorder,
            },
          },
        ],
        [
          {
            text: m.intencion || '',
            options: {
              colspan: 2,
              fill: { color: 'FFFFFF' },
              color: '1C2833',
              fontSize: 14,
              valign: 'top',
              align: 'left',
              border: cellBorder,
            },
          },
        ],
        [
          {
            text: 'MATERIALES',
            options: {
              fill: { color: 'B8E6E0' },
              color: '0E6655',
              bold: true,
              fontSize: 13,
              align: 'center',
              valign: 'middle',
              border: cellBorder,
            },
          },
          {
            text: ' ',
            options: { fill: { color: 'FFFFFF' }, fontSize: 12, border: cellBorder },
          },
        ],
      ],
      {
        x, y, w, colW: [2.2, 8.2],
        border: cellBorder,
        fontFace: FONT,
        rowH: [0.65, 6.35, 1.1],
      },
    )
  })
}

function addCuadroSemana(pptx) {
  const s = pptx.addSlide()
  s.addText('Cronograma', {
    x: 0.3, y: 0.14, w: 10.4, h: 0.32, fontSize: 18, bold: true, color: '2C3E50', align: 'center', fontFace: FONT,
  })

  const dias = [
    { nom: 'Lunes', fill: 'FCF3CF', line: 'F4D03F', head: 'F4D03F' },
    { nom: 'Martes', fill: 'D5F5E3', line: '58D68D', head: '27AE60' },
    { nom: 'Miércoles', fill: 'D6EAF8', line: '5DADE2', head: '2980B9' },
    { nom: 'Jueves', fill: 'FDEBD0', line: 'F0B27A', head: 'E67E22' },
    { nom: 'Viernes', fill: 'F4ECF7', line: 'AF7AC5', head: '8E44AD' },
  ]
  const bloques = [
    { t: 'Actividad', h: 1.78 },
    { t: 'Evidencia / Tarea', h: 1.12 },
  ]
  const gap = 0.1
  const w = 2.0
  const x0 = 0.3
  const cardH = 3.38

  function drawWeek(y0, etiqueta) {
    s.addText(etiqueta, {
      x: 0.3, y: y0 - 0.24, w: 10.4, h: 0.2, fontSize: 11, bold: true, color: '6C3483', fontFace: FONT,
    })
    dias.forEach((d, i) => {
      const x = x0 + i * (w + gap)
      s.addShape(pptx.ShapeType.rect, {
        x, y: y0, w, h: cardH, fill: { color: d.fill }, line: { color: d.line, pt: 1 },
      })
      s.addShape(pptx.ShapeType.rect, {
        x, y: y0, w, h: 0.34, fill: { color: d.head },
      })
      s.addText(d.nom, {
        x, y: y0 + 0.04, w, h: 0.26, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', fontFace: FONT,
      })
      let y = y0 + 0.38
      bloques.forEach((b) => {
        s.addText(b.t, {
          x: x + 0.06, y, w: w - 0.12, h: 0.18, fontSize: 8, bold: true, color: '6C3483', fontFace: FONT,
        })
        s.addShape(pptx.ShapeType.rect, {
          x: x + 0.06, y: y + 0.18, w: w - 0.12, h: b.h - 0.22,
          fill: { color: 'FFFFFF' }, line: { color: d.line, pt: 0.6 },
        })
        y += b.h
      })
    })
  }

  drawWeek(0.88, 'Semana 1  ·  del ________')
  drawWeek(4.72, 'Semana 2  ·  del ________')
}

const DIAS_PLAN = [
  { nom: 'Lunes', head: 'F4D03F', soft: 'FCF3CF' },
  { nom: 'Martes', head: '27AE60', soft: 'D5F5E3' },
  { nom: 'Miércoles', head: '2980B9', soft: 'D6EAF8' },
  { nom: 'Jueves', head: 'E67E22', soft: 'FDEBD0' },
  { nom: 'Viernes', head: '8E44AD', soft: 'F4ECF7' },
]

function addPlantillaPorDia(pptx) {
  const line = { pt: 1.25, color: '8D959B' }
  const bord = [line, line, line, line]
  DIAS_PLAN.forEach((d) => {
    const s = pptx.addSlide()
    s.addTable(
      [
        [
          {
            text: d.nom,
            options: {
              fill: { color: d.head }, color: 'FFFFFF', bold: true, fontSize: 16,
              align: 'center', valign: 'middle', border: bord, fontFace: FONT,
            },
          },
          {
            text: 'Título',
            options: {
              fill: { color: d.soft }, color: '1C2833', bold: true, fontSize: 14,
              align: 'center', valign: 'middle', border: bord, fontFace: FONT,
            },
          },
          {
            text: 'PDA/Contenido/Descripción breve',
            options: {
              fill: { color: d.soft }, color: '1C2833', bold: true, fontSize: 13,
              align: 'center', valign: 'middle', border: bord, fontFace: FONT,
            },
          },
        ],
        [
          {
            text: ' ',
            options: {
              colspan: 3, border: bord, valign: 'top', fill: { color: 'FFFFFF' }, fontFace: FONT,
            },
          },
        ],
        [
          {
            text: 'Materiales',
            options: {
              fill: { color: d.head }, color: 'FFFFFF', bold: true, fontSize: 14,
              align: 'center', valign: 'middle', border: bord, fontFace: FONT,
            },
          },
          {
            text: ' ',
            options: {
              colspan: 2, border: bord, valign: 'top', fill: { color: 'FFFFFF' }, fontFace: FONT,
            },
          },
        ],
      ],
      {
        x: 0.28, y: 0.22, w: 10.44, colW: [1.7, 5.34, 3.4],
        border: bord,
        fontFace: FONT,
        rowH: [0.42, 6.95, 0.48],
      },
    )
  })
}

