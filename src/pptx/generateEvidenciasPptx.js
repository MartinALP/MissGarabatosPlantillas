import PptxGenJS from 'pptxgenjs'
import { saveAs } from 'file-saver'
import { getCampo, getContenido, getPda, parsePdaKey } from '../data/catalogoFase2'

const FONT = 'Century Gothic'
const MAX_PDA = 3
const NIVELES = ['Sobresaliente', 'Esperado', 'Proceso', 'Requiere Apoyo']
const EDGE = { pt: 0.75, color: '7F8C8D' }
const BORD = [EDGE, EDGE, EDGE, EDGE]
function hex(c) {
  const t = String(c || 'D6EAF8').replace('#', '')
  return t.length === 6 ? t : 'D6EAF8'
}

const BLACK = { pt: 1, color: '000000' }
const BORD_K = [BLACK, BLACK, BLACK, BLACK]

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

function groupByContenido(items) {
  const map = new Map()
  for (const it of items) {
    const id = `${it.campo.id}::${it.contenido?.id || ''}`
    if (!map.has(id)) map.set(id, { id, campo: it.campo, pdas: [] })
    map.get(id).pdas.push(it.pda)
  }
  return [...map.values()]
}

function chunk(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function generateEvidenciasPptx({ pdaKeys = [], slides = null }) {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'STD', width: 10, height: 7.5 })
  pptx.layout = 'STD'
  pptx.author = 'Miss Garabatos'
  pptx.title = 'Evidencias'

  const deck = Array.isArray(slides) && slides.length
    ? slides.map((sl) => ({
        tipo: sl.tipo === 'cotejo' ? 'cotejo' : 'grafica',
        campo: getCampo(sl.campoId),
        pdas: (sl.pdaIds || [])
          .map((id) => getPda(sl.campoId, sl.contenidoId, id))
          .filter(Boolean)
          .slice(0, MAX_PDA),
        imagenes: sl.imagenes || [],
        indicadores: sl.indicadores || [],
      })).filter((x) => x.campo && x.pdas.length)
    : groupByContenido(buildItems(pdaKeys)).flatMap((g) =>
        chunk(g.pdas, MAX_PDA).map((pdas) => ({ tipo: 'grafica', campo: g.campo, pdas })),
      )

  if (!deck.length) {
    addEvidenciaSlide(pptx, { nombre: 'Campo' }, [{ texto: '' }])
  } else {
    for (const sl of deck) {
      if (sl.tipo === 'cotejo') addCotejoSlide(pptx, sl.campo, sl.pdas, sl.indicadores)
      else addEvidenciaSlide(pptx, sl.campo, sl.pdas, sl.imagenes)
    }
  }

  const blob = await pptx.write({ outputType: 'blob' })
  saveAs(blob, `Evidencias_${new Date().toISOString().slice(0, 10)}.pptx`)
}

function campoLabel(nombre) {
  const t = String(nombre || 'Campo')
  const i = t.indexOf(' y ')
  if (i > 8) return `${t.slice(0, i)}\n${t.slice(i + 1)}`
  return t
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
    } else cur += add
  }
  return lines
}

function pdaCaption(p) {
  const g = p?.grado ? `${p.grado}°  ` : ''
  return `${g}${p?.texto || ''}`
}

function addEvidenciaSlide(pptx, campo, pdas, imagenes = []) {
  const s = pptx.addSlide()
  const n = Math.max(1, pdas.length)
  const tableW = 9.45
  const campoW = 2.45
  const pdaW = (tableW - campoW) / n
  const colW = [campoW, ...Array(n).fill(pdaW)]
  const tableY = 0.14
  const charsPda = Math.max(22, Math.floor((pdaW - 0.12) * 12))
  const charsCampo = Math.max(10, Math.floor((campoW - 0.12) * 8))
  const campoLines = Math.max(2, wrapLines(campoLabel(campo?.nombre).replace(/\n/g, ' '), charsCampo))
  let pdaLines = 1
  for (const p of pdas) pdaLines = Math.max(pdaLines, wrapLines(pdaCaption(p), charsPda))
  const tableH = Math.max(campoLines * 0.28 + 0.14, pdaLines * 0.18 + 0.14)

  const headerRow = [
    {
      text: campoLabel(campo?.nombre),
      options: {
        bold: true,
        fontSize: 16,
        align: 'center',
        valign: 'middle',
        fill: { color: 'FFFFFF' },
        border: BORD,
        fontFace: FONT,
        margin: [0.04, 0.05, 0.04, 0.05],
      },
    },
    ...pdas.map((p) => ({
      text: pdaCaption(p),
      options: {
        fontSize: 10,
        align: 'justify',
        valign: 'middle',
        fill: { color: 'FFFFFF' },
        border: BORD,
        fontFace: FONT,
        margin: [0.04, 0.06, 0.04, 0.06],
      },
    })),
  ]

  s.addTable([headerRow], {
    x: 0.28, y: tableY, w: tableW, colW,
    border: BORD,
    fontFace: FONT,
    valign: 'middle',
    rowH: tableH,
  })

  const fotos = (imagenes || []).filter((img) => img?.dataUrl).slice(0, 4)
  let instY = tableY + tableH + 0.4
  if (fotos.length) {
    const imgY = tableY + tableH + 0.16
    const imgH = 3.05
    const gap = 0.14
    const maxW = 7.2
    const cellW = (maxW - gap * (fotos.length - 1)) / fotos.length
    const startX = 0.28 + (tableW - (cellW * fotos.length + gap * (fotos.length - 1))) / 2
    fotos.forEach((img, i) => {
      const x = startX + i * (cellW + gap)
      s.addShape(pptx.ShapeType.rect, {
        x, y: imgY, w: cellW, h: imgH,
        fill: { color: 'FAFAFA' },
        line: { color: 'BFC9CA', pt: 1 },
      })
      s.addImage({
        data: img.dataUrl,
        x: x + 0.06,
        y: imgY + 0.06,
        w: cellW - 0.12,
        h: imgH - 0.12,
        sizing: { type: 'contain', w: cellW - 0.12, h: imgH - 0.12 },
      })
    })
    instY = imgY + imgH + 0.16
  }

  s.addText([
    { text: 'Instrucciones', options: { bold: true, fontSize: 14, fontFace: FONT } },
    { text: ':  ', options: { fontSize: 14, fontFace: FONT } },
  ], {
    x: 0.28, y: instY, w: 9.4, h: 0.32,
    color: '1C2833',
    valign: 'middle',
  })

  s.addText('Nombre:', {
    x: 0.18, y: 6.55, w: 1.5, h: 0.30,
    fontSize: 14, fontFace: FONT, color: '1C2833',
  })

  const nvCols = [1.08, 0.78, 0.70, 1.16]
  const nvW = nvCols.reduce((a, b) => a + b, 0)
  const fechaX = 8.55
  s.addTable(
    [
      [{
        text: 'Niveles de desempeño',
        options: {
          colspan: 4,
          fill: { color: 'F2F2F2' },
          bold: true,
          fontSize: 9,
          align: 'center',
          valign: 'middle',
          border: BORD,
          margin: [0.02, 0.03, 0.02, 0.03],
        },
      }],
      NIVELES.map((lab) => ({
        text: lab,
        options: {
          fontSize: 8,
          align: 'center',
          valign: 'middle',
          fill: { color: 'FFFFFF' },
          border: BORD,
          margin: [0.02, 0.03, 0.02, 0.03],
        },
      })),
    ],
    {
      x: fechaX - 0.18 - nvW, y: 6.55, w: nvW, colW: nvCols,
      border: BORD,
      fontFace: FONT,
      rowH: [0.22, 0.28],
    },
  )

  s.addText('Fecha', {
    x: fechaX, y: 6.42, w: 1.22, h: 0.24,
    fontSize: 14, fontFace: FONT, color: '1C2833', align: 'center',
  })
  s.addShape(pptx.ShapeType.rect, {
    x: fechaX, y: 6.68, w: 1.22, h: 0.40,
    fill: { color: 'E5E8E8' },
  })
}

function kcell(text, extra = {}) {
  return {
    text: text || '',
    options: {
      fontFace: FONT,
      border: BORD_K,
      color: '000000',
      valign: 'middle',
      margin: [0.04, 0.05, 0.04, 0.05],
      ...extra,
    },
  }
}

function addCotejoSlide(pptx, campo, pdas, indicadores = []) {
  const s = pptx.addSlide()
  const x = 0.22
  const w = 9.56
  const colW = [2.35, 5.21, 2.0]
  const pdaText = (pdas || []).map((p) => pdaCaption(p)).join('\n\n')
  const fillCampo = { color: hex(campo?.colorSoft) }

  s.addTable(
    [
      [kcell('Lista de cotejo', {
        colspan: 3, bold: true, fontSize: 18, align: 'center', fill: { color: 'FFFFFF' },
      })],
      [
        kcell('Campo formativo', { bold: true, fontSize: 11, align: 'center' }),
        kcell('Proceso de aprendizaje', { bold: true, fontSize: 11, align: 'center' }),
        kcell('Eje articulador', { bold: true, fontSize: 11, align: 'center' }),
      ],
      [
        kcell(campoLabel(campo?.nombre), {
          bold: true, fontSize: 14, align: 'center', fill: fillCampo,
        }),
        kcell(pdaText, { fontSize: 10, align: 'justify', valign: 'top' }),
        kcell('', { fill: { color: 'FFFFFF' } }),
      ],
      [
        kcell('Indicación:', { colspan: 2, fontSize: 11, valign: 'top', align: 'left' }),
        kcell('Fecha:', { fontSize: 11, valign: 'top', align: 'left' }),
      ],
      [kcell('Nombre del alumno:', { colspan: 3, fontSize: 12, align: 'left' })],
    ],
    {
      x, y: 0.12, w, colW,
      border: BORD_K,
      fontFace: FONT,
      rowH: [0.36, 0.30, 1.28, 0.52, 0.36],
    },
  )

  const indCols = [6.55, 1.0, 1.12, 0.89]
  const empty = kcell('', { fontSize: 11 })
  const items = (indicadores || []).map((t) => String(t || '').trim()).filter(Boolean).slice(0, 8)
  const rowsN = items.length ? Math.max(4, items.length) : 6
  const indRows = [
    [
      kcell('Indicadores', { bold: true, fontSize: 12, align: 'center' }),
      kcell('Sí', { bold: true, fontSize: 12, align: 'center' }),
      kcell('Con ayuda', { bold: true, fontSize: 12, align: 'center' }),
      kcell('No', { bold: true, fontSize: 12, align: 'center' }),
    ],
    ...Array.from({ length: rowsN }, (_, i) => [
      kcell(items[i] || '', { fontSize: 10, align: 'left', valign: 'middle' }),
      empty, empty, empty,
    ]),
  ]
  const bodyH = Math.min(0.58, 3.85 / rowsN)
  s.addTable(indRows, {
    x, y: 3.05, w, colW: indCols,
    border: BORD_K,
    fontFace: FONT,
    rowH: [0.32, ...Array(rowsN).fill(bodyH)],
  })
}
