import { saveAs } from 'file-saver'
import {
  CAMPOS,
  getCampo,
  getContenido,
  getPda,
  parsePdaKey,
  codigoPda,
  getActiveNiveles,
} from '../data/catalogoFase2'
import { resolveTextoNivel, buildOpcionesParaPda } from '../data/descripcionesNivel'
import { injectVbaProject, loadVbaProjectBin } from './injectMacro'
import { injectNivelCharts } from './injectNivelCharts'

const FONT = 'Century Gothic'
const MAX_ALUMNOS = 30
/** Fila donde empiezan los datos de alumnos (después de encabezados Esc/Docente/Grupo) */
export const ALUMNOS_DATA_START = 5
/** Columna Apellidos (B). Nombre va en D (merge D:F) para alinear con Esc/Docente/Grupo. */
export const ALUMNOS_COL_APELLIDOS = 2
export const ALUMNOS_COL_NOMBRE = 4
/** Primera columna de indicadores en Evaluacion (F): A=N°, B:C=Apellidos, D:E=Nombre. */
export const EVAL_FIRST_IND_COL = 6

function hex(color) {
  return (color || 'FFFFFF').replace('#', '')
}

function styleHeader(cell, bg, fg = 'FFFFFF') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex(bg)}` } }
  cell.font = { bold: true, color: { argb: `FF${hex(fg)}` }, name: 'Century Gothic', size: 11 }
  cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' }
  cell.border = thinBorder()
}

function thinBorder() {
  const s = { style: 'thin', color: { argb: 'FFBFBFBF' } }
  return { top: s, left: s, bottom: s, right: s }
}

function styleCell(cell) {
  cell.font = { name: 'Century Gothic', size: 10 }
  cell.alignment = { wrapText: true, vertical: 'middle' }
  cell.border = thinBorder()
}

/** Altura justa al texto (Excel no hace AutoFit en celdas combinadas). */
function countWrapLines(text, charsPerLine) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  if (!words.length) return 1
  let used = 0
  let lines = 1
  for (const w of words) {
    const need = used === 0 ? w.length : w.length + 1
    if (used > 0 && used + need > charsPerLine) {
      lines += 1
      used = w.length
    } else {
      used += need
    }
  }
  return lines
}

function heightForWrappedText(texts, charsPerLine = 70) {
  const list = [].concat(texts || []).filter(Boolean)
  const lines = Math.max(2, ...list.map((t) => countWrapLines(t, charsPerLine)))
  return Math.min(96, 6 + lines * 14)
}

function buildItems(pdaKeys, descripciones) {
  const usedCodes = {}
  return pdaKeys.map((key) => {
    const { campoId, contenidoId, pdaId } = parsePdaKey(key)
    const campo = getCampo(campoId)
    const contenido = getContenido(campoId, contenidoId)
    const pda = getPda(campoId, contenidoId, pdaId)
    // Siempre el código oficial del catálogo (evita que Evaluacion/TABLA/Catálogo discrepen)
    let shortCode = codigoPda(pda, campo)
    if (usedCodes[shortCode]) {
      usedCodes[shortCode] += 1
      shortCode = `${shortCode}·${usedCodes[shortCode]}`
    } else {
      usedCodes[shortCode] = 1
    }
    const desc = descripciones[key]
    const opciones = desc?.opciones || buildOpcionesParaPda(pda?.texto || '')
    return {
      key,
      campo,
      contenido,
      pda,
      shortCode,
      opciones,
      opcionIdx: {
        L: Math.min(3, Math.max(1, (desc?.L?.optionIndex ?? 0) + 1)),
        E: Math.min(3, Math.max(1, (desc?.E?.optionIndex ?? 0) + 1)),
        P: Math.min(3, Math.max(1, (desc?.P?.optionIndex ?? 0) + 1)),
        RA: Math.min(3, Math.max(1, (desc?.RA?.optionIndex ?? 0) + 1)),
      },
      textos: {
        L: resolveTextoNivel(desc, 'L'),
        E: resolveTextoNivel(desc, 'E'),
        P: resolveTextoNivel(desc, 'P'),
        RA: resolveTextoNivel(desc, 'RA'),
      },
    }
  })
}

/** Comentario (pestaña roja): solo el texto del PDA elegido, para recordar qué se seleccionó. */
function notaPda(it) {
  return String(it.pda?.texto || '').trim()
}

function applyCenturyGothic(wb) {
  wb.eachSheet((ws) => {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = { ...(cell.font || {}), name: FONT }
      })
    })
  })
}

export async function generateRubricaExcel(payload) {
  const { pdaKeys, descripciones, meta = {}, textosEditables = false } = payload
  const items = buildItems(pdaKeys, descripciones)

  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Miss Garabatos · Rúbrica Evaluación Fase 2'
  wb.created = new Date()

  buildAlumnosSheet(wb, meta)
  buildEvaluacionSheet(wb, items)
  buildReporteSheet(wb, items)
  const chartSpecs = buildTablaYGraficaSheet(wb, items)
  buildGraficasGrupalesSheet(wb, items)
  buildCatalogoSheet(wb, items, meta, textosEditables)

  applyCenturyGothic(wb)

  let xlsxBuffer = await wb.xlsx.writeBuffer()
  try {
    xlsxBuffer = await injectNivelCharts(xlsxBuffer, chartSpecs)
  } catch (err) {
    console.warn('No se pudieron inyectar gráficas de niveles', err)
  }

  let outBuffer = xlsxBuffer
  let mime =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  let ext = 'xlsx'
  try {
    const vbaBin = await loadVbaProjectBin()
    outBuffer = await injectVbaProject(xlsxBuffer, vbaBin)
    mime = 'application/vnd.ms-excel.sheet.macroEnabled.12'
    ext = 'xlsm'
  } catch (err) {
    console.warn('Macros no embebidas; se descarga .xlsx', err)
  }

  const blob = new Blob([outBuffer], { type: mime })
  const stamp = new Date().toISOString().slice(0, 10)
  const grupo = (meta.grupo || 'Grupo').replace(/\s+/g, '_')
  saveAs(blob, `Rubrica_Evaluacion_${grupo}_${stamp}.${ext}`)
}

export { buildItems }

/** Márgenes e impresión centrada (vertical u horizontal). */
function applyPrintSetup(ws, { orientation = 'portrait', lastCol = 6, lastRow = 40, fitToHeight = null } = {}) {
  const height =
    fitToHeight !== null && fitToHeight !== undefined
      ? fitToHeight
      : orientation === 'landscape'
        ? 1
        : 0
  ws.pageSetup = {
    paperSize: 1, // Letter
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: height,
    horizontalCentered: true,
    verticalCentered: false,
    printArea: `A1:${colLetter(lastCol)}${lastRow}`,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.4,
      bottom: 0.4,
      header: 0.15,
      footer: 0.15,
    },
  }
}

/** Bloque Esc / Docente / Grupo debajo del título (fórmulas hacia Alumnos) */
function writeMetaHeader(ws, layout = 'simple', lastCol = 6) {
  const labelFont = { bold: true, size: 10 }
  const valueFont = { size: 10, bold: true, color: { argb: 'FF6C3483' } }
  const valueFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFCF3CF' },
  }

  if (layout === 'catalogo') {
    // Todo dentro de A–D (área de impresión): Esc | escuela | Docente: | nombre
    // Grupo va en la fila de periodo (A3), también dentro de A–D.
    ws.getCell('A2').value = 'Esc:'
    ws.getCell('A2').font = labelFont
    ws.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getCell('B2').value = { formula: 'Alumnos!B2' }
    ws.getCell('B2').font = valueFont
    ws.getCell('B2').fill = valueFill
    ws.getCell('B2').border = thinBorder()
    ws.getCell('B2').alignment = { vertical: 'middle', horizontal: 'left' }

    ws.getCell('C2').value = 'Docente:'
    ws.getCell('C2').font = labelFont
    ws.getCell('C2').alignment = { horizontal: 'right', vertical: 'middle' }
    ws.getCell('D2').value = { formula: 'Alumnos!D2' }
    ws.getCell('D2').font = valueFont
    ws.getCell('D2').fill = valueFill
    ws.getCell('D2').border = thinBorder()
    ws.getCell('D2').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(2).height = 18
    return
  }

  if (layout === 'evaluacion') {
    // Encabezado justificado al ancho de la tabla (A … lastCol). No se sale a la derecha.
    const paint = (cell) => {
      cell.fill = valueFill
      cell.border = thinBorder()
    }
    const end = Math.max(5, lastCol)

    ws.getCell('A2').value = 'Esc:'
    ws.getCell('A2').font = labelFont
    ws.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
    paint(ws.getCell('A2'))

    ws.mergeCells('B2:C2')
    ws.getCell('B2').value = { formula: 'Alumnos!B2' }
    ws.getCell('B2').font = valueFont
    ws.getCell('B2').alignment = { vertical: 'middle', horizontal: 'left' }
    paint(ws.getCell('B2'))
    paint(ws.getCell('C2'))

    ws.getCell('D2').value = 'Docente:'
    ws.getCell('D2').font = labelFont
    ws.getCell('D2').alignment = { horizontal: 'right', vertical: 'middle' }
    paint(ws.getCell('D2'))

    const nameEnd = end >= 7 ? end - 2 : 5
    if (nameEnd > 5) ws.mergeCells(2, 5, 2, nameEnd)
    ws.getCell('E2').value = { formula: 'Alumnos!D2' }
    ws.getCell('E2').font = valueFont
    ws.getCell('E2').alignment = { vertical: 'middle', horizontal: 'left' }
    for (let c = 5; c <= nameEnd; c++) paint(ws.getCell(2, c))

    if (end >= 7) {
      ws.getCell(2, end - 1).value = 'Grupo:'
      ws.getCell(2, end - 1).font = labelFont
      ws.getCell(2, end - 1).alignment = { horizontal: 'right', vertical: 'middle' }
      paint(ws.getCell(2, end - 1))
      ws.getCell(2, end).value = { formula: 'Alumnos!F2' }
      ws.getCell(2, end).font = valueFont
      ws.getCell(2, end).alignment = { horizontal: 'center', vertical: 'middle' }
      paint(ws.getCell(2, end))
    } else {
      ws.getCell('E2').value = {
        formula: 'TRIM(Alumnos!D2&IF(Alumnos!F2="","","  ·  Grupo: "&Alumnos!F2))',
      }
    }

    ws.getRow(2).height = 18
    return
  }

  if (layout === 'riesgos') {
    // Esc | escuela | Docente: | nombre amplio (D:F) | Grupo en G — sin ensanchar el hueco entre tablas
    ws.getCell('A2').value = 'Esc:'
    ws.getCell('A2').font = labelFont
    ws.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
    ws.getCell('B2').value = { formula: 'Alumnos!B2' }
    ws.getCell('B2').font = valueFont
    ws.getCell('B2').fill = valueFill
    ws.getCell('B2').border = thinBorder()
    ws.getCell('B2').alignment = { vertical: 'middle', horizontal: 'left' }

    ws.getCell('C2').value = 'Docente:'
    ws.getCell('C2').font = labelFont
    ws.getCell('C2').alignment = { horizontal: 'right', vertical: 'middle' }
    ws.mergeCells('D2:F2')
    ws.getCell('D2').value = { formula: 'Alumnos!D2' }
    ws.getCell('D2').font = valueFont
    ws.getCell('D2').fill = valueFill
    ws.getCell('D2').border = thinBorder()
    ws.getCell('D2').alignment = { vertical: 'middle', horizontal: 'left' }
    for (const c of [5, 6]) {
      ws.getCell(2, c).fill = valueFill
      ws.getCell(2, c).border = thinBorder()
    }

    ws.getCell('G2').value = { formula: 'IF(Alumnos!F2="","","Grupo: "&Alumnos!F2)' }
    ws.getCell('G2').font = valueFont
    ws.getCell('G2').fill = valueFill
    ws.getCell('G2').border = thinBorder()
    ws.getCell('G2').alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(2).height = 18
    return
  }

  ws.getCell('A2').value = 'Esc:'
  ws.getCell('A2').font = labelFont
  ws.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
  ws.getCell('B2').value = { formula: 'Alumnos!B2' }
  ws.getCell('B2').font = valueFont

  ws.getCell('C2').value = 'Docente:'
  ws.getCell('C2').font = labelFont
  ws.getCell('C2').alignment = { horizontal: 'right', vertical: 'middle' }
  ws.getCell('D2').value = { formula: 'Alumnos!D2' }
  ws.getCell('D2').font = valueFont

  ws.getCell('E2').value = 'Grupo:'
  ws.getCell('E2').font = labelFont
  ws.getCell('E2').alignment = { horizontal: 'right', vertical: 'middle' }
  ws.getCell('F2').value = { formula: 'Alumnos!F2' }
  ws.getCell('F2').font = valueFont

  for (const col of [2, 4, 6]) {
    ws.getCell(2, col).fill = valueFill
    ws.getCell(2, col).border = thinBorder()
    ws.getCell(2, col).alignment = { vertical: 'middle', horizontal: col === 6 ? 'center' : 'left' }
  }
}

function buildAlumnosSheet(wb, meta) {
  const ws = wb.addWorksheet('Alumnos')
  // A–F: Esc más largo, Docente etiqueta compacta + nombre amplio, Grupo compacto (ej. 3A)
  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 26
  ws.getColumn(3).width = 9
  ws.getColumn(4).width = 22
  ws.getColumn(5).width = 7
  ws.getColumn(6).width = 8

  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = 'LISTA DE ALUMNOS · Preescolar / Fase 2'
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFE74C3C' }, name: 'Century Gothic' }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }

  ws.getCell('A2').value = 'Esc:'
  ws.getCell('A2').font = { bold: true, size: 11 }
  ws.getCell('A2').alignment = { horizontal: 'right', vertical: 'middle' }
  ws.getCell('B2').value = meta.escuela || ''
  ws.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF3CF' } }
  ws.getCell('B2').border = thinBorder()
  ws.getCell('B2').font = { bold: true, size: 11, color: { argb: 'FF6C3483' } }

  ws.getCell('C2').value = 'Docente:'
  ws.getCell('C2').font = { bold: true, size: 11 }
  ws.getCell('C2').alignment = { horizontal: 'right', vertical: 'middle' }
  ws.getCell('D2').value = meta.docente || ''
  ws.getCell('D2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF3CF' } }
  ws.getCell('D2').border = thinBorder()
  ws.getCell('D2').font = { bold: true, size: 11, color: { argb: 'FF6C3483' } }

  ws.getCell('E2').value = 'Grupo:'
  ws.getCell('E2').font = { bold: true, size: 11 }
  ws.getCell('E2').alignment = { horizontal: 'right', vertical: 'middle' }
  ws.getCell('F2').value = meta.grupo || ''
  ws.getCell('F2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF3CF' } }
  ws.getCell('F2').border = thinBorder()
  ws.getCell('F2').font = { bold: true, size: 11, color: { argb: 'FF6C3483' } }
  ws.getCell('F2').alignment = { horizontal: 'center', vertical: 'middle' }

  // Tip fuera del área de impresión
  ws.mergeCells('H3:J4')
  ws.getCell('H3').value =
    'Completa Esc, Docente y Grupo arriba. Luego captura hasta 30 alumnos. El N° se usa en Evaluación y Reporte. (Esta nota no se imprime.)'
  ws.getCell('H3').font = { italic: true, size: 9, color: { argb: 'FF666666' } }
  ws.getCell('H3').alignment = { wrapText: true, vertical: 'top' }

  // Encabezados: N° | Apellidos (B:C) | Nombre (D:F) — mismo ancho que el bloque superior
  styleHeader(ws.getCell(4, 1), 'e74c3c')
  ws.getCell(4, 1).value = 'N°'
  styleHeader(ws.getCell(4, 2), 'e74c3c')
  ws.getCell(4, 2).value = 'Apellidos'
  ws.mergeCells(4, 2, 4, 3)
  styleHeader(ws.getCell(4, 4), 'e74c3c')
  ws.getCell(4, 4).value = 'Nombre'
  ws.mergeCells(4, 4, 4, 6)

  for (let i = 1; i <= MAX_ALUMNOS; i++) {
    const r = 4 + i
    ws.getCell(r, 1).value = i
    styleCell(ws.getCell(r, 1))
    ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' }

    styleCell(ws.getCell(r, 2))
    ws.mergeCells(r, 2, r, 3)

    styleCell(ws.getCell(r, 4))
    ws.mergeCells(r, 4, r, 6)

    if (i % 2 === 0) {
      for (let c of [1, 2, 4]) {
        ws.getCell(r, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDECEA' },
        }
      }
    }
  }
  ws.views = [{ state: 'frozen', ySplit: 4 }]
  applyPrintSetup(ws, { orientation: 'portrait', lastCol: 6, lastRow: 4 + MAX_ALUMNOS })
}


function buildEvaluacionSheet(wb, items) {
  const ws = wb.addWorksheet('Evaluacion')
  const nInd = items.length
  const firstIndCol = EVAL_FIRST_IND_COL // F = 6
  const lastIndCol = Math.max(firstIndCol - 1 + nInd, firstIndCol - 1)
  // Ancho = tabla real (alumnos A–E + PDA). El encabezado no se sale de aquí.
  const lastCol = Math.max(lastIndCol, 5)

  ws.getColumn(1).width = 5
  ws.getColumn(2).width = 14
  ws.getColumn(3).width = 14
  ws.getColumn(4).width = 10
  ws.getColumn(5).width = 14
  const indWidth = nInd <= 4 ? 12 : nInd <= 8 ? 9 : 7.5
  for (let i = 0; i < Math.max(nInd, 2); i++) {
    ws.getColumn(firstIndCol + i).width = indWidth
  }

  ws.mergeCells(1, 1, 1, lastCol)
  ws.getCell('A1').value = 'EVALUACIÓN DIAGNÓSTICA · Selecciona L / E / P / RA en cada celda'
  ws.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF2980B9' }, name: 'Century Gothic' }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 18

  writeMetaHeader(ws, 'evaluacion', lastCol)

  ;[1, 2, 3, 4].forEach((rr) => {
    ws.getRow(rr).height = rr === 3 ? 26 : 16
  })

  // R4: N° | Apellidos (B:C) | Nombre (D:E) | PDA desde F
  styleHeader(ws.getCell(4, 1), '2c3e50')
  ws.getCell(4, 1).value = 'N°'
  styleHeader(ws.getCell(4, 2), '2c3e50')
  ws.getCell(4, 2).value = 'Apellidos'
  ws.mergeCells(4, 2, 4, 3)
  styleHeader(ws.getCell(4, 4), '2c3e50')
  ws.getCell(4, 4).value = 'Nombre'
  ws.mergeCells(4, 4, 4, 5)
  for (let c = 2; c <= 5; c++) {
    ws.getCell(4, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C3E50' },
    }
    ws.getCell(4, c).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Century Gothic' }
    ws.getCell(4, c).border = thinBorder()
  }

  let col = firstIndCol
  let i = 0
  while (i < items.length) {
    const campoId = items[i].campo.id
    let j = i
    while (j < items.length && items[j].campo.id === campoId) j++
    const c1 = col
    const c2 = col + (j - i) - 1
    ws.getCell(3, c1).value = items[i].campo.nombre
    styleHeader(ws.getCell(3, c1), items[i].campo.color)
    ws.getCell(3, c1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Century Gothic' }
    ws.getCell(3, c1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    if (c1 !== c2) {
      ws.mergeCells(3, c1, 3, c2)
      for (let c = c1; c <= c2; c++) {
        ws.getCell(3, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${hex(items[i].campo.color)}` },
        }
        ws.getCell(3, c).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Century Gothic' }
        ws.getCell(3, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        ws.getCell(3, c).border = thinBorder()
      }
    }
    for (let k = i; k < j; k++) {
      const cell = ws.getCell(4, col + (k - i))
      cell.value = items[k].shortCode
      styleHeader(cell, '34495e')
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9, name: 'Century Gothic' }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.note = notaPda(items[k])
    }
    col = c2 + 1
    i = j
  }

  const dv = {
    type: 'list',
    allowBlank: true,
    formulae: ['"L,E,P,RA"'],
    showErrorMessage: true,
    errorTitle: 'Nivel inválido',
    error: 'Usa solo L, E, P o RA',
    promptTitle: 'Nivel',
    prompt: 'Elige L, E, P o RA',
    showInputMessage: true,
  }

  const startLetter = colLetter(firstIndCol)
  const endLetter = colLetter(Math.max(lastIndCol, firstIndCol))

  for (let a = 1; a <= MAX_ALUMNOS; a++) {
    const r = 4 + a
    const src = ALUMNOS_DATA_START - 1 + a
    ws.getRow(r).height = 14

    ws.getCell(r, 1).value = { formula: `IF(Alumnos!A${src}="","",Alumnos!A${src})` }
    styleCell(ws.getCell(r, 1))
    ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(r, 1).font = { name: 'Century Gothic', size: 9 }

    ws.getCell(r, 2).value = { formula: `IF(Alumnos!B${src}="","",Alumnos!B${src})` }
    styleCell(ws.getCell(r, 2))
    ws.mergeCells(r, 2, r, 3)
    ws.getCell(r, 2).alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getCell(r, 2).font = { name: 'Century Gothic', size: 9 }

    ws.getCell(r, 4).value = { formula: `IF(Alumnos!D${src}="","",Alumnos!D${src})` }
    styleCell(ws.getCell(r, 4))
    ws.mergeCells(r, 4, r, 5)
    ws.getCell(r, 4).alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getCell(r, 4).font = { name: 'Century Gothic', size: 9 }

    for (let c = firstIndCol; c <= lastIndCol; c++) {
      const cell = ws.getCell(r, c)
      styleCell(cell)
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.font = { bold: true, name: 'Century Gothic', size: 10, color: { argb: 'FF1C2833' } }
      cell.dataValidation = dv
    }
  }

  if (nInd > 0) {
    getActiveNiveles().forEach((n) => {
      ws.addConditionalFormatting({
        ref: `${startLetter}5:${endLetter}${4 + MAX_ALUMNOS}`,
        rules: [
          {
            type: 'cellIs',
            operator: 'equal',
            formulae: [`"${n.code}"`],
            style: {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                bgColor: { argb: `FF${hex(n.bg)}` },
              },
              font: { name: FONT, bold: true, color: { argb: 'FF1C2833' }, size: 10 },
            },
          },
        ],
      })
    })
  }

  const legRow = 4 + MAX_ALUMNOS + 1
  ws.getRow(legRow).height = 16
  ws.getCell(legRow, 1).value = 'Leyenda:'
  ws.getCell(legRow, 1).font = { bold: true, size: 8, name: 'Century Gothic' }
  ws.getCell(legRow, 1).alignment = { vertical: 'middle' }
  getActiveNiveles().forEach((n, idx) => {
    const cell = ws.getCell(legRow, 2 + idx)
    cell.value = `${n.code}=${n.label}`
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex(n.bg)}` } }
    cell.font = { bold: true, color: { argb: 'FF1C2833' }, size: 8, name: 'Century Gothic' }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder()
  })

  ws.views = [{ state: 'frozen', xSplit: 5, ySplit: 4 }]
  applyPrintSetup(ws, {
    orientation: 'landscape',
    lastCol,
    lastRow: legRow,
    fitToHeight: 1,
  })
}

function buildReporteSheet(wb, items) {
  const ws = wb.addWorksheet('Reporte_Individual', {
    views: [{ showGridLines: false }],
  })
  ;[16, 8, 16, 16, 16, 22, 3, 36, 12, 12].forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  // ——— Área de impresión (A–F): reporte formal ———
  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = 'REPORTE DE EVALUACIÓN DIAGNÓSTICA'
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF5B2C6F' }, name: 'Century Gothic' }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 26

  ws.mergeCells('A2:F2')
  ws.getCell('A2').value = 'Educación Preescolar · Fase 2'
  ws.getCell('A2').font = { size: 11, italic: true, color: { argb: 'FF6C3483' }, name: 'Century Gothic' }
  ws.getCell('A2').alignment = { horizontal: 'center' }

  // Meta institucional (fórmulas desde Alumnos)
  ws.getCell('A3').value = 'Escuela'
  ws.getCell('A3').font = { bold: true, size: 9, color: { argb: 'FF566573' }, name: 'Century Gothic' }
  ws.mergeCells('B3:C3')
  ws.getCell('B3').value = { formula: 'Alumnos!B2' }
  ws.getCell('B3').font = { bold: true, size: 11, color: { argb: 'FF1C2833' }, name: 'Century Gothic' }
  ws.getCell('B3').border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } }

  ws.getCell('D3').value = 'Docente'
  ws.getCell('D3').font = { bold: true, size: 9, color: { argb: 'FF566573' }, name: 'Century Gothic' }
  ws.getCell('E3').value = { formula: 'Alumnos!D2' }
  ws.mergeCells('E3:F3')
  ws.getCell('E3').font = { bold: true, size: 11, color: { argb: 'FF1C2833' }, name: 'Century Gothic' }
  ws.getCell('E3').border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } }

  ws.getCell('A4').value = 'Grupo'
  ws.getCell('A4').font = { bold: true, size: 9, color: { argb: 'FF566573' }, name: 'Century Gothic' }
  ws.getCell('B4').value = { formula: 'Alumnos!F2' }
  ws.getCell('B4').font = { bold: true, size: 11, color: { argb: 'FF1C2833' }, name: 'Century Gothic' }
  ws.getCell('B4').border = { bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } } }

  ws.getCell('C4').value = 'N° de lista'
  ws.getCell('C4').font = { bold: true, size: 9, color: { argb: 'FF566573' }, name: 'Century Gothic' }
  ws.getCell('D4').value = 1
  ws.getCell('D4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF3CF' } }
  ws.getCell('D4').font = { bold: true, size: 14, color: { argb: 'FF5B2C6F' }, name: 'Century Gothic' }
  ws.getCell('D4').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getCell('D4').border = thinBorder()
  ws.getCell('D4').dataValidation = {
    type: 'whole',
    operator: 'between',
    formulae: [1, MAX_ALUMNOS],
    showErrorMessage: true,
    errorTitle: 'N° de lista',
    error: 'Elige un número del 1 al 30',
  }

  ws.getCell('E4').value = 'Fecha'
  ws.getCell('E4').font = { bold: true, size: 9, color: { argb: 'FF566573' }, name: 'Century Gothic' }
  const today = new Date()
  ws.getCell('F4').value = today
  ws.getCell('F4').numFmt = 'dd/mm/yyyy'
  ws.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF3CF' } }
  ws.getCell('F4').font = { bold: true, size: 11, color: { argb: 'FF1C2833' }, name: 'Century Gothic' }
  ws.getCell('F4').border = thinBorder()

  ws.getCell('A5').value = 'Alumno(a)'
  ws.getCell('A5').font = { bold: true, size: 9, color: { argb: 'FF566573' }, name: 'Century Gothic' }
  ws.mergeCells('B5:F5')
  ws.getCell('B5').value = {
    formula:
      'IFERROR(TRIM(INDEX(Alumnos!B5:B34,D4)&" "&INDEX(Alumnos!D5:D34,D4)),"")',
  }
  ws.getCell('B5').font = { bold: true, size: 14, color: { argb: 'FF1C2833' }, name: 'Century Gothic' }
  ws.getCell('B5').border = { bottom: { style: 'medium', color: { argb: 'FF5B2C6F' } } }
  ws.getRow(5).height = 22

  // Antecedentes (sin texto de ayuda en el área impresa)
  ws.mergeCells('A6:F6')
  ws.getCell('A6').value = 'I. ANTECEDENTES Y CONTEXTO'
  ws.getCell('A6').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Century Gothic' }
  ws.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B2C6F' } }
  ws.getCell('A6').alignment = { horizontal: 'left', vertical: 'middle' }

  ws.mergeCells('A7:F9')
  for (let c = 1; c <= 6; c++) {
    ws.getCell(7, c).border = thinBorder()
    ws.getCell(7, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    }
  }
  ws.getRow(7).height = 18
  ws.getRow(8).height = 18
  ws.getRow(9).height = 18

  // Resultados
  ws.mergeCells('A10:F10')
  ws.getCell('A10').value = 'II. RESULTADOS POR INDICADOR'
  ws.getCell('A10').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Century Gothic' }
  ws.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8449' } }

  ;['Campo formativo', 'Nivel', 'Descripción diagnóstica'].forEach((h, i) =>
    styleHeader(ws.getCell(11, i + 1), '1A5276'),
  )
  ws.mergeCells('C11:F11')

  const dataStart = 12
  let rStart = dataStart
  items.forEach((it, idx) => {
    const r = dataStart + idx
    const evalCol = colLetter(EVAL_FIRST_IND_COL + idx)
    const catRow = 5 + idx

    if (idx === 0 || items[idx - 1].campo.id !== it.campo.id) rStart = r
    const isLast = idx === items.length - 1 || items[idx + 1].campo.id !== it.campo.id

    ws.getCell(r, 1).value = it.campo.nombre
    styleCell(ws.getCell(r, 1))
    ws.getCell(r, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${hex(it.campo.colorSoft)}` },
    }

    if (isLast && rStart < r) {
      try {
        ws.mergeCells(rStart, 1, r, 1)
      } catch {
        /* ignore */
      }
      ws.getCell(rStart, 1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
    } else if (isLast) {
      ws.getCell(r, 1).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
    }

    ws.getCell(r, 2).value = {
      formula: `IFERROR(INDEX(Evaluacion!${evalCol}5:${evalCol}34,$D$4),"")`,
    }
    styleCell(ws.getCell(r, 2))
    ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(r, 2).font = { bold: true, size: 12, color: { argb: 'FF1C2833' } }
    ws.getCell(r, 2).note = notaPda(it)

    ws.getCell(r, 3).value = {
      formula: `IF(B${r}="","",IF(B${r}="L",Catalogo_Descripciones!E${catRow},IF(B${r}="E",Catalogo_Descripciones!F${catRow},IF(B${r}="P",Catalogo_Descripciones!G${catRow},IF(B${r}="RA",Catalogo_Descripciones!H${catRow},"")))))`,
    }
    styleCell(ws.getCell(r, 3))
    ws.mergeCells(r, 3, r, 6)
    ws.getCell(r, 3).alignment = { wrapText: true, vertical: 'top', horizontal: 'left' }
    ws.getCell(r, 3).font = { name: 'Century Gothic', size: 10 }
    const textosNivel = [
      ...(it.opciones?.L || []),
      ...(it.opciones?.E || []),
      ...(it.opciones?.P || []),
      ...(it.opciones?.RA || []),
      it.textos?.L,
      it.textos?.E,
      it.textos?.P,
      it.textos?.RA,
    ]
    ws.getRow(r).height = heightForWrappedText(textosNivel, 70)
  })

  if (items.length) {
    getActiveNiveles().forEach((n) => {
      ws.addConditionalFormatting({
        ref: `B${dataStart}:B${dataStart - 1 + items.length}`,
        rules: [
          {
            type: 'cellIs',
            operator: 'equal',
            formulae: [`"${n.code}"`],
            style: {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                bgColor: { argb: `FF${hex(n.bg)}` },
              },
              font: { name: FONT, bold: true, color: { argb: 'FF1C2833' }, size: 12 },
            },
          },
        ],
      })
    })
  }

  const rec = dataStart + items.length + 1
  ws.mergeCells(rec, 1, rec, 6)
  ws.getCell(rec, 1).value = 'III. RECOMENDACIONES Y ACUERDOS'
  ws.getCell(rec, 1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Century Gothic' }
  ws.getCell(rec, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E8449' } }

  // Espacio en blanco formal (sin instrucciones impresas)
  ws.mergeCells(rec + 1, 1, rec + 3, 6)
  for (let rr = rec + 1; rr <= rec + 3; rr++) {
    for (let c = 1; c <= 6; c++) {
      ws.getCell(rr, c).border = thinBorder()
      ws.getCell(rr, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      }
    }
  }

  // Pie de guía fuera de impresión
  ws.mergeCells('H12:J12')
  ws.getCell('H12').value =
    'Documento de evaluación formativa · Fase 2 Preescolar · Uso pedagógico institucional'
  ws.getCell('H12').font = { size: 8, italic: true, color: { argb: 'FF7F8C8D' }, name: 'Century Gothic' }

  applyPrintSetup(ws, {
    orientation: 'portrait',
    lastCol: 6,
    lastRow: rec + 3,
    fitToHeight: 0,
  })

  // ——— Fuera del área de impresión (columna H+): ayudas y botón PDF ———
  ws.mergeCells('H2:J3')
  ws.getCell('H2').value = 'PDF  ·  TODOS LOS ALUMNOS'
  ws.getCell('H2').font = {
    bold: true,
    size: 12,
    color: { argb: 'FFFFFFFF' },
    name: 'Century Gothic',
  }
  ws.getCell('H2').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.getCell('H2').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF27AE60' },
  }
  for (const col of [8, 9, 10]) {
    const c = ws.getCell(2, col)
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1E8449' } },
      left: { style: 'medium', color: { argb: 'FF1E8449' } },
      bottom: { style: 'medium', color: { argb: 'FF1E8449' } },
      right: { style: 'medium', color: { argb: 'FF1E8449' } },
    }
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF27AE60' },
    }
  }
  ws.getRow(2).height = 24
  ws.getRow(3).height = 24

  ws.mergeCells('H4:J11')
  ws.getCell('H4').value = [
    'GUÍA DE USO (no se imprime)',
    '',
    '• N° de lista: cambia la celda amarilla (D4) para ver otro alumno.',
    '• Antecedentes: escribe en el recuadro blanco (ingreso, adaptación, salud, lengua materna, etc.).',
    '• Recomendaciones: completa el apartado III con estrategias y acuerdos con la familia.',
    '• PDF de todos: habilita macros y usa el botón verde, o Alt+F8 → GenerarPDFTodosReportes.',
    '• Impresión / PDF individual: Archivo → Exportar → solo esta hoja (columnas A–F).',
  ].join('\n')
  ws.getCell('H4').font = { size: 8, color: { argb: 'FF1C2833' }, name: 'Century Gothic' }
  ws.getCell('H4').alignment = { wrapText: true, vertical: 'top' }
  ws.getCell('H4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6F7' } }
  ws.getCell('H4').border = thinBorder()
}

/**
 * Tabla de conteos L/E/P/RA por cada PDA seleccionado + datos para una gráfica por campo.
 * Las columnas y gráficas se adaptan a lo elegido en la página.
 */
function buildTablaYGraficaSheet(wb, items) {
  if (!items.length) return []

  const ws = wb.addWorksheet('Tablas y Graficas Grupal', {
    views: [{ showGridLines: true }],
  })

  const nivelesActivos = getActiveNiveles()
  // Mismo orden que las filas L/E/P/RA (colores de nivel del resto de reportes)
  const chartColors = nivelesActivos.map((nv) => hex(nv.bg || nv.color))
  // Fila 1 título · fila 2 campos · fila 3 códigos · filas 4–7 niveles
  const headerRow = 2
  const codeRow = 3
  const levelStartRow = 4

  const groups = []
  let i = 0
  let evColCursor = EVAL_FIRST_IND_COL // misma numeración de columnas que Evaluacion (G…)
  while (i < items.length) {
    const campo = items[i].campo
    if (!campo?.id) {
      i += 1
      evColCursor += 1
      continue
    }
    let j = i
    while (j < items.length && items[j].campo?.id === campo.id) j++
    const n = j - i
    groups.push({
      campo,
      items: items.slice(i, j),
      evStartCol: evColCursor,
      matrixStart: 2 + i,
      matrixEnd: 2 + j - 1,
    })
    evColCursor += n
    i = j
  }
  if (!groups.length) return []

  const nPdas = items.length
  ws.getColumn(1).width = 8
  for (let c = 2; c <= 1 + nPdas; c++) ws.getColumn(c).width = 14

  // Totales por campo (visibles, a la derecha de la tabla) → fuente de cada gráfica
  const helperStart = 2 + nPdas + 2
  groups.forEach((_, gi) => {
    ws.getColumn(helperStart + gi).width = 14
  })

  ws.mergeCells(1, 1, 1, Math.max(2, 1 + nPdas))
  ws.getCell(1, 1).value = 'Tablas y Graficas Grupal · Alumnos por nivel (se actualiza con Evaluacion)'
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF1A5276' }, name: 'Century Gothic' }
  ws.getCell(1, 1).alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(1).height = 22

  let col = 2
  groups.forEach((g) => {
    const c1 = col
    const c2 = col + g.items.length - 1
    g.matrixStart = c1
    g.matrixEnd = c2
    ws.getCell(headerRow, c1).value = g.campo.nombre
    styleHeader(ws.getCell(headerRow, c1), g.campo.color || '5B2C6F')
    ws.getCell(headerRow, c1).alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
    if (c1 !== c2) {
      ws.mergeCells(headerRow, c1, headerRow, c2)
      for (let c = c1; c <= c2; c++) {
        ws.getCell(headerRow, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${hex(g.campo.color)}` },
        }
        ws.getCell(headerRow, c).font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 10,
        }
        ws.getCell(headerRow, c).border = thinBorder()
      }
    }
    g.items.forEach((it, k) => {
      const c = c1 + k
      const evCol = colLetter(g.evStartCol + k)
      const codeCell = ws.getCell(codeRow, c)
      codeCell.value = it.shortCode
      codeCell.font = { bold: true, size: 9, name: 'Century Gothic', color: { argb: 'FF34495E' } }
      codeCell.alignment = { horizontal: 'center', vertical: 'middle' }
      codeCell.border = thinBorder()
      codeCell.note = notaPda(it)
      getActiveNiveles().forEach((nv, ni) => {
        const r = levelStartRow + ni
        const cell = ws.getCell(r, c)
        cell.value = {
          formula: `COUNTIF(Evaluacion!${evCol}$5:${evCol}$34,"${nv.code}")`,
          result: 0,
        }
        cell.font = { name: 'Century Gothic', size: 11, bold: true }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = thinBorder()
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: `FF${hex(nv.bg || nv.color)}` },
        }
      })
    })
    col = c2 + 1
  })

  getActiveNiveles().forEach((nv, ni) => {
    const cell = ws.getCell(levelStartRow + ni, 1)
    cell.value = nv.code
    cell.font = { bold: true, size: 11, name: 'Century Gothic' }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder()
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${hex(nv.bg || nv.color)}` },
    }
  })
  ws.getCell(headerRow, 1).value = 'Campo'
  ws.getCell(headerRow, 1).font = { bold: true, size: 10 }
  ws.getCell(headerRow, 1).border = thinBorder()
  ws.getCell(codeRow, 1).value = 'Código'
  ws.getCell(codeRow, 1).font = { bold: true, size: 9 }
  ws.getCell(codeRow, 1).border = thinBorder()

  const sheetName = 'Tablas y Graficas Grupal'
  const chartSpecs = []
  groups.forEach((g, gi) => {
    const hc = helperStart + gi
    ws.getCell(headerRow, hc).value = g.campo.nombre
    styleHeader(ws.getCell(headerRow, hc), g.campo.color || '5B2C6F')
    ws.getCell(codeRow, hc).value = 'Total'
    ws.getCell(codeRow, hc).font = { bold: true, size: 9 }
    ws.getCell(codeRow, hc).alignment = { horizontal: 'center' }
    ws.getCell(codeRow, hc).border = thinBorder()
    getActiveNiveles().forEach((nv, ni) => {
      const r = levelStartRow + ni
      const a = colLetter(g.matrixStart)
      const b = colLetter(g.matrixEnd)
      const formula =
        g.matrixStart === g.matrixEnd ? `${a}${r}` : `SUM(${a}${r}:${b}${r})`
      const cell = ws.getCell(r, hc)
      cell.value = { formula, result: 0 }
      cell.font = { name: 'Century Gothic', size: 11, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = thinBorder()
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${hex(nv.bg || nv.color)}` },
      }
    })

    const hLetter = colLetter(hc)
    const chartLeft = helperStart + groups.length + 1
    const rowSpan = 11
    chartSpecs.push({
      sheetName,
      title: g.campo.nombre,
      catFormula: `'${sheetName}'!$A$${levelStartRow}:$A$${levelStartRow + 3}`,
      valFormula: `'${sheetName}'!$${hLetter}$${levelStartRow}:$${hLetter}$${levelStartRow + 3}`,
      seriesTitleFormula: `'${sheetName}'!$${hLetter}$${headerRow}`,
      colors: chartColors,
      from: { col: chartLeft - 1, row: gi * rowSpan },
      to: { col: chartLeft - 1 + 7, row: gi * rowSpan + 10 },
    })
  })

  ws.getRow(headerRow).height = 28
  applyPrintSetup(ws, {
    orientation: 'landscape',
    lastCol: Math.max(helperStart + groups.length + 8, 10),
    lastRow: Math.max(levelStartRow + 3, groups.length * 11),
  })

  return chartSpecs
}

/**
 * Alumnos en RA en cuadrícula 2×2.
 * Lista empaquetada (sin huecos): columnas auxiliares + SMALL/INDEX.
 */
function buildGraficasGrupalesSheet(wb, items) {
  const ws = wb.addWorksheet('Alumnos en riesgos', {
    views: [{ showGridLines: false }],
  })
  // Tablas compactas: A–C izq · D hueco mínimo · E–G der. El nombre del docente usa merge D2:F2.
  ;[5, 16, 14, 2.5, 5, 16, 14, 3, 36].forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  ws.mergeCells('A1:G1')
  ws.getCell('A1').value = 'ALUMNOS EN RIESGO (RA) · Por campo formativo'
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFC0392B' }, name: 'Century Gothic' }

  writeMetaHeader(ws, 'riesgos')

  ws.mergeCells('I2:I5')
  ws.getCell('I2').value =
    'GUÍA (no se imprime): cada bloque lista solo alumnos con RA en ese campo, juntos y sin filas vacías. Se actualiza al marcar Evaluacion.'
  ws.getCell('I2').font = { italic: true, size: 8, color: { argb: 'FF666666' } }
  ws.getCell('I2').alignment = { wrapText: true, vertical: 'top' }

  const blockById = new Map()
  let i = 0
  let evColCursor = EVAL_FIRST_IND_COL
  while (i < items.length) {
    const campoId = items[i].campo?.id
    if (!campoId) {
      i += 1
      evColCursor += 1
      continue
    }
    let j = i
    while (j < items.length && items[j].campo?.id === campoId) j++
    const n = j - i
    blockById.set(campoId, {
      campo: items[i].campo,
      startCol: evColCursor,
      endCol: evColCursor + n - 1,
      codes: items.slice(i, j).map((it) => it.shortCode),
      nCols: n,
    })
    evColCursor += n
    i = j
  }

  const quadMeta = [
    { id: 'lenguajes', short: 'L', hint: 'Lenguajes' },
    { id: 'saberes', short: 'P.', hint: 'Saberes y Pensamiento Científico' },
    { id: 'etica', short: 'E', hint: 'Ética, Naturaleza y Sociedades' },
    { id: 'humano', short: 'D y H.', hint: 'De lo Humano y lo Comunitario' },
  ].map((q) => {
    const fromCat = CAMPOS.find((c) => c.id === q.id)
    const block = blockById.get(q.id) || null
    return {
      ...q,
      campo: block?.campo || fromCat,
      block,
    }
  })

  // Columnas auxiliares (fuera de impresión): índice de alumno si tiene RA en el campo
  const helperStartCol = 11 // K
  const helperFirstRow = ALUMNOS_DATA_START
  const helperLastRow = ALUMNOS_DATA_START + MAX_ALUMNOS - 1
  quadMeta.forEach((q, qi) => {
    const hc = helperStartCol + qi
    ws.getColumn(hc).width = 4
    ws.getColumn(hc).hidden = true
    ws.getCell(helperFirstRow - 1, hc).value = q.id
    if (!q.block) return
    const ev1 = colLetter(q.block.startCol)
    const ev2 = colLetter(q.block.endCol)
    for (let s = 1; s <= MAX_ALUMNOS; s++) {
      const src = ALUMNOS_DATA_START - 1 + s
      const cell = ws.getCell(helperFirstRow - 1 + s, hc)
      cell.value = {
        formula:
          `IF(AND(OR(Alumnos!B${src}<>"",Alumnos!D${src}<>""),` +
          `COUNTIF(Evaluacion!${ev1}${src}:${ev2}${src},"RA")>0),${s},"")`,
        result: '',
      }
    }
    q.helperCol = hc
    q.helperRange = `$${colLetter(hc)}$${helperFirstRow}:$${colLetter(hc)}$${helperLastRow}`
  })

  const panelBody = MAX_ALUMNOS
  const panelChrome = 2
  const panelHeight = panelChrome + panelBody
  const topStart = 4
  const bottomStart = topStart + panelHeight + 1

  const positions = [
    { quad: quadMeta[0], startRow: topStart, startCol: 1 },
    { quad: quadMeta[1], startRow: topStart, startCol: 5 },
    { quad: quadMeta[2], startRow: bottomStart, startCol: 1 },
    { quad: quadMeta[3], startRow: bottomStart, startCol: 5 },
  ]

  positions.forEach((p) => writeRaPanel(ws, { ...p, panelBody }))

  applyPrintSetup(ws, {
    orientation: 'landscape',
    lastCol: 7,
    lastRow: bottomStart + panelHeight - 1,
    fitToHeight: 1,
  })
}

/** Recuadro 2×2: alumnos con RA empaquetados (sin huecos por N° ausente). */
function writeRaPanel(ws, { quad, startRow, startCol, panelBody }) {
  const c0 = startCol
  const c1 = startCol + 1
  const c2 = startCol + 2
  const color = quad.campo?.color || 'C0392B'
  const colorDark = quad.campo?.colorDark || '922B21'
  const soft = quad.campo?.colorSoft || 'FDECEA'
  const thick = { style: 'medium', color: { argb: `FF${hex(colorDark)}` } }
  const thin = thinBorder()

  let r = startRow
  ws.mergeCells(r, c0, r, c2)
  const codesNote = quad.block?.codes?.length
    ? ` · ${quad.block.codes.join(', ')}`
    : ' · (sin indicadores en esta rúbrica)'
  ws.getCell(r, c0).value = `${quad.short}  ${quad.hint}${codesNote}`
  styleHeader(ws.getCell(r, c0), color)
  ws.getCell(r, c0).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.getRow(r).height = 22
  r += 1

  ;['N°', 'Apellidos', 'Nombre'].forEach((h, hi) => {
    styleHeader(ws.getCell(r, c0 + hi), colorDark)
    ws.getCell(r, c0 + hi).value = h
  })
  const headerRow = r
  r += 1
  const dataStart = r

  if (!quad.block || !quad.helperRange) {
    ws.mergeCells(dataStart, c0, dataStart, c2)
    ws.getCell(dataStart, c0).value = 'Sin PDA de este campo'
    ws.getCell(dataStart, c0).font = { italic: true, size: 9, color: { argb: 'FF888888' } }
    ws.getCell(dataStart, c0).alignment = { horizontal: 'center', vertical: 'middle' }
    for (let cc = c0; cc <= c2; cc++) {
      ws.getCell(dataStart, cc).border = thin
    }
  } else {
    const hr = quad.helperRange
    for (let k = 1; k <= panelBody; k++) {
      const row = dataStart + k - 1
      const idx = `IFERROR(SMALL(${hr},${k}),"")`

      ws.getCell(row, c0).value = {
        formula: `IF(${idx}="","",${idx})`,
        result: '',
      }
      styleCell(ws.getCell(row, c0))
      ws.getCell(row, c0).alignment = { horizontal: 'center' }

      ws.getCell(row, c1).value = {
        formula: `IFERROR(INDEX(Alumnos!$B$${ALUMNOS_DATA_START}:$B$${ALUMNOS_DATA_START + MAX_ALUMNOS - 1},${idx}),"")`,
        result: '',
      }
      styleCell(ws.getCell(row, c1))

      ws.getCell(row, c2).value = {
        formula: `IFERROR(INDEX(Alumnos!$D$${ALUMNOS_DATA_START}:$D$${ALUMNOS_DATA_START + MAX_ALUMNOS - 1},${idx}),"")`,
        result: '',
      }
      styleCell(ws.getCell(row, c2))

      ws.addConditionalFormatting({
        ref: `${colLetter(c0)}${row}:${colLetter(c2)}${row}`,
        rules: [
          {
            type: 'expression',
            formulae: [`$${colLetter(c1)}${row}<>""`],
            style: {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                bgColor: { argb: `FF${hex(soft)}` },
              },
            },
          },
        ],
      })
      ws.getRow(row).height = 15
    }
  }

  for (let rr = startRow; rr <= headerRow; rr++) {
    for (let cc = c0; cc <= c2; cc++) {
      const cell = ws.getCell(rr, cc)
      const b = cell.border || thin
      cell.border = {
        top: rr === startRow ? thick : b.top,
        bottom: rr === headerRow ? thick : b.bottom,
        left: cc === c0 ? thick : b.left,
        right: cc === c2 ? thick : b.right,
      }
    }
  }
}


function buildCatalogoSheet(wb, items, meta, textosEditables = false) {
  const ws = wb.addWorksheet('Catalogo_Descripciones', {
    views: [{ showGridLines: false }],
  })
  ws.getColumn(1).width = 14
  ws.getColumn(2).width = 28
  ws.getColumn(3).width = 11
  ws.getColumn(4).width = 40
  ;[5, 6, 7, 8].forEach((c) => {
    ws.getColumn(c).width = 38
  })

  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = 'CATÁLOGO DE DESCRIPCIONES POR NIVEL · Fase 2 Preescolar'
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF6C3483' }, name: 'Century Gothic' }

  writeMetaHeader(ws, 'catalogo')

  ws.mergeCells('A3:D3')
  ws.getCell('A3').value = {
    formula: textosEditables
      ? `"Periodo: ${String(meta.periodo || '—').replace(/"/g, "'")}  |  Grupo: "&IF(Alumnos!F2="","—",Alumnos!F2)&"  |  Elige 1, 2 o 3 a la derecha para cambiar el texto; el reporte lo usa."`
      : `"Periodo: ${String(meta.periodo || '—').replace(/"/g, "'")}  |  Grupo: "&IF(Alumnos!F2="","—",Alumnos!F2)&"  |  Textos fijos de esta rúbrica (sin lista 1-2-3)."`,
  }
  ws.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF666666' } }
  ws.getCell('A3').alignment = { vertical: 'middle', wrapText: true }
  ws.getRow(3).height = 18

  // Títulos de columnas E–H (y I–L si se puede modificar)
  ws.mergeCells(textosEditables ? 'E1:L1' : 'E1:H1')
  ws.getCell('E1').value = textosEditables
    ? 'Elige 1, 2 o 3 en Opción L/E/P/RA (lista desplegable). El texto de la izquierda se actualiza y el reporte lo usa.'
    : 'Textos fijos (Sin modificar). El reporte usa estos textos.'
  ws.getCell('E1').font = { bold: true, size: 10, color: { argb: 'FF6C3483' }, name: 'Century Gothic' }
  ws.getCell('E1').alignment = { vertical: 'middle', wrapText: true }

  const headers = [
    'Campo',
    'Contenido',
    'Código',
    'PDA (grado)',
    'Txt L (Logrado)',
    'Txt E (Esperado)',
    'Txt P (Proceso)',
    'Txt RA (Requiere apoyo)',
  ]
  if (textosEditables) {
    headers.push('Opción L', 'Opción E', 'Opción P', 'Opción RA')
  }
  headers.forEach((h, i) => {
    styleHeader(ws.getCell(4, i + 1), '8e44ad')
    ws.getCell(4, i + 1).value = h
  })

  const optDv = {
    type: 'list',
    allowBlank: false,
    formulae: ['"1,2,3"'],
    showErrorMessage: true,
    errorTitle: 'Opción inválida',
    error: 'Elige 1, 2 o 3',
    promptTitle: 'Texto del nivel',
    prompt: 'Elige la variante 1, 2 o 3',
    showInputMessage: true,
  }

  const bank = [
    { code: 'L', txtCol: 5, optCol: 9, bankStart: 13 },
    { code: 'E', txtCol: 6, optCol: 10, bankStart: 16 },
    { code: 'P', txtCol: 7, optCol: 11, bankStart: 19 },
    { code: 'RA', txtCol: 8, optCol: 12, bankStart: 22 },
  ]

  if (textosEditables) {
    ;[9, 10, 11, 12].forEach((c) => {
      ws.getColumn(c).width = 11
    })
    for (let c = 13; c <= 24; c++) {
      ws.getColumn(c).width = 12
      ws.getColumn(c).hidden = true
    }
    ;['L1', 'L2', 'L3', 'E1', 'E2', 'E3', 'P1', 'P2', 'P3', 'RA1', 'RA2', 'RA3'].forEach((h, i) => {
      ws.getCell(4, 13 + i).value = h
    })
  }

  let mergeStart = 5
  items.forEach((it, idx) => {
    const r = 5 + idx
    const row = [
      it.campo?.nombre || '',
      it.contenido?.nombre || '',
      it.shortCode,
      `${it.pda?.grado}° · ${it.pda?.texto || ''}`,
    ]
    row.forEach((v, i) => {
      const cell = ws.getCell(r, i + 1)
      cell.value = v
      styleCell(cell)
      if (i === 2) {
        cell.font = { bold: true, color: { argb: 'FF6C3483' }, name: 'Century Gothic', size: 11 }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })

    bank.forEach(({ code, txtCol, optCol, bankStart }) => {
      const txtCell = ws.getCell(r, txtCol)
      styleCell(txtCell)
      txtCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF9E7' },
      }

      if (!textosEditables) {
        txtCell.value = it.textos?.[code] || ''
        return
      }

      const opts = [...(it.opciones?.[code] || ['', '', ''])]
      const pick = it.opcionIdx?.[code] || 1
      if (it.textos?.[code] && opts[pick - 1] !== it.textos[code]) {
        opts[pick - 1] = it.textos[code]
      }
      for (let k = 0; k < 3; k++) {
        ws.getCell(r, bankStart + k).value = opts[k] || ''
      }
      const optCell = ws.getCell(r, optCol)
      optCell.value = pick
      optCell.dataValidation = optDv
      styleCell(optCell)
      optCell.alignment = { horizontal: 'center', vertical: 'middle' }
      optCell.font = { bold: true, name: 'Century Gothic', size: 12, color: { argb: 'FF6C3483' } }
      optCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF9E7' },
      }

      const p = colLetter(optCol)
      const c1 = colLetter(bankStart)
      const c2 = colLetter(bankStart + 1)
      const c3 = colLetter(bankStart + 2)
      txtCell.value = {
        formula: `IFERROR(CHOOSE($${p}${r},$${c1}${r},$${c2}${r},$${c3}${r}),"")`,
        result: opts[pick - 1] || opts[0] || '',
      }
    })

    if (it.campo?.colorSoft) {
      ws.getCell(r, 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${hex(it.campo.colorSoft)}` },
      }
    }
    ws.getRow(r).height = 55

    const isLast = idx === items.length - 1 || items[idx + 1].campo.id !== it.campo.id
    if (idx === 0 || items[idx - 1].campo.id !== it.campo.id) mergeStart = r
    if (isLast && mergeStart < r) {
      try {
        ws.mergeCells(mergeStart, 1, r, 1)
      } catch {
        /* ignore */
      }
      ws.getCell(mergeStart, 1).alignment = {
        wrapText: true,
        vertical: 'middle',
        horizontal: 'center',
      }
    }
  })

  const leg = 5 + items.length + 2
  getActiveNiveles().forEach((n, i) => {
    const cell = ws.getCell(leg, 1 + i)
    cell.value = `${n.code} = ${n.label}`
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex(n.bg)}` } }
    cell.font = { bold: true, color: { argb: 'FF1C2833' } }
    cell.border = thinBorder()
  })

  // Impresión: solo A–D (Campo…PDA) + leyenda en una hoja.
  // Columnas E–H (textos L/E/P/RA) siguen en la hoja para editar, fuera del área de impresión.
  applyPrintSetup(ws, {
    orientation: 'landscape',
    lastCol: 4,
    lastRow: leg,
    fitToHeight: 1,
  })
}

function colLetter(n) {
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}
