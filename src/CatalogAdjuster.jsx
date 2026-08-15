import { useEffect, useMemo, useState } from 'react'
import {
  getDefaultCampos,
  saveActiveCampos,
  resetActiveCampos,
  hasCustomCatalog,
  purgeBorrarPdas,
  getActiveCampos,
} from './data/catalogoFase2'

/**
 * Panel para revisar y ajustar Campo → Contenido → PDA.
 * Guarda en la base missgarabatos y afecta la generación del Excel.
 */
export default function CatalogAdjuster({ catalog, onChange, onClose }) {
  const [campoId, setCampoId] = useState(catalog[0]?.id || '')
  const [contenidoId, setContenidoId] = useState(catalog[0]?.contenidos?.[0]?.id || '')
  const [pdaId, setPdaId] = useState(catalog[0]?.contenidos?.[0]?.pdas?.[0]?.id || '')
  const [draftContenido, setDraftContenido] = useState('')
  const [draftCodigo, setDraftCodigo] = useState('')
  const [draftTexto, setDraftTexto] = useState('')
  const [draftGrado, setDraftGrado] = useState(1)
  const [msg, setMsg] = useState('')

  const campo = useMemo(
    () => catalog.find((c) => c.id === campoId) || catalog[0],
    [catalog, campoId],
  )
  const contenido = useMemo(
    () => campo?.contenidos?.find((c) => c.id === contenidoId) || campo?.contenidos?.[0],
    [campo, contenidoId],
  )
  const pda = useMemo(
    () => contenido?.pdas?.find((p) => p.id === pdaId) || contenido?.pdas?.[0],
    [contenido, pdaId],
  )

  function selectCampo(id) {
    const c = catalog.find((x) => x.id === id)
    setCampoId(id)
    const co = c?.contenidos?.[0]
    setContenidoId(co?.id || '')
    setPdaId(co?.pdas?.[0]?.id || '')
    loadDrafts(co, co?.pdas?.[0])
  }

  function selectContenido(id) {
    const co = campo?.contenidos?.find((x) => x.id === id)
    setContenidoId(id)
    setPdaId(co?.pdas?.[0]?.id || '')
    loadDrafts(co, co?.pdas?.[0])
  }

  function selectPda(id) {
    const p = contenido?.pdas?.find((x) => x.id === id)
    setPdaId(id)
    loadDrafts(contenido, p)
  }

  function loadDrafts(co, p) {
    setDraftContenido(co?.nombre || '')
    setDraftCodigo(p?.codigo || '')
    setDraftTexto(p?.texto || '')
    setDraftGrado(p?.grado || 1)
  }

  useEffect(() => {
    // Al abrir el panel, elimina PDA marcados BORRAR y refresca
    const { campos, removed } = purgeBorrarPdas(catalog)
    if (removed > 0) {
      saveActiveCampos(campos)
      onChange(campos)
      setMsg(`Se eliminaron ${removed} PDA marcados BORRAR.`)
      const c0 = campos[0]
      setCampoId(c0?.id || '')
      setContenidoId(c0?.contenidos?.[0]?.id || '')
      setPdaId(c0?.contenidos?.[0]?.pdas?.[0]?.id || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (contenido && pda) loadDrafts(contenido, pda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenido?.id, pda?.id])

  function deepClone(c) {
    return JSON.parse(JSON.stringify(c))
  }

  function applyPatch(mutator) {
    const next = deepClone(catalog)
    mutator(next)
    saveActiveCampos(next)
    onChange(next)
    setMsg('Guardado. El Excel usará esta versión del catálogo.')
    setTimeout(() => setMsg(''), 2500)
  }

  function saveContenidoNombre() {
    applyPatch((next) => {
      const c = next.find((x) => x.id === campo.id)
      const co = c?.contenidos?.find((x) => x.id === contenido.id)
      if (co) co.nombre = draftContenido.trim()
    })
  }

  function savePda() {
    applyPatch((next) => {
      const c = next.find((x) => x.id === campo.id)
      const co = c?.contenidos?.find((x) => x.id === contenido.id)
      const p = co?.pdas?.find((x) => x.id === pda.id)
      if (p) {
        p.codigo = draftCodigo.trim()
        p.texto = draftTexto.trim()
        p.grado = Number(draftGrado) || p.grado
      }
    })
  }

  function movePda(dir) {
    applyPatch((next) => {
      const c = next.find((x) => x.id === campo.id)
      const co = c?.contenidos?.find((x) => x.id === contenido.id)
      if (!co?.pdas) return
      const idx = co.pdas.findIndex((x) => x.id === pda.id)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= co.pdas.length) return
      const tmp = co.pdas[idx]
      co.pdas[idx] = co.pdas[j]
      co.pdas[j] = tmp
    })
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'catalogo-fase2-ajustado.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importJson(file) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!Array.isArray(parsed) || !parsed[0]?.contenidos) {
          setMsg('JSON inválido: se espera el arreglo de campos.')
          return
        }
        saveActiveCampos(parsed)
        onChange(parsed)
        setCampoId(parsed[0].id)
        setContenidoId(parsed[0].contenidos?.[0]?.id || '')
        setPdaId(parsed[0].contenidos?.[0]?.pdas?.[0]?.id || '')
        setMsg('Catálogo importado y guardado.')
      } catch (e) {
        setMsg('No se pudo leer el JSON.')
      }
    }
    reader.readAsText(file)
  }

  function restoreOfficial() {
    resetActiveCampos()
    const def = getDefaultCampos()
    onChange(def)
    setCampoId(def[0].id)
    setContenidoId(def[0].contenidos[0].id)
    setPdaId(def[0].contenidos[0].pdas[0].id)
    loadDrafts(def[0].contenidos[0], def[0].contenidos[0].pdas[0])
    setMsg('Se restauró el catálogo oficial.')
  }

  const stats = useMemo(() => {
    return catalog.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      prefix: c.prefix,
      contenidos: c.contenidos?.length || 0,
      pdas: c.contenidos?.reduce((n, co) => n + (co.pdas?.length || 0), 0) || 0,
    }))
  }, [catalog])

  return (
    <div className="catalog-adjuster">
      <div className="catalog-adjuster-head">
        <div>
          <h2>Ajustar catálogo · Campo → Contenido → PDA</h2>
          <p className="muted">
            Estructura oficial SEP/NEM. Puedes corregir códigos, textos, orden de PDA y nombres de
            contenido. Se guarda en este navegador y se usa al generar el Excel.
            {hasCustomCatalog() ? ' · Usando versión ajustada.' : ' · Usando versión oficial.'}
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <div className="catalog-stats">
        {stats.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`catalog-stat ${campo?.id === s.id ? 'active' : ''}`}
            onClick={() => selectCampo(s.id)}
          >
            <strong>
              {s.prefix} · {s.nombre}
            </strong>
            <span>
              {s.contenidos} contenidos · {s.pdas} PDA
            </span>
          </button>
        ))}
      </div>

      <div className="catalog-grid">
        <div className="catalog-col">
          <h3>Contenidos</h3>
          <ul className="catalog-list">
            {(campo?.contenidos || []).map((co) => (
              <li key={co.id}>
                <button
                  type="button"
                  className={contenido?.id === co.id ? 'active' : ''}
                  onClick={() => selectContenido(co.id)}
                >
                  <code>{co.id}</code>
                  <span>{co.nombre}</span>
                  <em>{co.pdas?.length || 0} PDA</em>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="catalog-col">
          <h3>PDA en este contenido</h3>
          <ul className="catalog-list compact">
            {(contenido?.pdas || []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={pda?.id === p.id ? 'active' : ''}
                  onClick={() => selectPda(p.id)}
                >
                  <code>{p.codigo}</code>
                  <span>
                    {p.grado}° · {p.texto}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="catalog-col edit">
          <h3>Editar selección</h3>
          {contenido && (
            <label className="stack">
              Nombre del contenido ({contenido.id})
              <textarea
                rows={3}
                value={draftContenido}
                onChange={(e) => setDraftContenido(e.target.value)}
              />
              <button type="button" className="btn secondary" onClick={saveContenidoNombre}>
                Guardar contenido
              </button>
            </label>
          )}
          {pda && (
            <>
              <label className="stack">
                Código PDA ({pda.id})
                <input value={draftCodigo} onChange={(e) => setDraftCodigo(e.target.value)} />
              </label>
              <label className="stack">
                Grado
                <select
                  value={draftGrado}
                  onChange={(e) => setDraftGrado(Number(e.target.value))}
                >
                  <option value={1}>1°</option>
                  <option value={2}>2°</option>
                  <option value={3}>3°</option>
                </select>
              </label>
              <label className="stack">
                Texto del PDA
                <textarea
                  rows={5}
                  value={draftTexto}
                  onChange={(e) => setDraftTexto(e.target.value)}
                />
              </label>
              <div className="btn-row">
                <button type="button" className="btn secondary" onClick={savePda}>
                  Guardar PDA
                </button>
                <button type="button" className="btn ghost" onClick={() => movePda(-1)}>
                  Subir
                </button>
                <button type="button" className="btn ghost" onClick={() => movePda(1)}>
                  Bajar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="catalog-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            const { campos, removed } = purgeBorrarPdas(getActiveCampos())
            saveActiveCampos(campos)
            onChange(campos)
            setMsg(
              removed > 0
                ? `Se eliminaron ${removed} PDA marcados BORRAR.`
                : 'No había PDA marcados BORRAR.',
            )
          }}
        >
          Eliminar PDA “BORRAR”
        </button>
        <button type="button" className="btn secondary" onClick={exportJson}>
          Exportar JSON
        </button>
        <label className="btn ghost file-btn">
          Importar JSON
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson(f)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" className="btn ghost" onClick={restoreOfficial}>
          Restaurar oficial
        </button>
        {msg && <span className="catalog-msg">{msg}</span>}
      </div>
    </div>
  )
}
