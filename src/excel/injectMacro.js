/**
 * Inyecta vbaProject.bin + botón de formulario "PDF TODOS LOS ALUMNOS"
 * en la hoja Reporte_Individual de un .xlsx (buffer ExcelJS) → .xlsm.
 */
import JSZip from 'jszip'

const VBA_REL =
  'http://schemas.microsoft.com/office/2006/relationships/vbaProject'
const VBA_CT = 'application/vnd.ms-office.vbaProject'
const MACRO_MAIN =
  'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
const SHEET_MAIN =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'
const VML_CT = 'application/vnd.openxmlformats-officedocument.vmlDrawing'
const VML_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing'

const VML_PATH = 'xl/drawings/vmlDrawing_pdfBtn.vml'

function nextRid(relsXml) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]))
  return Math.max(0, ...ids) + 1
}

function findSheetPath(workbookXml, workbookRels, sheetName) {
  const reNameFirst = new RegExp(
    `<sheet[^>]*name="${sheetName}"[^>]*r:id="(rId\\d+)"`,
  )
  const reIdFirst = new RegExp(
    `<sheet[^>]*r:id="(rId\\d+)"[^>]*name="${sheetName}"`,
  )
  const m = workbookXml.match(reNameFirst) || workbookXml.match(reIdFirst)
  if (!m) return null
  return resolveRid(workbookRels, m[1])
}

function resolveRid(relsXml, rid) {
  const re = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`)
  const re2 = new RegExp(`Target="([^"]+)"[^>]*Id="${rid}"`)
  const m = relsXml.match(re) || relsXml.match(re2)
  if (!m) return null
  const target = m[1].replace(/^\.\//, '')
  return target.startsWith('xl/') ? target : `xl/${target}`
}

function ensureXmlns(sheetXml, name, url) {
  if (sheetXml.includes(`xmlns:${name}=`)) return sheetXml
  return sheetXml.replace('<worksheet ', `<worksheet xmlns:${name}="${url}" `)
}

async function injectPdfButton(zip, vmlText) {
  const workbookXml = await zip.file('xl/workbook.xml').async('string')
  const workbookRels = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  const sheetPath = findSheetPath(
    workbookXml,
    workbookRels,
    'Reporte_Individual',
  )
  if (!sheetPath || !zip.file(sheetPath)) {
    console.warn('No se encontró hoja Reporte_Individual para el botón PDF')
    return
  }

  zip.file(VML_PATH, vmlText)

  const sheetRelsPath = sheetPath
    .replace('xl/worksheets/', 'xl/worksheets/_rels/')
    .replace(/\.xml$/, '.xml.rels')

  let sheetRels = zip.file(sheetRelsPath)
    ? await zip.file(sheetRelsPath).async('string')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'

  const ridVml = `rId${nextRid(sheetRels)}`
  sheetRels = sheetRels.replace(
    '</Relationships>',
    `<Relationship Id="${ridVml}" Type="${VML_REL}" Target="../drawings/vmlDrawing_pdfBtn.vml"/></Relationships>`,
  )
  zip.file(sheetRelsPath, sheetRels)

  let sheetXml = await zip.file(sheetPath).async('string')
  sheetXml = ensureXmlns(
    sheetXml,
    'r',
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  )

  if (!sheetXml.includes('legacyDrawing') && !sheetXml.includes('vmlDrawing_pdfBtn')) {
    sheetXml = sheetXml.replace(
      '</worksheet>',
      `<legacyDrawing r:id="${ridVml}"/></worksheet>`,
    )
  }
  zip.file(sheetPath, sheetXml)

  let ct = await zip.file('[Content_Types].xml').async('string')
  if (!ct.includes('Extension="vml"')) {
    ct = ct.replace(
      '<Default Extension="rels"',
      `<Default Extension="vml" ContentType="${VML_CT}"/><Default Extension="rels"`,
    )
  }
  zip.file('[Content_Types].xml', ct)
}

export async function injectVbaProject(xlsxBuffer, vbaBin, extras = {}) {
  const zip = await JSZip.loadAsync(xlsxBuffer)
  zip.file('xl/vbaProject.bin', vbaBin)

  let ct = await zip.file('[Content_Types].xml').async('string')
  if (!ct.includes('Extension="bin"')) {
    ct = ct.replace(
      '<Default Extension="rels"',
      `<Default Extension="bin" ContentType="${VBA_CT}"/><Default Extension="rels"`,
    )
  }
  if (ct.includes(SHEET_MAIN)) {
    ct = ct.replace(SHEET_MAIN, MACRO_MAIN)
  }
  zip.file('[Content_Types].xml', ct)

  let rels = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  if (!rels.includes('vbaProject')) {
    const next = nextRid(rels)
    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="rId${next}" Type="${VBA_REL}" Target="vbaProject.bin"/></Relationships>`,
    )
  }
  zip.file('xl/_rels/workbook.xml.rels', rels)

  if (extras.vmlText) {
    await injectPdfButton(zip, extras.vmlText)
  }

  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
  })
}

export async function loadVbaProjectBin() {
  const res = await fetch(new URL('./assets/vbaProject.bin', import.meta.url))
  if (!res.ok) {
    throw new Error('No se encontró vbaProject.bin (plantilla de macros).')
  }
  return res.arrayBuffer()
}

export async function loadPdfButtonAssets() {
  const vmlRes = await fetch(new URL('./assets/vmlDrawing_pdfBtn.vml', import.meta.url))
  if (!vmlRes.ok) {
    throw new Error('No se encontró el dibujo del botón PDF.')
  }
  return { vmlText: await vmlRes.text() }
}
