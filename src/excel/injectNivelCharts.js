/**
 * Inyecta gráficas de barras horizontales (una por campo) en la hoja Tablas y Graficas Grupal.
 * ExcelJS no genera charts; se agregan al OOXML vía JSZip.
 */
import JSZip from 'jszip'

const DRAWING_CT =
  'application/vnd.openxmlformats-officedocument.drawing+xml'
const CHART_CT =
  'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'
const DRAWING_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing'
const CHART_REL =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'

function nextRid(relsXml) {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]))
  return Math.max(0, ...ids) + 1
}

function findSheetPath(workbookXml, workbookRels, sheetName) {
  const escaped = sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reNameFirst = new RegExp(
    `<sheet[^>]*name="${escaped}"[^>]*r:id="(rId\\d+)"`,
  )
  const reIdFirst = new RegExp(
    `<sheet[^>]*r:id="(rId\\d+)"[^>]*name="${escaped}"`,
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
  const target = m[1].replace(/^\.\.\//, '').replace(/^\.\//, '')
  if (target.startsWith('xl/')) return target
  if (target.startsWith('worksheets/')) return `xl/${target}`
  return `xl/${target}`
}

function ensureXmlns(sheetXml, name, url) {
  if (sheetXml.includes(`xmlns:${name}=`)) return sheetXml
  return sheetXml.replace('<worksheet ', `<worksheet xmlns:${name}="${url}" `)
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildChartXml(spec) {
  const title = escapeXml(spec.title)
  const catF = escapeXml(spec.catFormula)
  const valF = escapeXml(spec.valFormula)
  const colors = spec.colors || ['A9DFBF', 'D5F5E3', 'F9E79F', 'F5B7B1']
  const dPts = colors
    .map(
      (hex, idx) => `
      <c:dPt>
        <c:idx val="${idx}"/>
        <c:spPr>
          <a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>
          <a:ln><a:noFill/></a:ln>
        </c:spPr>
      </c:dPt>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title>
      <c:tx><c:rich>
        <a:bodyPr/>
        <a:lstStyle/>
        <a:p>
          <a:pPr><a:defRPr sz="1400" b="1"/></a:pPr>
          <a:r><a:rPr sz="1400" b="1"/><a:t>${title}</a:t></a:r>
        </a:p>
      </c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx>
            <c:strRef>
              <c:f>${escapeXml(spec.seriesTitleFormula)}</c:f>
            </c:strRef>
          </c:tx>
          ${dPts}
          <c:dLbls>
            <c:showLegendKey val="0"/>
            <c:showVal val="1"/>
            <c:showCatName val="0"/>
            <c:showSerName val="0"/>
            <c:showPercent val="0"/>
            <c:showBubbleSize val="0"/>
          </c:dLbls>
          <c:cat>
            <c:strRef><c:f>${catF}</c:f></c:strRef>
          </c:cat>
          <c:val>
            <c:numRef><c:f>${valF}</c:f></c:numRef>
          </c:val>
        </c:ser>
        <c:gapWidth val="40"/>
        <c:axId val="1"/>
        <c:axId val="2"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="1"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="2"/>
        <c:crosses val="autoZero"/>
        <c:auto val="1"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="2"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:majorGridlines/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="1"/>
        <c:crosses val="autoZero"/>
        <c:crossBetween val="between"/>
      </c:valAx>
    </c:plotArea>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
</c:chartSpace>`
}

function buildDrawingXml(anchors) {
  const frames = anchors
    .map((a, i) => {
      const rid = `rId${i + 1}`
      const name = escapeXml(a.name || `Grafico ${i + 1}`)
      return `
  <xdr:twoCellAnchor>
    <xdr:from>
      <xdr:col>${a.from.col}</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>${a.from.row}</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:from>
    <xdr:to>
      <xdr:col>${a.to.col}</xdr:col>
      <xdr:colOff>0</xdr:colOff>
      <xdr:row>${a.to.row}</xdr:row>
      <xdr:rowOff>0</xdr:rowOff>
    </xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${i + 2}" name="${name}"/>
        <xdr:cNvGraphicFramePr>
          <a:graphicFrameLocks noGrp="1"/>
        </xdr:cNvGraphicFramePr>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm>
        <a:off x="0" y="0"/>
        <a:ext cx="0" cy="0"/>
      </xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rid}"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${frames}
</xdr:wsDr>`
}

/**
 * @param {ArrayBuffer|Uint8Array|Buffer} xlsxBuffer
 * @param {{ sheetName: string, title: string, catFormula: string, valFormula: string, seriesTitleFormula: string, colors?: string[], from: {col:number,row:number}, to: {col:number,row:number} }[]} specs
 */
export async function injectNivelCharts(xlsxBuffer, specs) {
  if (!specs?.length) return xlsxBuffer

  const zip = await JSZip.loadAsync(xlsxBuffer)
  const workbookXml = await zip.file('xl/workbook.xml').async('string')
  const workbookRels = await zip.file('xl/_rels/workbook.xml.rels').async('string')
  const sheetName = specs[0].sheetName
  const sheetPath = findSheetPath(workbookXml, workbookRels, sheetName)
  if (!sheetPath || !zip.file(sheetPath)) {
    console.warn(`No se encontró hoja ${sheetName} para gráficas`)
    return xlsxBuffer
  }

  // drawing / chart file names unique in package
  let drawingIdx = 1
  while (zip.file(`xl/drawings/drawing${drawingIdx}.xml`)) drawingIdx += 1
  const drawingPath = `xl/drawings/drawing${drawingIdx}.xml`
  const drawingRelsPath = `xl/drawings/_rels/drawing${drawingIdx}.xml.rels`

  let chartIdx = 1
  const chartPaths = []
  for (let i = 0; i < specs.length; i++) {
    while (zip.file(`xl/charts/chart${chartIdx}.xml`)) chartIdx += 1
    const path = `xl/charts/chart${chartIdx}.xml`
    chartPaths.push(path)
    zip.file(path, buildChartXml(specs[i]))
    chartIdx += 1
  }

  const drawingRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    chartPaths
      .map(
        (p, i) =>
          `<Relationship Id="rId${i + 1}" Type="${CHART_REL}" Target="../charts/${p.split('/').pop()}"/>`,
      )
      .join('') +
    `</Relationships>`
  zip.file(drawingRelsPath, drawingRels)
  zip.file(
    drawingPath,
    buildDrawingXml(
      specs.map((s) => ({
        name: `Grafico ${s.title}`,
        from: s.from,
        to: s.to,
      })),
    ),
  )

  const sheetRelsPath = sheetPath
    .replace('xl/worksheets/', 'xl/worksheets/_rels/')
    .replace(/\.xml$/, '.xml.rels')
  let sheetRels = zip.file(sheetRelsPath)
    ? await zip.file(sheetRelsPath).async('string')
    : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'

  const ridDraw = `rId${nextRid(sheetRels)}`
  const drawingTarget = `../drawings/drawing${drawingIdx}.xml`
  sheetRels = sheetRels.replace(
    '</Relationships>',
    `<Relationship Id="${ridDraw}" Type="${DRAWING_REL}" Target="${drawingTarget}"/></Relationships>`,
  )
  zip.file(sheetRelsPath, sheetRels)

  let sheetXml = await zip.file(sheetPath).async('string')
  sheetXml = ensureXmlns(
    sheetXml,
    'r',
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  )
  if (!sheetXml.includes(`r:id="${ridDraw}"`) && !sheetXml.includes('<drawing ')) {
    const drawingTag = `<drawing r:id="${ridDraw}"/>`
    // OOXML: <drawing> debe ir ANTES de <legacyDrawing>; si no, Excel repara y vacía la hoja
    if (sheetXml.includes('<legacyDrawing')) {
      sheetXml = sheetXml.replace('<legacyDrawing', `${drawingTag}<legacyDrawing`)
    } else if (sheetXml.includes('<legacyDrawingHF')) {
      sheetXml = sheetXml.replace('<legacyDrawingHF', `${drawingTag}<legacyDrawingHF`)
    } else {
      sheetXml = sheetXml.replace('</worksheet>', `${drawingTag}</worksheet>`)
    }
  }
  zip.file(sheetPath, sheetXml)

  let ct = await zip.file('[Content_Types].xml').async('string')
  if (!ct.includes(DRAWING_CT) || !ct.includes(`PartName="/${drawingPath}"`)) {
    ct = ct.replace(
      '</Types>',
      `<Override PartName="/${drawingPath}" ContentType="${DRAWING_CT}"/></Types>`,
    )
  }
  for (const p of chartPaths) {
    if (!ct.includes(`PartName="/${p}"`)) {
      ct = ct.replace(
        '</Types>',
        `<Override PartName="/${p}" ContentType="${CHART_CT}"/></Types>`,
      )
    }
  }
  // Ensure Default for nothing special; Override is enough
  zip.file('[Content_Types].xml', ct)

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  })
}
