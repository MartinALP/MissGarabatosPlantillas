import ExcelJS from 'exceljs'
import { readFileSync, writeFileSync } from 'fs'
import JSZip from 'jszip'
import { injectVbaProject } from '../src/excel/injectMacro.js'

const wb = new ExcelJS.Workbook()
const alu = wb.addWorksheet('Alumnos')
alu.getCell('B5').value = 'Perez'
alu.getCell('D5').value = 'Ana'
wb.addWorksheet('Evaluacion')
const rep = wb.addWorksheet('Reporte_Individual')
rep.getCell('C3').value = 1
rep.getCell('A1').value = 'REPORTE TEST'
rep.mergeCells('H2:J3')
wb.addWorksheet('Alumnos en riesgos')
wb.addWorksheet('Catalogo_Descripciones')

const buf = await wb.xlsx.writeBuffer()
const xlsm = await injectVbaProject(
  buf,
  readFileSync('./src/excel/assets/vbaProject.bin'),
  {
    vmlText: readFileSync('./src/excel/assets/vmlDrawing_pdfBtn.vml', 'utf8'),
  },
)
writeFileSync('./templates/_btn_final.xlsm', Buffer.from(xlsm))

const z = await JSZip.loadAsync(xlsm)
console.log('vml', !!z.file('xl/drawings/vmlDrawing_pdfBtn.vml'))
console.log('vba', !!z.file('xl/vbaProject.bin'))
const wbXml = await z.file('xl/workbook.xml').async('string')
console.log(
  'sheets',
  [...wbXml.matchAll(/name="([^"]+)"/g)].map((m) => m[1]),
)
const sheet3 = await z.file('xl/worksheets/sheet3.xml').async('string')
console.log('legacyDrawing', sheet3.includes('legacyDrawing'))
console.log('macro attr', sheet3.includes('GenerarPDFTodosReportes'))
