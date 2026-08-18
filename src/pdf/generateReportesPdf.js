import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getActiveNiveles } from '../data/catalogoFase2'

/** Primera columna de indicadores en Evaluacion (F); A–E = datos de alumno. */
const EVAL_FIRST_IND_COL = 6

/**
 * Lee el Excel ya llenado y genera un PDF solo con alumnos que tienen nombre
 * (Apellidos y/o Nombre). Pide carpeta/archivo con el diálogo nativo si el
 * navegador lo permite.
 */
export async function generateReportesPdfFromExcel(file) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await wb.xlsx.load(buffer)

  const wsAlu = wb.getWorksheet('Alumnos')
  const wsEval = wb.getWorksheet('Evaluacion')
  const wsCat = wb.getWorksheet('Catalogo_Descripciones')

  if (!wsAlu || !wsEval || !wsCat) {
    throw new Error(
      'El archivo debe tener las hojas Alumnos, Evaluacion y Catalogo_Descripciones (generado por esta plataforma).',
    )
  }

  const meta = {
    escuela: cellText(wsAlu.getCell('B2')),
    docente: cellText(wsAlu.getCell('D2')),
    grupo: cellText(wsAlu.getCell('F2')),
  }

  const alumnos = []
  for (let r = 5; r <= 34; r++) {
    const apellidos = cellText(wsAlu.getCell(r, 2))
    // Nombre en D (col 4) tras merge D:F; fallback C por archivos antiguos
    const nombre =
      cellText(wsAlu.getCell(r, 4)) || cellText(wsAlu.getCell(r, 3))
    // Solo si hay algún nombre registrado
    if (!apellidos && !nombre) continue
    alumnos.push({ row: r, apellidos, nombre, evalRow: r })
  }

  if (!alumnos.length) {
    throw new Error(
      'No hay alumnos con nombre en la hoja Alumnos. Escribe Apellidos y/o Nombre y vuelve a intentar.',
    )
  }

  const indicadores = []
  for (let r = 5; r <= 200; r++) {
    const codigo = cellText(wsCat.getCell(r, 3)) // Columna Código (LPDA1…)
    if (!codigo) break
    indicadores.push({
      codigo,
      campo: cellText(wsCat.getCell(r, 1)),
      textos: {
        S: cellText(wsCat.getCell(r, 5)),
        E: cellText(wsCat.getCell(r, 6)),
        P: cellText(wsCat.getCell(r, 7)),
        RA: cellText(wsCat.getCell(r, 8)),
      },
      evalCol: EVAL_FIRST_IND_COL + indicadores.length,
    })
  }

  if (!indicadores.length) {
    throw new Error('No se encontraron indicadores en Catalogo_Descripciones.')
  }

  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40

  alumnos.forEach((alu, idx) => {
    if (idx > 0) doc.addPage()
    const nombreCompleto = `${alu.apellidos} ${alu.nombre}`.trim()

    let y = margin
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(142, 68, 173)
    doc.text('REPORTE DE EVALUACIÓN DIAGNÓSTICA · FASE 2', margin, y)
    y += 16

    doc.setFontSize(10)
    doc.setTextColor(40)
    doc.setFont('helvetica', 'normal')
    doc.text(`Esc: ${meta.escuela || '________'}`, margin, y)
    doc.text(`Docente: ${meta.docente || '________'}`, margin + 200, y)
    doc.text(`Grupo: ${meta.grupo || '________'}`, margin + 400, y)
    y += 14

    doc.setFont('helvetica', 'bold')
    doc.text(`Alumno: ${nombreCompleto}`, margin, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.text('Fecha: ____________________', margin, y)
    y += 12

    doc.setFillColor(142, 68, 173)
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, y, pageW - margin * 2, 16, 'F')
    doc.text('ANTECEDENTES / CONTEXTO', margin + 6, y + 11)
    y += 20
    doc.setDrawColor(220)
    doc.setFillColor(250, 250, 250)
    doc.rect(margin, y, pageW - margin * 2, 32, 'FD')
    y += 40

    doc.setFillColor(39, 174, 96)
    doc.rect(margin, y, pageW - margin * 2, 16, 'F')
    doc.setTextColor(255)
    doc.text('RESULTADOS POR INDICADOR', margin + 6, y + 11)
    y += 6

    const body = indicadores.map((ind) => {
      const raw = cellText(wsEval.getCell(alu.evalRow, ind.evalCol)).toUpperCase()
      const nivel = raw === 'L' ? 'S' : raw
      const texto = ind.textos[nivel] || (nivel ? '' : '(pendiente de evaluar)')
      return [ind.campo, nivel || '', texto]
    })

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Campo', 'Nivel', 'Texto diagnóstico']],
      body,
      styles: { fontSize: 8, cellPadding: 3, valign: 'top', textColor: [28, 40, 51] },
      headStyles: { fillColor: [33, 97, 140], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 36 },
        2: { cellWidth: 'auto' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 1) {
          const code = String(data.cell.raw || '')
          const n = getActiveNiveles().find((x) => x.code === code)
          if (n) {
            data.cell.styles.fillColor = hexToRgb(n.bg)
            data.cell.styles.textColor = [28, 40, 51]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.halign = 'center'
          }
        }
      },
    })

    y = (doc.lastAutoTable?.finalY || y) + 12
    if (y > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage()
      y = margin
    }

    doc.setFillColor(39, 174, 96)
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.rect(margin, y, pageW - margin * 2, 16, 'F')
    doc.text('RECOMENDACIONES / ESTRATEGIAS', margin + 6, y + 11)
    y += 20
    doc.setDrawColor(220)
    doc.setFillColor(232, 248, 245)
    doc.rect(margin, y, pageW - margin * 2, 50, 'FD')
  })

  const stamp = new Date().toISOString().slice(0, 10)
  const grupo = (meta.grupo || 'Grupo').replace(/\s+/g, '_')
  const filename = `Reportes_Todos_${grupo}_${stamp}.pdf`
  await savePdfBlob(doc.output('blob'), filename)
  return alumnos.length
}

async function savePdfBlob(blob, suggestedName) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'PDF',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err) {
      if (err && err.name === 'AbortError') throw new Error('Guardado cancelado.')
      // Si falla el picker, cae al download clásico
    }
  }
  const { saveAs } = await import('file-saver')
  saveAs(blob, suggestedName)
}

function cellText(cell) {
  if (!cell || cell.value == null) return ''
  const v = cell.value
  if (typeof v === 'object') {
    if (v.result != null) return String(v.result).trim()
    if (v.richText) return v.richText.map((t) => t.text).join('').trim()
    if (v.text) return String(v.text).trim()
    return ''
  }
  return String(v).trim()
}

function hexToRgb(hex) {
  const h = (hex || 'FFFFFF').replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
