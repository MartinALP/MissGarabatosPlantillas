# -*- coding: utf-8 -*-
"""Generate canvas with Fase 2 catalog tables."""
import json
import re
from pathlib import Path

src = Path(r"c:\repos\missgarabatos\rubrica-evaluacion\src\data\catalogoFase2.js")
text = src.read_text(encoding="utf-8")
m = re.search(r"export const CAMPOS = (\[.*\])\n\nexport function getCampo", text, re.S)
data = json.loads(m.group(1))

compact = []
for c in data:
    compact.append(
        {
            "id": c["id"],
            "nombre": c["nombre"],
            "prefix": c["prefix"],
            "contenidos": [
                {
                    "id": x["id"],
                    "nombre": x["nombre"],
                    "pdas": [
                        {
                            "codigo": pda["codigo"],
                            "grado": pda["grado"],
                            "texto": pda["texto"],
                        }
                        for pda in x["pdas"]
                    ],
                }
                for x in c["contenidos"]
            ],
        }
    )

payload = json.dumps(compact, ensure_ascii=False)

tsx = r'''import { useMemo } from "react"
import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
} from "cursor/canvas"

const CAMPOS = __PAYLOAD__ as const

export default function CatalogoFase2Pdas() {
  const [campoId, setCampoId] = useCanvasState<string>("campoId", CAMPOS[0].id)
  const [grado, setGrado] = useCanvasState<string>("grado", "todos")
  const [contenidoId, setContenidoId] = useCanvasState<string>("contenidoId", "todos")

  const campo = CAMPOS.find((c) => c.id === campoId) ?? CAMPOS[0]

  const totals = useMemo(() => {
    const contenidos = CAMPOS.reduce((n, c) => n + c.contenidos.length, 0)
    const pdas = CAMPOS.reduce(
      (n, c) => n + c.contenidos.reduce((m, x) => m + x.pdas.length, 0),
      0,
    )
    return { campos: CAMPOS.length, contenidos, pdas }
  }, [])

  const contenidoRows = useMemo(() => {
    return campo.contenidos.map((c) => {
      const g1 = c.pdas.filter((p) => p.grado === 1).length
      const g2 = c.pdas.filter((p) => p.grado === 2).length
      const g3 = c.pdas.filter((p) => p.grado === 3).length
      return {
        id: c.id,
        contenido: c.nombre,
        total: c.pdas.length,
        g1,
        g2,
        g3,
      }
    })
  }, [campo])

  const pdaRows = useMemo(() => {
    const conts =
      contenidoId === "todos"
        ? campo.contenidos
        : campo.contenidos.filter((c) => c.id === contenidoId)
    const rows: { codigo: string; grado: string; contenido: string; pda: string }[] = []
    for (const c of conts) {
      for (const p of c.pdas) {
        if (grado !== "todos" && String(p.grado) !== grado) continue
        rows.push({
          codigo: p.codigo,
          grado: p.grado + "°",
          contenido: c.id,
          pda: p.texto,
        })
      }
    }
    return rows
  }, [campo, contenidoId, grado])

  const campoOptions = CAMPOS.map((c) => ({
    value: c.id,
    label: c.nombre + " (" + c.prefix + "PDA)",
  }))

  const contenidoOptions = [
    { value: "todos", label: "Todos los contenidos" },
    ...campo.contenidos.map((c) => ({
      value: c.id,
      label: c.id + " · " + c.pdas.length + " PDA",
    })),
  ]

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Catálogo rescatado · Programa Sintético Fase 2</H1>
        <Text tone="secondary">
          Fuente: PDF oficial SEP. Campos → Contenidos → PDA por grado (1°, 2°, 3°).
          Extraído para la plataforma Miss Garabatos.
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <Stat value={String(totals.campos)} label="Campos formativos" />
        <Stat value={String(totals.contenidos)} label="Contenidos" />
        <Stat value={String(totals.pdas)} label="PDA totales" />
      </Grid>

      <Callout tone="info" title="Cómo leer esta vista">
        Elige un campo para ver sus contenidos (conteo por grado) y el detalle de cada PDA
        con código LPDA / SPDA / EPDA / HPDA.
      </Callout>

      <Card>
        <CardHeader
          title="Filtros"
          trailing={<Pill tone="neutral">{pdaRows.length} PDA visibles</Pill>}
        />
        <CardBody>
          <Row gap={12} align="center" wrap>
            <Stack gap={4} style={{ minWidth: 260, flex: 1 }}>
              <Text size="small" weight="semibold">Campo formativo</Text>
              <Select
                value={campoId}
                onChange={(v) => {
                  setCampoId(v)
                  setContenidoId("todos")
                }}
                options={campoOptions}
              />
            </Stack>
            <Stack gap={4} style={{ minWidth: 200, flex: 1 }}>
              <Text size="small" weight="semibold">Contenido</Text>
              <Select value={contenidoId} onChange={setContenidoId} options={contenidoOptions} />
            </Stack>
            <Stack gap={4} style={{ minWidth: 140 }}>
              <Text size="small" weight="semibold">Grado</Text>
              <Select
                value={grado}
                onChange={setGrado}
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "1", label: "1°" },
                  { value: "2", label: "2°" },
                  { value: "3", label: "3°" },
                ]}
              />
            </Stack>
          </Row>
        </CardBody>
      </Card>

      <Stack gap={8}>
        <H2>{campo.nombre}</H2>
        <Text tone="secondary">Prefijo de código: {campo.prefix}PDA + grado</Text>
      </Stack>

      <Stack gap={8}>
        <H3>Contenidos del campo</H3>
        <Table
          headers={["ID", "Contenido", "1°", "2°", "3°", "Total PDA"]}
          columnAlign={["left", "left", "right", "right", "right", "right"]}
          rows={contenidoRows.map((r) => [
            r.id,
            r.contenido,
            String(r.g1),
            String(r.g2),
            String(r.g3),
            String(r.total),
          ])}
        />
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H3>PDA detallados</H3>
        <Text size="small" tone="secondary">
          Cada fila es un Proceso de desarrollo de aprendizaje del catálogo de la app.
        </Text>
        <Table
          stickyHeader
          headers={["Código", "Grado", "Contenido", "Texto del PDA"]}
          columnAlign={["left", "center", "left", "left"]}
          rows={pdaRows.map((r) => [r.codigo, r.grado, r.contenido, r.pda])}
        />
      </Stack>
    </Stack>
  )
}
'''

out = Path(r"C:\Users\marti\.cursor\projects\c-repos-CuthisV1\canvases\catalogo-fase2-pdas.canvas.tsx")
out.write_text(tsx.replace("__PAYLOAD__", payload), encoding="utf-8")
print("wrote", out)
print(
    "pdas",
    sum(len(pda) for c in compact for cont in c["contenidos"] for pda in [cont["pdas"]]),
)
