# -*- coding: utf-8 -*-
"""Extrae Contenidos y PDA del Programa Sintético Fase 2 y genera catalogoFase2.js"""
import json
import re
from pathlib import Path

import pdfplumber

PDF = Path(r"c:\Users\marti\Downloads\Programa_Sintetico_Fase-2.pdf")
OUT_JSON = Path(__file__).parent / "fase2_catalog_raw.json"
OUT_JS = Path(__file__).resolve().parents[1] / "src" / "data" / "catalogoFase2.js"

OFFICIAL = {
    "lenguajes": [
        "Comunicación oral de necesidades, emociones, gustos, ideas y saberes, a través de los diversos lenguajes, desde una perspectiva comunitaria.",
        "Narración de historias mediante diversos lenguajes, en un ambiente donde niñas y niños participen y se apropien de la cultura, a través de diferentes textos.",
        "Recursos y juegos del lenguaje que fortalecen la diversidad de formas de expresión oral, y que rescatan la o las lenguas de la comunidad y de otros lugares.",
        "Reconocimiento y aprecio de la diversidad lingüística, al identificar las formas en que se comunican las distintas personas de la comunidad.",
        "Representación gráfica de ideas y descubrimientos, al explorar los diversos textos que hay en su comunidad y otros lugares.",
        "Expresión de emociones y experiencias, en igualdad de oportunidades, apoyándose de recursos gráficos personales y de los lenguajes artísticos.",
        "Producciones gráficas dirigidas a destinatarias y destinatarios diversos, para establecer vínculos sociales y acercarse a la cultura escrita.",
        "Reconocimiento de ideas o emociones en la interacción con manifestaciones culturales y artísticas y con la naturaleza, a través de diversos lenguajes.",
        "Producción de expresiones creativas con los distintos elementos de los lenguajes artísticos.",
    ],
    "saberes": [
        "Exploración de la diversidad natural que existe en la comunidad y en otros lugares.",
        "Saberes familiares y comunitarios que resuelven situaciones y necesidades en el hogar y la comunidad.",
        "Los seres vivos: elementos, procesos y fenómenos naturales que ofrecen oportunidades para entender y explicar hechos cotidianos, desde distintas perspectivas.",
        "Los saberes numéricos como herramienta para resolver situaciones del entorno, en diversos contextos socioculturales.",
        "El dominio del espacio y reconocimiento de formas en el entorno desde diversos puntos de observación y mediante desplazamientos o recorridos.",
        "Las magnitudes de longitud, peso, capacidad y tiempo en situaciones cotidianas del hogar y del entorno sociocultural.",
        "Clasificación y experimentación con objetos y elementos del entorno que reflejan la diversidad de la comunidad o región.",
        "Características de objetos y comportamiento de los materiales del entorno sociocultural.",
        "Objetos y artefactos tecnológicos que mejoran y facilitan la vida familiar y de la comunidad.",
    ],
    "etica": [
        "Interacción, cuidado, conservación y regeneración de la naturaleza, que favorece la construcción de una conciencia socioambiental.",
        "Transformación responsable del entorno al satisfacer necesidades básicas de alimentación, vestido y vivienda.",
        "Construcción de la identidad y pertenencia a una comunidad y país, a partir del conocimiento de su historia, sus celebraciones, conmemoraciones tradicionales y obras del patrimonio artístico y cultural.",
        "Cambios que ocurren en los lugares, entornos, objetos, costumbres y formas de vida de las distintas familias y comunidades con el paso del tiempo.",
        "Labores y servicios que contribuyen al bien común de las distintas familias y comunidades.",
        "Los derechos de niñas y niños como base para el bienestar integral y el establecimiento de acuerdos que favorecen la convivencia pacífica.",
        "La diversidad de personas y familias en la comunidad y su convivencia, en un ambiente de equidad, libertad, inclusión y respeto a los derechos humanos.",
        "La cultura de paz como una forma de relacionarse con otras personas para promover la inclusión y el respeto a la diversidad.",
    ],
    "humano": [
        "Construcción de la identidad personal a partir de su pertenencia a un territorio, su origen étnico, cultural y lingüístico, y la interacción con personas cercanas.",
        "Posibilidades de movimiento en diferentes espacios, para favorecer las habilidades motrices.",
        "Precisión y coordinación en los movimientos al usar objetos, herramientas y materiales, de acuerdo con sus condiciones, capacidades y características.",
        "Las emociones en la interacción con diversas personas y situaciones.",
        "Interacción con personas de diversos contextos, que contribuyan al establecimiento de relaciones positivas y a una convivencia basada en la aceptación de la diversidad.",
        "Cuidado de la salud personal y colectiva, al llevar a cabo acciones de higiene, limpieza y actividad física, desde los saberes prácticos de la comunidad y la información científica.",
        "Consumo de alimentos y bebidas que benefician la salud, de acuerdo con los contextos socioculturales.",
        "Medidas de prevención de accidentes y situaciones de riesgo de acuerdo con el contexto, para el cuidado de la integridad personal y colectiva.",
    ],
}

CAMPO_META = {
    "lenguajes": {
        "id": "lenguajes",
        "nombre": "Lenguajes",
        "emoji": "🗣️",
        "color": "#e74c3c",
        "colorSoft": "#fdecea",
        "colorDark": "#922b21",
        "prefix": "L",
        "descripcion": "Oralidad, cultura escrita y lenguajes artísticos para expresar, narrar, interpretar y crear en comunidad.",
    },
    "saberes": {
        "id": "saberes",
        "nombre": "Saberes y Pensamiento Científico",
        "emoji": "🔬",
        "color": "#2980b9",
        "colorSoft": "#eaf2f8",
        "colorDark": "#1a5276",
        "prefix": "S",
        "descripcion": "Exploración del entorno natural, saberes familiares, números, espacio, magnitudes, materiales y tecnología cotidiana.",
    },
    "etica": {
        "id": "etica",
        "nombre": "Ética, Naturaleza y Sociedades",
        "emoji": "🌍",
        "color": "#27ae60",
        "colorSoft": "#e8f8f5",
        "colorDark": "#196f3d",
        "prefix": "E",
        "descripcion": "Cuidado de la naturaleza, identidad comunitaria, cambios sociales, bien común, derechos, diversidad y cultura de paz.",
    },
    "humano": {
        "id": "humano",
        "nombre": "De lo Humano y lo Comunitario",
        "emoji": "🤝",
        "color": "#8e44ad",
        "colorSoft": "#f5eef8",
        "colorDark": "#6c3483",
        "prefix": "H",
        "descripcion": "Identidad personal, motricidad, emociones, convivencia, salud, alimentación y prevención de riesgos.",
    },
}

SECTIONS = {
    "lenguajes": list(range(19, 28)),
    "saberes": list(range(31, 42)),
    "etica": list(range(45, 53)),
    "humano": list(range(55, 63)),
}


def split_pdas(cell):
    if not cell:
        return []
    raw = cell.replace("\u00ad", "").replace("\xa0", " ")
    raw = re.sub(r"-\n", "", raw)
    parts = re.split(r"\n(?=[A-ZÁÉÍÓÚÑ¿¡])", raw)
    out = []
    for p in parts:
        p = re.sub(r"\s+", " ", p).strip(" -•\t")
        if len(p) >= 15:
            out.append(p)
    if not out:
        t = re.sub(r"\s+", " ", raw).strip()
        if len(t) >= 15:
            out = [t]
    return out


def clean_nombre(s):
    s = (s or "").replace("\u00ad", "").replace("\xa0", " ")
    s = re.sub(r"-\n", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def alnum_key(s):
    return "".join(ch for ch in s.lower() if ch.isalnum() or ch.isspace())


def match_official(nombre, campo):
    if not nombre or nombre.startswith("("):
        return None
    key = alnum_key(nombre)[:55]
    best = None
    best_score = 0
    for o in OFFICIAL[campo]:
        ok = alnum_key(o)[:55]
        score = 0
        for a, b in zip(key, ok):
            if a == b:
                score += 1
            else:
                break
        if score > best_score:
            best_score = score
            best = o
    return best if best_score >= 18 else None


def extract_catalog(pdf):
    catalog = {}
    for campo, pages in SECTIONS.items():
        contenidos = []
        current = None
        for pi in pages:
            tables = pdf.pages[pi].extract_tables() or []
            for t in tables:
                for row in t:
                    if not row or len(row) < 4:
                        continue
                    c0 = clean_nombre(row[0])
                    low = c0.lower()
                    if low.startswith("contenido") or "procesos de desarrollo" in low:
                        continue
                    if re.match(r"^[123][°ºo]", c0):
                        continue
                    pdas = []
                    for grado, col in [(1, 1), (2, 2), (3, 3)]:
                        for texto in split_pdas(row[col]):
                            pdas.append({"grado": grado, "texto": texto})
                    if not pdas and not c0:
                        continue
                    if c0:
                        official = match_official(c0, campo) or c0
                        current = {"nombre": official, "pdas": pdas}
                        contenidos.append(current)
                    else:
                        if current:
                            current["pdas"].extend(pdas)
                        else:
                            used = {c["nombre"] for c in contenidos}
                            for o in OFFICIAL[campo]:
                                if o not in used:
                                    current = {"nombre": o, "pdas": pdas}
                                    contenidos.append(current)
                                    break

        # Deduplicate by (grado, texto)
        for c in contenidos:
            seen = set()
            uniq = []
            for p in c["pdas"]:
                k = (p["grado"], p["texto"])
                if k not in seen:
                    seen.add(k)
                    uniq.append(p)
            c["pdas"] = uniq

        # Ensure official order; attach empty if missing
        by_name = {c["nombre"]: c for c in contenidos}
        ordered = []
        for o in OFFICIAL[campo]:
            if o in by_name:
                ordered.append(by_name.pop(o))
            else:
                # try fuzzy find remaining
                found = None
                for name, c in list(by_name.items()):
                    if match_official(name, campo) == o:
                        found = name
                        break
                if found:
                    ordered.append(by_name.pop(found))
                    ordered[-1]["nombre"] = o
                else:
                    ordered.append({"nombre": o, "pdas": []})
        # append leftovers
        ordered.extend(by_name.values())
        catalog[campo] = ordered
    return catalog


def build_js(catalog):
    campos_js = []
    for campo_key, meta in CAMPO_META.items():
        contenidos = catalog[campo_key]
        cont_js = []
        grade_counters = {1: 0, 2: 0, 3: 0}
        for ci, cont in enumerate(contenidos, 1):
            prefix = {"lenguajes": "LEN", "saberes": "SPC", "etica": "ENS", "humano": "DHC"}[campo_key]
            cid = f"{prefix}-C{ci:02d}"
            pdas = []
            local = {1: 0, 2: 0, 3: 0}
            for p in cont["pdas"]:
                g = int(p["grado"])
                local[g] += 1
                grade_counters[g] += 1
                n = grade_counters[g]
                pid = f"{cid}-G{g}-{local[g]:02d}"
                # LPDA1, LPDA2, LPDA3 según grado; si hay varios del mismo grado: LPDA2-2, LPDA2-3…
                short = f"{meta['prefix']}PDA{g}" if n == 1 else f"{meta['prefix']}PDA{g}-{n}"
                pdas.append(
                    {
                        "id": pid,
                        "grado": g,
                        "codigo": short,
                        "texto": p["texto"],
                    }
                )
            cont_js.append({"id": cid, "nombre": cont["nombre"], "pdas": pdas})
        campos_js.append({**{k: meta[k] for k in ("id", "nombre", "emoji", "color", "colorSoft", "colorDark", "prefix", "descripcion")}, "contenidos": cont_js})

    # Emit JS manually for readability
    lines = []
    lines.append("/**")
    lines.append(" * Catálogo Programa Sintético Fase 2 (Preescolar) — SEP / NEM")
    lines.append(" * Extraído del PDF oficial: Campos → Contenidos → PDA por grado (1°, 2°, 3°).")
    lines.append(" * Códigos: L/S/E/H + PDA + grado (ej. LPDA2, SPDA1-2).")
    lines.append(" */")
    lines.append("")
    lines.append("export const NIVELES = [")
    lines.append("  { code: 'L', label: 'Logrado', short: 'Nivel 4', color: '#2ecc71', bg: '#A9DFBF', fg: '#1C2833' },")
    lines.append("  { code: 'E', label: 'Esperado', short: 'Nivel 3', color: '#82e0aa', bg: '#D5F5E3', fg: '#1C2833' },")
    lines.append("  { code: 'P', label: 'Proceso', short: 'Nivel 2', color: '#f1c40f', bg: '#F9E79F', fg: '#1C2833' },")
    lines.append("  { code: 'RA', label: 'Requiere apoyo', short: 'Nivel 1', color: '#e74c3c', bg: '#F5B7B1', fg: '#1C2833' },")
    lines.append("]")
    lines.append("")
    lines.append(f"export const CAMPOS = {json.dumps(campos_js, ensure_ascii=False, indent=2)}")
    lines.append("")
    lines.append("export function getCampo(campoId) {")
    lines.append("  return CAMPOS.find((c) => c.id === campoId)")
    lines.append("}")
    lines.append("")
    lines.append("export function getContenido(campoId, contenidoId) {")
    lines.append("  const campo = getCampo(campoId)")
    lines.append("  return campo?.contenidos.find((c) => c.id === contenidoId)")
    lines.append("}")
    lines.append("")
    lines.append("export function getPda(campoId, contenidoId, pdaId) {")
    lines.append("  const contenido = getContenido(campoId, contenidoId)")
    lines.append("  return contenido?.pdas.find((p) => p.id === pdaId)")
    lines.append("}")
    lines.append("")
    lines.append("export function makePdaKey(campoId, contenidoId, pdaId) {")
    lines.append("  return `${campoId}::${contenidoId}::${pdaId}`")
    lines.append("}")
    lines.append("")
    lines.append("export function parsePdaKey(key) {")
    lines.append("  const [campoId, contenidoId, pdaId] = key.split('::')")
    lines.append("  return { campoId, contenidoId, pdaId }")
    lines.append("}")
    lines.append("")
    lines.append("export function codigoPda(pda, campo) {")
    lines.append("  if (pda?.codigo) return pda.codigo")
    lines.append("  const prefix = campo?.prefix || 'X'")
    lines.append("  return `${prefix}PDA${pda?.grado || '?'}`")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def main():
    with pdfplumber.open(PDF) as pdf:
        catalog = extract_catalog(pdf)

    OUT_JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_JS.write_text(build_js(catalog), encoding="utf-8")

    for campo, items in catalog.items():
        total = sum(len(c["pdas"]) for c in items)
        print(f"{campo}: {len(items)} contenidos, {total} PDAs")
        empty = [c["nombre"][:50] for c in items if not c["pdas"]]
        if empty:
            print("  SIN PDAs:", empty)
    print("Wrote", OUT_JS)


if __name__ == "__main__":
    main()
