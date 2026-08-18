import { useEffect, useMemo, useState } from 'react'
import {
  getActiveNivelesConfig,
  getDefaultNivelesConfig,
  saveNivelesConfig,
  savePdaDescripcionAjuste,
  resetNivelesConfig,
  hasCustomNiveles,
} from './data/nivelesStore'
import {
  buildOpcionesParaPda,
  defaultDescripcionState,
  getOpcionesParaPda,
  getOptionLabelsForPda,
  mergeDescripcionState,
} from './data/descripcionesNivel'
import {
  getActiveCampos,
  getCampo,
  getContenido,
  getPda,
  makePdaKey,
  parsePdaKey,
} from './data/catalogoFase2'

const SAMPLE_PDA =
  'Emplea palabras, gestos, señas, imágenes, sonidos o movimientos corporales para expresar necesidades, ideas y emociones.'

/**
 * Panel para ajustar niveles S / E / P / RA y el desempeño por PDA.
 */
export default function NivelesAdjuster({ onClose, onSaved, pdaKeys = [] }) {
  const [cfg, setCfg] = useState(() => getActiveNivelesConfig())
  const [code, setCode] = useState('S')
  const [msg, setMsg] = useState('')
  const [campoId, setCampoId] = useState('')
  const [contenidoId, setContenidoId] = useState('')
  const [grado, setGrado] = useState(0)
  const [focusKey, setFocusKey] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editDraft, setEditDraft] = useState(['', '', ''])
  const catalog = getActiveCampos()

  const nivel = useMemo(
    () => cfg.niveles.find((n) => n.code === code) || cfg.niveles[0],
    [cfg, code],
  )

  const selectedKeys = useMemo(
    () => Object.keys(cfg.pdaAjustes || {}),
    [cfg.pdaAjustes],
  )

  useEffect(() => {
    if (!pdaKeys?.length) return
    setCfg((prev) => {
      const next = { ...(prev.pdaAjustes || {}) }
      let changed = false
      for (const key of pdaKeys) {
        if (next[key]) continue
        const { campoId: c, contenidoId: co, pdaId } = parsePdaKey(key)
        const pda = getPda(c, co, pdaId)
        if (!pda) continue
        next[key] = mergeDescripcionState(pda.texto || '', next[key])
        changed = true
      }
      return changed ? { ...prev, pdaAjustes: next } : prev
    })
    if (!focusKey && pdaKeys[0]) setFocusKey(pdaKeys[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previewPdaTexto = useMemo(() => {
    if (!focusKey) return SAMPLE_PDA
    const { campoId: c, contenidoId: co, pdaId } = parsePdaKey(focusKey)
    return getPda(c, co, pdaId)?.texto || SAMPLE_PDA
  }, [focusKey])

  const [previewOpts, setPreviewOpts] = useState(() => buildOpcionesParaPda(SAMPLE_PDA))

  useEffect(() => {
    setPreviewOpts(buildOpcionesParaPda(previewPdaTexto))
  }, [msg, previewPdaTexto])

  const campo = campoId ? getCampo(campoId) : null
  const contenidos = campo?.contenidos || []
  const pdasLista = useMemo(() => {
    if (!campoId || !contenidoId) return []
    const cont = getContenido(campoId, contenidoId)
    return (cont?.pdas || []).filter((p) => !grado || p.grado === grado)
  }, [campoId, contenidoId, grado])

  function updateNivelField(field, value) {
    setCfg((prev) => ({
      ...prev,
      niveles: prev.niveles.map((n) => (n.code === code ? { ...n, [field]: value } : n)),
    }))
  }

  function updateApertura(idx, value) {
    setCfg((prev) => {
      const list = [...(prev.aperturas[code] || [])]
      list[idx] = value
      return { ...prev, aperturas: { ...prev.aperturas, [code]: list } }
    })
  }

  function updateCierre(idx, value) {
    setCfg((prev) => {
      const list = [...(prev.cierres[code] || [])]
      list[idx] = value
      return { ...prev, cierres: { ...prev.cierres, [code]: list } }
    })
  }

  function togglePda(key, pdaTexto) {
    const exists = Boolean(cfg.pdaAjustes?.[key])
    setCfg((prev) => {
      const cur = { ...(prev.pdaAjustes || {}) }
      if (cur[key]) {
        delete cur[key]
        return { ...prev, pdaAjustes: cur }
      }
      cur[key] = mergeDescripcionState(pdaTexto || '', cur[key])
      return { ...prev, pdaAjustes: cur }
    })
    setFocusKey(exists ? (focusKey === key ? '' : focusKey) : key)
  }

  function quitarOpciones(key, nivelCode) {
    updatePdaSlot(key, nivelCode, {
      hideOpciones: true,
      useCustom: true,
      optionIndex: 0,
    })
  }

  function updatePdaSlot(key, nivelCode, patch) {
    setCfg((prev) => {
      const cur = { ...(prev.pdaAjustes || {}) }
      const st = cur[key] || mergeDescripcionState(previewPdaTexto, cur[key])
      if (patch?.opciones) {
        const merged = { ...st, opciones: { ...st.opciones, ...patch.opciones } }
        cur[key] = merged
        savePdaDescripcionAjuste(key, {
          opciones: merged.opciones,
          S: merged.S,
          E: merged.E,
          P: merged.P,
          RA: merged.RA,
        })
        return { ...prev, pdaAjustes: cur }
      }
      cur[key] = { ...st, [nivelCode]: { ...st[nivelCode], ...patch } }
      return { ...prev, pdaAjustes: cur }
    })
  }

  function startEditOpciones(code, opciones) {
    setEditTarget(code)
    setEditDraft([0, 1, 2].map((i) => opciones[i] || ''))
  }

  function cancelEditOpciones() {
    setEditTarget(null)
    setEditDraft(['', '', ''])
  }

  function saveEditOpciones() {
    if (!focusKey || !editTarget) return
    const trimmed = editDraft.map((t) => String(t || '').trim())
    const st = cfg.pdaAjustes?.[focusKey] || mergeDescripcionState(previewPdaTexto)
    const merged = { ...st, opciones: { ...st.opciones, [editTarget]: trimmed } }
    updatePdaSlot(focusKey, null, { opciones: { [editTarget]: trimmed } })
    setPreviewOpts(getOpcionesParaPda(previewPdaTexto, merged))
    cancelEditOpciones()
    setMsg('Opciones guardadas en la base de datos.')
    setTimeout(() => setMsg(''), 3200)
  }

  function save() {
    saveNivelesConfig(cfg)
    setPreviewOpts(buildOpcionesParaPda(previewPdaTexto))
    setMsg('Guardado. Los PDA marcados usarán este desempeño al generar el Excel.')
    onSaved?.(cfg)
    setTimeout(() => setMsg(''), 3200)
  }

  function restore() {
    resetNivelesConfig()
    const def = getDefaultNivelesConfig()
    setCfg(def)
    setPreviewOpts(buildOpcionesParaPda(SAMPLE_PDA))
    setFocusKey('')
    setMsg('Se restauraron los niveles oficiales.')
    onSaved?.(def)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'niveles-desempeno.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importJson(file) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!parsed?.niveles || !parsed?.cierres) {
          setMsg('JSON inválido.')
          return
        }
        const def = getDefaultNivelesConfig()
        const merged = {
          ...def,
          ...parsed,
          aperturas: { ...def.aperturas, ...(parsed.aperturas || {}) },
          cierres: { ...def.cierres, ...(parsed.cierres || {}) },
          extensiones: { ...def.extensiones, ...(parsed.extensiones || {}) },
          pdaAjustes: parsed.pdaAjustes && typeof parsed.pdaAjustes === 'object' ? parsed.pdaAjustes : {},
        }
        setCfg(merged)
        saveNivelesConfig(merged)
        setPreviewOpts(buildOpcionesParaPda(SAMPLE_PDA))
        setMsg('Niveles importados y guardados.')
        onSaved?.(merged)
      } catch {
        setMsg('No se pudo leer el JSON.')
      }
    }
    reader.readAsText(file)
  }

  const aperturas = cfg.aperturas[code] || ['', '', '']
  const cierres = cfg.cierres[code] || ['', '', '']
  const focusDesc = focusKey ? cfg.pdaAjustes?.[focusKey] : null
  const focusOpts = focusKey ? getOpcionesParaPda(previewPdaTexto, focusDesc) : null
  const enfoqueLabels = focusKey ? getOptionLabelsForPda(previewPdaTexto) : null
  const focusParsed = focusKey ? parsePdaKey(focusKey) : null
  const focusPda = focusParsed
    ? getPda(focusParsed.campoId, focusParsed.contenidoId, focusParsed.pdaId)
    : null

  return (
    <div className="catalog-adjuster niveles-adjuster">
      <div className="catalog-adjuster-head">
        <div>
          <h2>Ajustar niveles de desempeño · S / E / P / RA</h2>
          <p className="muted">
            Elige los PDA del alumno y marca el nivel (S / E / P / RA) según su desempeño.
            También puedes editar cómo se redactan todos los niveles (aperturas y cierres).
            {hasCustomNiveles() ? ' · Usando versión personalizada.' : ' · Usando versión oficial.'}
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <section className="pda-nivel-pick">
        <h3>PDA del alumno</h3>
        <p className="muted tiny">
          Marca uno o varios. Luego pulsa el que quieras editar y elige cómo se ve en cada nivel.
        </p>
        <div className="pda-nivel-filters">
          <label>
            Campo
            <select
              value={campoId}
              onChange={(e) => {
                setCampoId(e.target.value)
                setContenidoId('')
              }}
            >
              <option value="">Elige campo</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.nombre}</option>
              ))}
            </select>
          </label>
          <label>
            Contenido
            <select
              value={contenidoId}
              onChange={(e) => setContenidoId(e.target.value)}
              disabled={!campoId}
            >
              <option value="">Elige contenido</option>
              {contenidos.map((co) => (
                <option key={co.id} value={co.id}>{co.id}</option>
              ))}
            </select>
          </label>
          <label>
            Grado
            <select value={grado} onChange={(e) => setGrado(Number(e.target.value))}>
              <option value={0}>Todos</option>
              <option value={1}>1°</option>
              <option value={2}>2°</option>
              <option value={3}>3°</option>
            </select>
          </label>
        </div>
        {pdasLista.length > 0 && (
          <ul className="pda-nivel-list">
            {pdasLista.map((p) => {
              const key = makePdaKey(campoId, contenidoId, p.id)
              const on = Boolean(cfg.pdaAjustes?.[key])
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`pda-nivel-item ${on ? 'selected' : ''} ${focusKey === key ? 'focus' : ''}`}
                    onClick={() => {
                      if (on && focusKey !== key) {
                        setFocusKey(key)
                        return
                      }
                      togglePda(key, p.texto)
                    }}
                  >
                    <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                    <span>
                      <strong>{p.codigo}</strong> · {p.grado}°
                      <small>{p.texto}</small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {selectedKeys.length > 0 && (
          <div className="pda-nivel-chips">
            {selectedKeys.map((key) => {
              const { campoId: c, contenidoId: co, pdaId } = parsePdaKey(key)
              const pda = getPda(c, co, pdaId)
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip ${focusKey === key ? 'accent' : ''}`}
                  onClick={() => setFocusKey(key)}
                >
                  {pda?.codigo || 'PDA'} {pda?.grado ? `· ${pda.grado}°` : ''}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {focusKey && focusDesc && (
        <section className="pda-desempeno">
          <h3>Desempeño en {focusPda?.codigo || 'este PDA'}</h3>
          <p className="muted tiny">{previewPdaTexto}</p>
          <div className="pda-desempeno-grid">
            {cfg.niveles.map((n) => {
              const slot = focusDesc[n.code] || { optionIndex: 0, useCustom: false, custom: '' }
              const opciones = focusOpts?.[n.code] || []
              const editing = editTarget === n.code
              return (
                <div key={n.code} className={`nivel-box ${editing ? 'editing' : ''}`} style={{ borderColor: n.color }}>
                  <div className="nivel-head" style={{ background: n.bg, color: n.fg }}>
                    {n.code} · {n.label}
                    {!editing && (
                      <button
                        type="button"
                        className="btn ghost tiny nivel-edit-btn"
                        onClick={() => startEditOpciones(n.code, opciones)}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div className="opciones-edit">
                      {[0, 1, 2].map((i) => (
                        <label key={i}>
                          <em>{enfoqueLabels?.[i] || `Opción ${i + 1}`}</em>
                          <textarea
                            rows={3}
                            value={editDraft[i] || ''}
                            onChange={(e) => {
                              const next = [...editDraft]
                              next[i] = e.target.value
                              setEditDraft(next)
                            }}
                          />
                        </label>
                      ))}
                      <div className="nivel-box-actions">
                        <button type="button" className="btn primary tiny" onClick={saveEditOpciones}>
                          Guardar
                        </button>
                        <button type="button" className="btn ghost tiny" onClick={cancelEditOpciones}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="opciones">
                    {!slot.hideOpciones && opciones.map((txt, i) => (
                      <label key={i} className={!slot.useCustom && slot.optionIndex === i ? 'picked' : ''}>
                        <input
                          type="radio"
                          name={`${focusKey}-${n.code}`}
                          checked={!slot.useCustom && slot.optionIndex === i}
                          onChange={() => updatePdaSlot(focusKey, n.code, { optionIndex: i, useCustom: false })}
                        />
                        <span><em>{enfoqueLabels?.[i] || `Opción ${i + 1}`}</em> {txt}</span>
                      </label>
                    ))}
                    <label className={slot.useCustom || slot.hideOpciones ? 'picked custom' : 'custom'}>
                      <input
                        type="radio"
                        name={`${focusKey}-${n.code}`}
                        checked={!!slot.useCustom}
                        onChange={() => updatePdaSlot(focusKey, n.code, { useCustom: true })}
                      />
                      <span>
                        <em>Según el alumno (escribir)</em>
                        <textarea
                          rows={3}
                          value={slot.custom || ''}
                          placeholder="Describe el desempeño de este alumno en este nivel…"
                          onChange={(e) =>
                            updatePdaSlot(focusKey, n.code, { custom: e.target.value, useCustom: true })
                          }
                          onFocus={() => updatePdaSlot(focusKey, n.code, { useCustom: true })}
                        />
                      </span>
                    </label>
                  </div>
                  <div className="nivel-box-actions">
                    <button type="button" className="btn primary tiny" onClick={save}>
                      Guardar selección
                    </button>
                    <button type="button" className="btn ghost tiny" onClick={() => quitarOpciones(focusKey, n.code)}>
                      Quitar
                    </button>
                  </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="nivel-tabs">
        {cfg.niveles.map((n) => (
          <button
            key={n.code}
            type="button"
            className={`nivel-tab ${code === n.code ? 'active' : ''}`}
            style={{ '--nivel': n.bg, '--nivel-ink': n.color }}
            onClick={() => setCode(n.code)}
          >
            <strong>{n.code}</strong>
            <span>{n.label}</span>
          </button>
        ))}
      </div>

      {nivel && (
        <div className="nivel-edit-grid">
          <div className="catalog-col edit">
            <h3>Datos del nivel</h3>
            <label className="stack">
              Etiqueta
              <input
                value={nivel.label}
                onChange={(e) => updateNivelField('label', e.target.value)}
              />
            </label>
            <label className="stack">
              Corto (leyenda)
              <input
                value={nivel.short}
                onChange={(e) => updateNivelField('short', e.target.value)}
              />
            </label>
            <div className="color-row">
              <label className="stack">
                Color
                <input
                  type="color"
                  value={nivel.color}
                  onChange={(e) => updateNivelField('color', e.target.value)}
                />
              </label>
              <label className="stack">
                Fondo celda
                <input
                  type="color"
                  value={nivel.bg}
                  onChange={(e) => updateNivelField('bg', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="catalog-col edit">
            <h3>Aperturas (antes del punto) · 3 variantes</h3>
            {[0, 1, 2].map((i) => (
              <label key={i} className="stack">
                Variante {i + 1}
                <input
                  value={aperturas[i] || ''}
                  onChange={(e) => updateApertura(i, e.target.value)}
                  placeholder="{verb} {rest}"
                />
              </label>
            ))}
          </div>

          <div className="catalog-col edit">
            <h3>Cierres (después del punto) · 3 variantes</h3>
            {[0, 1, 2].map((i) => (
              <label key={i} className="stack">
                Variante {i + 1}
                <textarea
                  rows={3}
                  value={cierres[i] || ''}
                  onChange={(e) => updateCierre(i, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="nivel-preview">
        <h3>Vista previa {focusKey ? '(PDA elegido)' : '(PDA de ejemplo)'} · {code}</h3>
        <ol>
          {(previewOpts[code] || []).map((t, i) => (
            <li key={i}>
              <span className="len">{t.length} car.</span>
              {t}
            </li>
          ))}
        </ol>
        <p className="muted tiny">Guarda para actualizar la vista previa con tus cambios de apertura y cierre.</p>
      </div>

      <div className="catalog-actions">
        <button type="button" className="btn primary" onClick={save}>
          Guardar niveles
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
        <button type="button" className="btn ghost" onClick={restore}>
          Restaurar oficial
        </button>
        {msg && <span className="catalog-msg">{msg}</span>}
      </div>
    </div>
  )
}
