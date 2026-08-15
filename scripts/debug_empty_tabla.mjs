import { writeFileSync, readFileSync } from 'fs'
import path from 'path'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { CAMPOS } from '../src/data/catalogoFase2.js'
import { injectNivelCharts } from '../src/excel/injectNivelCharts.js'
import { injectVbaProject } from '../src/excel/injectMacro.js'

const wb = new ExcelJS.Workbook()
wb.addWorksheet('Alumnos')
wb.addWorksheet('Evaluacion')
const ws = wb.addWorksheet('TABLA Y GRAFICA')

// Simulate old bug: note creates legacyDrawing
ws.getCell('A1').value = 'TITULO VISIBLE'
ws.getCell('A4').value = 'RA'
ws.getCell('B2').value = CAMPOS[0].nombre
ws.getCell('B4').value = { formula: 'COUNTIF(Evaluacion!D$5:D$34,"RA")', result: 0 }
ws.getCell('B4').note = 'LPDA1' // creates legacyDrawing — chart inject must not break this

const specs = [
  {
    sheetName: 'TABLA Y GRAFICA',
    title: 'Lenguajes',
    catFormula: `'TABLA Y GRAFICA'!$A$4:$A$7`,
    valFormula: `'TABLA Y GRAFICA'!$B$4:$B$7`,
    seriesTitleFormula: `'TABLA Y GRAFICA'!$B$2`,
    colors: ['FF0000', 'FFFF00', '92D050', '00B050'],
    from: { col: 4, row: 0 },
    to: { col: 11, row: 10 },
  },
]

let buf = await wb.xlsx.writeBuffer()
let zip = await JSZip.loadAsync(buf)
let sheetPath = 'xl/worksheets/sheet3.xml'
let xml = await zip.file(sheetPath).async('string')
console.log('before legacyDrawing', xml.includes('legacyDrawing'), 'drawing', xml.includes('<drawing'))

buf = await injectNivelCharts(buf, specs)
zip = await JSZip.loadAsync(buf)
xml = await zip.file(sheetPath).async('string')
const drawIdx = xml.indexOf('<drawing')
const legIdx = xml.indexOf('<legacyDrawing')
console.log('after drawing@', drawIdx, 'legacy@', legIdx, 'orderOK', drawIdx >= 0 && (legIdx < 0 || drawIdx < legIdx))
console.log('still has TITULO/COUNTIF', xml.includes('COUNTIF'), await zip.file('xl/sharedStrings.xml').async('string').then(s => s.includes('TITULO')))

const vba = readFileSync('src/excel/assets/vbaProject.bin')
buf = await injectVbaProject(buf, vba)
zip = await JSZip.loadAsync(buf)
xml = await zip.file(sheetPath).async('string')
console.log('after VBA COUNTIF', xml.includes('COUNTIF'), 'drawing', xml.includes('<drawing'))

writeFileSync(path.join(process.env.TEMP, 'fix_tabla_order.xlsx'), Buffer.from(buf))
console.log('ok')
