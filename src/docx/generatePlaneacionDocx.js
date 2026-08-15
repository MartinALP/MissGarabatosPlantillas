import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  HeightRule,
  Packer,
  PageOrientation,
  convertInchesToTwip,
  Paragraph,
  PageBreak,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextDirection,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'
import { getCampo, getContenido, getPda, parsePdaKey } from '../data/catalogoFase2'
import { EJES_ARTICULADORES, EJE_FILL_ON, EJE_FILL_OFF, EJE_TEXT_ON, EJE_TEXT_OFF } from '../data/ejesArticuladores'

const FONT = 'Century Gothic'
const PAGE_W = 14400
const HALF_W = 7200
const CAMPO_PASTEL = {
  lenguajes: { fill: 'F5CBA7', text: '6E2C00' },
  saberes: { fill: 'AED6F1', text: '1A5276' },
  etica: { fill: 'A9DFBF', text: '145A32' },
  humano: { fill: 'D2B4DE', text: '4A235A' },
}
const GRAY = 'E5E8E8'
const EDGE = '8D959B'
const DIAS = [
  { nom: 'Lunes', fill: 'FCF3CF' },
  { nom: 'Martes', fill: 'D5F5E3' },
  { nom: 'Miércoles', fill: 'D6EAF8' },
  { nom: 'Jueves', fill: 'FDEBD0' },
  { nom: 'Viernes', fill: 'F4ECF7' },
]

function borders() {
  const b = { style: BorderStyle.SINGLE, size: 8, color: EDGE }
  return { top: b, bottom: b, left: b, right: b }
}

function cell(text, opts = {}) {
  const {
    fill,
    color = '1C2833',
    bold = false,
    align = AlignmentType.LEFT,
    valign = VerticalAlign.CENTER,
    width,
    span,
    rowSpan,
    italics = false,
    size = 20,
    textDirection,
    margins,
  } = opts
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    columnSpan: span,
    rowSpan,
    verticalAlign: valign,
    textDirection,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    borders: borders(),
    margins: margins || { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text: text || ' ',
            font: FONT,
            size,
            bold,
            italics,
            color,
          }),
        ],
      }),
    ],
  })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text: text || '',
        font: FONT,
        size: opts.size || 22,
        bold: opts.bold,
        color: opts.color || '1C2833',
        italics: opts.italics,
      }),
    ],
  })
}

function heading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 160 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text, font: FONT, size: 32, bold: true, color: '2C3E50' }),
    ],
  })
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

function metaTable(meta, modalidad) {
  const rows = [
    ['Jardín / Escuela', meta.escuela || '____________________', 'CCT', '____________________'],
    ['Grupo y grado', meta.grupo || '____________________', 'Educadora', meta.docente || '____________________'],
    ['Periodo / duración', meta.periodo || '____________________', 'Modalidad de trabajo', modalidad?.nombre || ''],
  ]
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    rows: rows.map((r) => new TableRow({
      children: [
        cell(r[0], { fill: 'F5EEF8', bold: true, width: 3140, size: 18 }),
        cell(r[1], { width: 4060, size: 20 }),
        cell(r[2], { fill: 'F5EEF8', bold: true, width: 3140, size: 18 }),
        cell(r[3], { width: 4060, size: 20, color: '6C3483' }),
      ],
    })),
  })
}

function fillBox(title, hint, fill) {
  return new Table({
    width: { size: HALF_W, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [cell(title, { fill: GRAY, bold: true, align: AlignmentType.CENTER, span: 1, width: HALF_W, size: 20 })],
      }),
      new TableRow({
        height: { value: 1100, rule: HeightRule.ATLEAST },
        children: [cell(hint, { fill, italics: true, color: '7F8C8D', valign: VerticalAlign.TOP, width: HALF_W, size: 18 })],
      }),
    ],
  })
}

function pdaTable(items) {
  const header = new TableRow({
    children: ['CAMPOS', 'CONTENIDOS', 'PDA'].map((t) =>
      cell(t, { fill: GRAY, bold: true, align: AlignmentType.CENTER, size: 20 }),
    ),
  })
  const groups = []
  for (const it of items) {
    const id = it?.campo?.id || it?.campo?.nombre || 'x'
    const last = groups[groups.length - 1]
    if (last && last.id === id) last.rows.push(it)
    else groups.push({ id, campo: it.campo, rows: [it] })
  }
  const body = []
  for (const g of groups) {
    const pastel = CAMPO_PASTEL[g.id] || { fill: 'F5EEF8', text: '4A235A' }
    const n = g.rows.length
    g.rows.forEach((it, i) => {
      const children = []
      if (i === 0) {
        children.push(cell(g.campo?.nombre || '', {
          fill: pastel.fill,
          color: pastel.text,
          bold: true,
          align: AlignmentType.CENTER,
          valign: VerticalAlign.CENTER,
          width: 2570,
          size: 20,
          rowSpan: n,
        }))
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
        children.push(cell(it.contenido?.nombre || '', {
          width: 4000,
          size: 18,
          align: AlignmentType.BOTH,
          valign: VerticalAlign.CENTER,
          rowSpan: span,
        }))
      }
      const grado = it.pda?.grado ? `${it.pda.grado}°  ·  ` : ''
      children.push(cell(`${grado}${it.pda?.texto || ''}`, {
        width: 7830,
        size: 18,
        align: AlignmentType.BOTH,
        valign: VerticalAlign.CENTER,
      }))
      body.push(new TableRow({
        height: { value: 900, rule: HeightRule.ATLEAST },
        children,
      }))
    })
  }
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [2570, 4000, 7830],
    rows: [header, ...body],
  })
}

function momentoName(m) {
  return String(m?.titulo || 'Momento').replace(/^\d+\.\s*/, '')
}

function modalidadCuadro(modalidad) {
  const momW = 1400
  const actW = PAGE_W - momW
  const headerFill = 'CC99FF'
  const sideFill = 'EEDDFF'
  const momentos = modalidad?.momentos || []
  const header = new TableRow({
    children: [
      cell('Momentos', {
        fill: headerFill, bold: true, align: AlignmentType.CENTER, width: momW, size: 22,
      }),
      cell('Actividades', {
        fill: headerFill, bold: true, align: AlignmentType.CENTER, width: actW, size: 22,
      }),
    ],
  })
  const body = momentos.map((m) => {
    const nombre = momentoName(m)
    const altoNombre = Math.max(1600, 280 + nombre.length * 95)
    return new TableRow({
      height: { value: altoNombre, rule: HeightRule.ATLEAST },
      children: [
        cell(nombre, {
          fill: sideFill,
          bold: true,
          align: AlignmentType.CENTER,
          width: momW,
          size: 20,
          valign: VerticalAlign.CENTER,
          textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
        }),
        cell(m.intencion || ' ', {
          width: actW, size: 20, valign: VerticalAlign.TOP, align: AlignmentType.LEFT, color: '1C2833',
        }),
      ],
    })
  })
  const materiales = new TableRow({
    height: { value: 1600, rule: HeightRule.ATLEAST },
    children: [
      cell('Materiales', {
        fill: 'B8E6E0', bold: true, color: '0E6655', align: AlignmentType.CENTER, width: momW, size: 22,
      }),
      cell('Escribe aquí los recursos necesarios…', {
        width: actW, size: 18, valign: VerticalAlign.TOP, italics: true, color: '7F8C8D',
      }),
    ],
  })
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    rows: [header, ...body, materiales],
  })
}

function cronogramaWeek(label) {
  const head = new TableRow({
    children: DIAS.map((d) =>
      cell(d.nom, { fill: d.fill, bold: true, align: AlignmentType.CENTER, width: 2880, size: 18 }),
    ),
  })
  const actividad = new TableRow({
    height: { value: 1600, rule: HeightRule.ATLEAST },
    children: DIAS.map((d) =>
      cell('Actividad', { fill: 'FFFFFF', italics: true, color: '7F8C8D', valign: VerticalAlign.TOP, width: 2880, size: 16 }),
    ),
  })
  const evidencia = new TableRow({
    height: { value: 1100, rule: HeightRule.ATLEAST },
    children: DIAS.map((d) =>
      cell('Evidencia / Tarea', { fill: 'FFFFFF', italics: true, color: '7F8C8D', valign: VerticalAlign.TOP, width: 2880, size: 16 }),
    ),
  })
  return [
    para(label, { bold: true, color: '6C3483', size: 20, after: 80 }),
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      rows: [head, actividad, evidencia],
    }),
  ]
}

function porDiaCuadro() {
  const c0 = 1100
  const c1 = PAGE_W - c0
  const vert = {
    textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
    align: AlignmentType.CENTER,
    valign: VerticalAlign.CENTER,
    bold: true,
    color: 'FFFFFF',
    size: 22,
    width: c0,
    margins: { top: 80, bottom: 80, left: 40, right: 40 },
  }
  const dias = [
    { nom: 'Lunes', head: 'F4D03F', h: 1400 },
    { nom: 'Martes', head: '27AE60', h: 2100 },
    { nom: 'Miércoles', head: '2980B9', h: 2000 },
    { nom: 'Jueves', head: 'E67E22', h: 1800 },
    { nom: 'Viernes', head: '8E44AD', h: 1800 },
  ]
  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [c0, c1],
    rows: [
      new TableRow({
        height: { value: 420, rule: HeightRule.ATLEAST },
        children: [
          cell('Dia', { fill: 'CC99FF', bold: true, align: AlignmentType.CENTER, width: c0, size: 22 }),
          cell('Actividades', { fill: 'CC99FF', bold: true, align: AlignmentType.CENTER, width: c1, size: 22 }),
        ],
      }),
      ...dias.map((d) => new TableRow({
        height: { value: d.h, rule: HeightRule.ATLEAST },
        children: [
          cell(d.nom, { ...vert, fill: d.head }),
          cell(' ', { width: c1, valign: VerticalAlign.TOP }),
        ],
      })),
      new TableRow({
        height: { value: 1200, rule: HeightRule.ATLEAST },
        children: [
          cell('Materiales', { ...vert, fill: '009999', size: 20 }),
          cell(' ', { width: c1, valign: VerticalAlign.TOP }),
        ],
      }),
    ],
  })
}

function saltoDePagina() {
  return new Paragraph({
    children: [new PageBreak()],
  })
}

function pageProps() {
  return {
    page: {
      size: {
        width: convertInchesToTwip(8.5),
        height: convertInchesToTwip(11),
        orientation: PageOrientation.LANDSCAPE,
      },
      margin: { top: 560, bottom: 560, left: 720, right: 720 },
    },
  }
}

export async function generatePlaneacionDocx({ meta = {}, pdaKeys = [], modalidad, porDia = false, ejes = [] }) {
  const items = buildItems(pdaKeys)
  const portada = [
    para('PLANEACIÓN DIDÁCTICA · Fase 2 Preescolar', { bold: true, size: 36, align: AlignmentType.CENTER, color: '6C3483', after: 200 }),
    metaTable(meta, modalidad),
    para('', { after: 160 }),
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: HALF_W, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
              children: [fillBox('Propósito (llena aquí)', 'Escribe el propósito de esta planeación…', 'FCF3CF')],
            }),
            new TableCell({
              width: { size: HALF_W, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
              children: [fillBox('Justificación (llena aquí)', '¿Por qué es pertinente en tu grupo y comunidad?', 'D5F5E3')],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: HALF_W, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
              children: [fillBox('Vinculación con la comunidad', 'Entrevistas, reuniones, cierre con familias…', 'D6EAF8')],
            }),
            new TableCell({
              width: { size: HALF_W, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
              children: [fillBox('Actividades permanentes', 'Saludo, pase de lista, tiempo de compartir, lavado de manos, refrigerio…', 'FDEBD0')],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: HALF_W, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
              children: [fillBox('Ajustes razonables', 'Apoyos, mediaciones y adecuaciones para que todas las niñas y los niños participen…', 'E8DAEF')],
            }),
            new TableCell({
              width: { size: HALF_W, type: WidthType.DXA },
              borders: { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } },
              children: [fillBox('Evaluación formativa', 'Cómo observarás el avance durante las actividades (evidencias, preguntas, registro)…', 'FADBD8')],
            }),
          ],
        }),
      ],
    }),
    para('Ejes articuladores', { bold: true, align: AlignmentType.CENTER, color: '6C3483', size: 22, after: 80 }),
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      rows: [
        new TableRow({
          height: { value: 1080, rule: HeightRule.ATLEAST },
          children: EJES_ARTICULADORES.map((e) => {
            const on = ejes.includes(e)
            return cell(e, {
              fill: on ? EJE_FILL_ON : EJE_FILL_OFF,
              color: on ? EJE_TEXT_ON : EJE_TEXT_OFF,
              bold: on,
              align: AlignmentType.CENTER,
              valign: VerticalAlign.CENTER,
              size: 14,
              margins: { top: 80, bottom: 80, left: 50, right: 50 },
            })
          }),
        }),
      ],
    }),
  ]

  const children = [
    ...portada,
    saltoDePagina(),
    heading('Campos · contenidos · PDA'),
    pdaTable(items),
    saltoDePagina(),
  ]
  if (porDia) {
    children.push(heading('Planeación por día'))
    children.push(porDiaCuadro())
    children.push(saltoDePagina())
    children.push(heading('Cronograma'))
    children.push(...cronogramaWeek('Semana 1  ·  del ________'))
    children.push(para('', { after: 200 }))
    children.push(...cronogramaWeek('Semana 2  ·  del ________'))
  } else {
    children.push(heading(modalidad?.nombre ? `Modalidad: ${modalidad.nombre}` : 'Modalidad de trabajo'))
    children.push(modalidadCuadro(modalidad))
    children.push(saltoDePagina())
    children.push(heading('Cronograma'))
    children.push(...cronogramaWeek('Semana 1  ·  del ________'))
    children.push(para('', { after: 200 }))
    children.push(...cronogramaWeek('Semana 2  ·  del ________'))
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT } } },
    },
    sections: [{ properties: pageProps(), children }],
  })

  const blob = await Packer.toBlob(doc)
  const grupo = String(meta.grupo || 'Grupo').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') || 'Grupo'
  const modo = String(modalidad?.nombre || 'Modalidad').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') || 'Modalidad'
  saveAs(blob, `Planeacion_${grupo}_${modo}.docx`)
}
