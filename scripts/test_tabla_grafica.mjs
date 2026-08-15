import { writeFileSync } from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { CAMPOS } from '../src/data/catalogoFase2.js'
import { injectNivelCharts } from '../src/excel/injectNivelCharts.js'

function colLetter(n) {
  let s = ''
  let x = n
  while (x > 0) {
    const m = (x - 1) % 26
    s = String.fromCharCode(65 + m) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

const items = []
for (const campo of CAMPOS) {
  const c0 = campo.contenidos?.[0]
  const p0 = c0?.pdas?.[0]
  if (!c0 || !p0) continue
  items.push({
    campo,
    shortCode: p0.codigo || `${campo.prefix}PDA1`,
    pda: p0,
  })
}

const wb = new ExcelJS.Workbook()
const ev = wb.addWorksheet('Evaluacion')
ev.getCell('D5').value = 'RA'
ev.getCell('E5').value = 'L'
ev.getCell('F5').value = 'P'
ev.getCell('G5').value = 'E'

const ws = wb.addWorksheet('TABLA Y GRAFICA')
const niveles = ['RA', 'P', 'E', 'L']
const groups = []
let i = 0
while (i < items.length) {
  const id = items[i].campo.id
  let j = i
  while (j < items.length && items[j].campo.id === id) j++
  groups.push({
    campo: items[i].campo,
    items: items.slice(i, j),
    evStartCol: 4 + i,
    matrixStart: 2 + i,
    matrixEnd: 2 + j - 1,
  })
  i = j
}

let col = 2
groups.forEach((g) => {
  const c1 = col
  const c2 = col + g.items.length - 1
  g.matrixStart = c1
  g.matrixEnd = c2
  ws.getCell(1, c1).value = g.campo.nombre
  if (c1 !== c2) ws.mergeCells(1, c1, 1, c2)
  g.items.forEach((it, k) => {
    const c = c1 + k
    const evCol = colLetter(g.evStartCol + k)
    niveles.forEach((nv, ni) => {
      ws.getCell(2 + ni, c).value = {
        formula: `COUNTIF(Evaluacion!${evCol}$5:${evCol}$34,"${nv}")`,
      }
    })
  })
  col = c2 + 1
})
niveles.forEach((nv, ni) => {
  ws.getCell(2 + ni, 1).value = nv
})

const helperStart = 2 + items.length + 2
const chartSpecs = []
groups.forEach((g, gi) => {
  const hc = helperStart + gi
  ws.getCell(1, hc).value = g.campo.nombre
  niveles.forEach((_, ni) => {
    const r = 2 + ni
    const a = colLetter(g.matrixStart)
    const b = colLetter(g.matrixEnd)
    ws.getCell(r, hc).value = {
      formula: g.matrixStart === g.matrixEnd ? `${a}${r}` : `SUM(${a}${r}:${b}${r})`,
    }
  })
  const hLetter = colLetter(hc)
  const chartLeft = helperStart + groups.length + 1
  chartSpecs.push({
    sheetName: 'TABLA Y GRAFICA',
    title: g.campo.nombre,
    catFormula: `'TABLA Y GRAFICA'!$A$2:$A$5`,
    valFormula: `'TABLA Y GRAFICA'!$${hLetter}$2:$${hLetter}$5`,
    seriesTitleFormula: `'TABLA Y GRAFICA'!$${hLetter}$1`,
    colors: ['FF0000', 'FFFF00', '92D050', '00B050'],
    from: { col: chartLeft - 1, row: gi * 11 },
    to: { col: chartLeft - 1 + 7, row: gi * 11 + 10 },
  })
})

let buf = await wb.xlsx.writeBuffer()
buf = await injectNivelCharts(buf, chartSpecs)
const out = path.join(process.env.TEMP || '.', 'test_tabla_grafica.xlsx')
writeFileSync(out, Buffer.from(buf))
console.log('wrote', out)

const zip = await JSZip.loadAsync(buf)
const wbXml = await zip.file('xl/workbook.xml').async('string')
console.log('sheet ok', wbXml.includes('TABLA Y GRAFICA'))
console.log(
  'parts',
  Object.keys(zip.files).filter((f) => /chart|drawing/i.test(f)),
)
console.log('campos', groups.map((g) => g.campo.nombre).join(' | '))
console.log('charts specs', chartSpecs.length)
