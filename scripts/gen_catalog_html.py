# -*- coding: utf-8 -*-
"""Generate browsable HTML catalog of Fase 2 PDAs."""
import json
import re
from pathlib import Path

src = Path(r"c:\repos\missgarabatos\rubrica-evaluacion\src\data\catalogoFase2.js")
text = src.read_text(encoding="utf-8")
m = re.search(r"export const CAMPOS = (\[.*\])\n\nexport function getCampo", text, re.S)
data = json.loads(m.group(1))

out = Path(r"c:\Users\marti\Downloads\Catalogo_Fase2_Contenidos_PDA.html")

parts = []
parts.append("""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Catálogo Fase 2 · Contenidos y PDA</title>
<style>
  :root { --ink:#2c1b3d; --muted:#666; --bg:#fff9f2; }
  body { font-family: Nunito, Segoe UI, sans-serif; margin:0; background:var(--bg); color:var(--ink); }
  header { padding:1.2rem 1.5rem; background:#fff; border-bottom:3px solid #ffd0e4; position:sticky; top:0; z-index:5; }
  h1 { margin:0 0 .35rem; color:#c44569; font-size:1.5rem; }
  .stats { display:flex; gap:.5rem; flex-wrap:wrap; margin:.6rem 0 0; }
  .chip { background:#fff1f7; border:2px solid #ffd0e4; border-radius:999px; padding:.2rem .7rem; font-weight:800; font-size:.85rem; color:#c44569; }
  .filters { display:flex; gap:.6rem; flex-wrap:wrap; margin-top:.8rem; align-items:end; }
  label { display:flex; flex-direction:column; gap:.25rem; font-size:.78rem; font-weight:800; color:#8e44ad; }
  select, input { border:2px solid #f3c6dc; border-radius:12px; padding:.45rem .6rem; font:inherit; min-width:180px; }
  main { padding:1rem 1.5rem 3rem; max-width:1200px; margin:0 auto; }
  .campo { margin:1.2rem 0; background:#fff; border:3px solid #ffe0ef; border-radius:18px; overflow:hidden; }
  .campo > h2 { margin:0; padding:.8rem 1rem; color:#fff; font-size:1.1rem; }
  .contenido { border-top:1px dashed #f0d0e0; padding:.85rem 1rem 1rem; }
  .contenido h3 { margin:0 0 .35rem; font-size:.95rem; color:#c44569; }
  .contenido .nombre { color:var(--muted); font-size:.9rem; margin:0 0 .6rem; }
  table { width:100%; border-collapse:collapse; font-size:.88rem; }
  th, td { border:1px solid #f0d9e8; padding:.45rem .55rem; vertical-align:top; }
  th { background:#fff5fb; text-align:left; }
  .codigo { font-weight:900; color:#8e44ad; white-space:nowrap; }
  .grado { font-weight:800; background:#ffd166; border-radius:999px; padding:.05rem .45rem; }
  .hidden { display:none !important; }
</style>
</head>
<body>
<header>
  <h1>Catálogo rescatado · Programa Sintético Fase 2</h1>
  <div class="stats" id="stats"></div>
  <div class="filters">
    <label>Campo
      <select id="campo"></select>
    </label>
    <label>Grado
      <select id="grado">
        <option value="todos">Todos</option>
        <option value="1">1°</option>
        <option value="2">2°</option>
        <option value="3">3°</option>
      </select>
    </label>
    <label>Buscar en PDA
      <input id="q" type="search" placeholder="palabra clave…" />
    </label>
  </div>
</header>
<main id="main"></main>
<script>
const CAMPOS = """)
parts.append(json.dumps(data, ensure_ascii=False))
parts.append(""";
const main = document.getElementById('main');
const campoSel = document.getElementById('campo');
const gradoSel = document.getElementById('grado');
const qInput = document.getElementById('q');
const stats = document.getElementById('stats');

const totalCont = CAMPOS.reduce((n,c)=>n+c.contenidos.length,0);
const totalPda = CAMPOS.reduce((n,c)=>n+c.contenidos.reduce((m,x)=>m+x.pdas.length,0),0);
stats.innerHTML = `
  <span class="chip">${CAMPOS.length} campos</span>
  <span class="chip">${totalCont} contenidos</span>
  <span class="chip">${totalPda} PDA</span>
`;

campoSel.innerHTML = `<option value="todos">Todos los campos</option>` +
  CAMPOS.map(c=>`<option value="${c.id}">${c.nombre}</option>`).join('');

const colors = { lenguajes:'#e74c3c', saberes:'#2980b9', etica:'#27ae60', humano:'#8e44ad' };

function render() {
  const campo = campoSel.value;
  const grado = gradoSel.value;
  const q = qInput.value.trim().toLowerCase();
  main.innerHTML = '';
  CAMPOS.forEach(c => {
    if (campo !== 'todos' && c.id !== campo) return;
    const section = document.createElement('section');
    section.className = 'campo';
    section.innerHTML = `<h2 style="background:${colors[c.id]||'#c44569'}">${c.emoji||''} ${c.nombre}</h2>`;
    let any = false;
    c.contenidos.forEach(cont => {
      const pdas = cont.pdas.filter(p => {
        if (grado !== 'todos' && String(p.grado) !== grado) return false;
        if (q && !(`${p.codigo} ${p.texto}`.toLowerCase().includes(q))) return false;
        return true;
      });
      if (!pdas.length) return;
      any = true;
      const block = document.createElement('div');
      block.className = 'contenido';
      block.innerHTML = `<h3>${cont.id}</h3><p class="nombre">${cont.nombre}</p>
        <table>
          <thead><tr><th>Código</th><th>Grado</th><th>Texto del PDA</th></tr></thead>
          <tbody>${pdas.map(p=>`<tr>
            <td class="codigo">${p.codigo}</td>
            <td><span class="grado">${p.grado}°</span></td>
            <td>${p.texto}</td>
          </tr>`).join('')}</tbody>
        </table>`;
      section.appendChild(block);
    });
    if (any) main.appendChild(section);
  });
  if (!main.children.length) main.innerHTML = '<p>No hay resultados con esos filtros.</p>';
}
campoSel.onchange = render;
gradoSel.onchange = render;
qInput.oninput = render;
render();
</script>
</body>
</html>""")

out.write_text("".join(parts), encoding="utf-8")
print("OK", out)
