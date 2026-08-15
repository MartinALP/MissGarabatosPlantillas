import { useEffect, useMemo, useState } from 'react'
import {
  CAMPOS,
  NIVELES,
  makePdaKey,
  parsePdaKey,
  getCampo,
  getContenido,
  getPda,
  getActiveCampos,
  hasCustomCatalog,
  hasCustomNiveles,
  getActiveNiveles,
} from './data/catalogoFase2'
import { defaultDescripcionState, resolveTextoNivel, buildOpcionesParaPda } from './data/descripcionesNivel'
import { getActiveNivelesConfig } from './data/nivelesStore'
import mascot from './assets/miss-garabatos.png'
import { generateRubricaExcel, buildItems } from './excel/generateRubrica'
import CatalogAdjuster from './CatalogAdjuster'
import NivelesAdjuster from './NivelesAdjuster'
import './App.css'

const STEPS = [
  { id: 'campos', label: 'Campos', emoji: '📚' },
  { id: 'contenidos', label: 'Contenidos', emoji: '🧩' },
  { id: 'pdas', label: 'PDA', emoji: '⭐' },
  { id: 'textos', label: 'Descripciones', emoji: '✏️' },
  { id: 'generar', label: 'Generar', emoji: '📥' },
]

export function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export default function App({ onBack }) {
  const [step, setStep] = useState(0)
  const [gradoFiltro, setGradoFiltro] = useState(0) // 0 = todos, 1/2/3
  const [meta, setMeta] = useState({
    escuela: '',
    grupo: '1A',
    periodo: 'Diagnóstico',
    docente: '',
  })
  const [selectedCampos, setSelectedCampos] = useState([])
  const [selectedContenidos, setSelectedContenidos] = useState({}) // campoId -> Set of contenidoIds as array
  const [selectedPdas, setSelectedPdas] = useState({}) // `${campoId}::${contenidoId}` -> pdaId[]
  const [descripciones, setDescripciones] = useState({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [pdaCampoIdx, setPdaCampoIdx] = useState(0)
  const [contenidoCampoIdx, setContenidoCampoIdx] = useState(0)
  const [showCatalog, setShowCatalog] = useState(false)
  const [showNiveles, setShowNiveles] = useState(false)
  const [catalog, setCatalog] = useState(() => getActiveCampos())
  const [niveles, setNiveles] = useState(() => getActiveNiveles())

  useEffect(() => {
    setCatalog(getActiveCampos())
    setNiveles(getActiveNiveles())
  }, [])

  useEffect(() => {
    scrollToTop()
  }, [step, pdaCampoIdx, contenidoCampoIdx])

  const pdaKeys = useMemo(() => {
    const keys = []
    for (const campoId of selectedCampos) {
      const conts = selectedContenidos[campoId] || []
      for (const contenidoId of conts) {
        const pdas = selectedPdas[`${campoId}::${contenidoId}`] || []
        for (const pdaId of pdas) keys.push(makePdaKey(campoId, contenidoId, pdaId))
      }
    }
    return keys
  }, [selectedCampos, selectedContenidos, selectedPdas])

  function toggleCampo(id) {
    setSelectedCampos((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id)
        setSelectedContenidos((sc) => {
          const copy = { ...sc }
          delete copy[id]
          return copy
        })
        setSelectedPdas((sp) => {
          const copy = { ...sp }
          Object.keys(copy).forEach((k) => {
            if (k.startsWith(`${id}::`)) delete copy[k]
          })
          return copy
        })
        return next
      }
      if (prev.length >= 4) {
        flash('Máximo 4 campos (todos los del programa sintético).')
        return prev
      }
      return [...prev, id]
    })
  }

  function toggleContenido(campoId, contenidoId) {
    setSelectedContenidos((prev) => {
      const list = prev[campoId] || []
      const exists = list.includes(contenidoId)
      const nextList = exists ? list.filter((x) => x !== contenidoId) : [...list, contenidoId]
      if (exists) {
        setSelectedPdas((sp) => {
          const copy = { ...sp }
          delete copy[`${campoId}::${contenidoId}`]
          return copy
        })
      }
      return { ...prev, [campoId]: nextList }
    })
  }

  function togglePda(campoId, contenidoId, pdaId, pdaTexto) {
    const ck = `${campoId}::${contenidoId}`
    const key = makePdaKey(campoId, contenidoId, pdaId)
    setSelectedPdas((prev) => {
      const list = prev[ck] || []
      const exists = list.includes(pdaId)
      const nextList = exists ? list.filter((x) => x !== pdaId) : [...list, pdaId]
      return { ...prev, [ck]: nextList }
    })
    setDescripciones((prev) => {
      if (prev[key]) {
        // keep if deselecting later cleaned? keep for re-select
        return prev
      }
      return { ...prev, [key]: defaultDescripcionState(pdaTexto) }
    })
  }

  function selectAllPdasInContenido(campoId, contenidoId, pdas) {
    const ck = `${campoId}::${contenidoId}`
    setSelectedPdas((prev) => {
      const existing = prev[ck] || []
      const add = pdas.map((p) => p.id)
      const merged = [...new Set([...existing, ...add])]
      return { ...prev, [ck]: merged }
    })
    setDescripciones((prev) => {
      const next = { ...prev }
      pdas.forEach((p) => {
        const key = makePdaKey(campoId, contenidoId, p.id)
        if (!next[key]) next[key] = defaultDescripcionState(p.texto)
      })
      return next
    })
  }

  function clearPdasInContenido(campoId, contenidoId) {
    const ck = `${campoId}::${contenidoId}`
    setSelectedPdas((prev) => ({ ...prev, [ck]: [] }))
  }

  function updateDesc(key, nivel, patch) {
    setDescripciones((prev) => {
      const { campoId, contenidoId, pdaId } = parsePdaKey(key)
      const pda = getPda(campoId, contenidoId, pdaId)
      const base = prev[key] || defaultDescripcionState(pda?.texto || '')
      return {
        ...prev,
        [key]: {
          ...base,
          [nivel]: { ...base[nivel], ...patch },
        },
      }
    })
  }

  function pdasInCampo(campoId) {
    const conts = selectedContenidos[campoId] || []
    let n = 0
    for (const contenidoId of conts) {
      n += (selectedPdas[`${campoId}::${contenidoId}`] || []).length
    }
    return n
  }

  function canGoNext() {
    if (step === 0) return selectedCampos.length >= 1 && selectedCampos.length <= 4
    if (step === 1) {
      const campoId = selectedCampos[Math.min(contenidoCampoIdx, Math.max(selectedCampos.length - 1, 0))]
      return campoId ? (selectedContenidos[campoId] || []).length >= 1 : false
    }
    if (step === 2) {
      const campoId = selectedCampos[Math.min(pdaCampoIdx, Math.max(selectedCampos.length - 1, 0))]
      return campoId ? pdasInCampo(campoId) >= 1 : false
    }
    if (step === 3) return pdaKeys.length >= 1
    return true
  }

  function handleAtras() {
    if (step === 2 && pdaCampoIdx > 0) {
      setPdaCampoIdx((i) => i - 1)
      return
    }
    if (step === 1 && contenidoCampoIdx > 0) {
      setContenidoCampoIdx((i) => i - 1)
      return
    }
    if (step === 2) setContenidoCampoIdx(Math.max(selectedCampos.length - 1, 0))
    if (step === 3) setPdaCampoIdx(Math.max(selectedCampos.length - 1, 0))
    setStep((s) => Math.max(0, s - 1))
  }

  function handleContinuar() {
    if (step === 1) {
      const last = selectedCampos.length - 1
      const cur = Math.min(contenidoCampoIdx, last)
      if ((selectedContenidos[selectedCampos[cur]] || []).length < 1) {
        flash('Selecciona al menos un contenido en este campo.')
        return
      }
      if (cur < last) {
        setContenidoCampoIdx(cur + 1)
        return
      }
      setPdaCampoIdx(0)
      setStep(2)
      return
    }
    if (step === 2) {
      const last = selectedCampos.length - 1
      const cur = Math.min(pdaCampoIdx, last)
      if (pdasInCampo(selectedCampos[cur]) < 1) {
        flash('Selecciona al menos un PDA en este campo.')
        return
      }
      if (cur < last) {
        setPdaCampoIdx(cur + 1)
        return
      }
      setStep(3)
      return
    }
    if (!canGoNext()) return
    if (step === 0) setContenidoCampoIdx(0)
    setStep((s) => s + 1)
  }

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  async function handleGenerate(textosEditables) {
    if (pdaKeys.length === 0) {
      flash('Selecciona al menos un PDA.')
      return
    }
    setBusy(true)
    try {
      const descs = ensureDescs()
      await generateRubricaExcel({
        pdaKeys,
        descripciones: descs,
        meta,
        textosEditables: Boolean(textosEditables),
      })
      flash(
        textosEditables
          ? 'Excel generado con lista 1-2-3 para cambiar textos (Modificar).'
          : 'Excel generado con textos fijos (Sin modificar).',
      )
    } catch (err) {
      console.error(err)
      flash('Error al generar el Excel. Revisa la consola.')
    } finally {
      setBusy(false)
    }
  }

  function ensureDescs() {
    const descs = { ...descripciones }
    pdaKeys.forEach((key) => {
      const { campoId, contenidoId, pdaId } = parsePdaKey(key)
      const pda = getPda(campoId, contenidoId, pdaId)
      const fromNiveles = getActiveNivelesConfig().pdaAjustes?.[key]
      const base = descs[key] || fromNiveles || defaultDescripcionState(pda?.texto || '')
      descs[key] = {
        ...base,
        opciones: buildOpcionesParaPda(pda?.texto || ''),
      }
    })
    return descs
  }

  const counts = {
    campos: selectedCampos.length,
    contenidos: selectedCampos.reduce((n, id) => n + (selectedContenidos[id] || []).length, 0),
    pdas: pdaKeys.length,
  }

  return (
    <div className="app theme-evaluacion">
      <header className="hero">
        <div className="hub-hero">
          <div className="brand hero-left">
            {onBack && (
              <button type="button" className="home-btn" onClick={onBack}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <path fill="currentColor" d="M12 3.2 3.5 10.2V20h6.2v-6.2h4.6V20h6.2V10.2L12 3.2z" />
                </svg>
                Inicio
              </button>
            )}
            <div>
              <p className="eyebrow">Miss Garabatos · Fase 2 Preescolar</p>
              <p className="tagline">
                Elige Campos, Contenidos y PDA; genera el Excel. Los alumnos y la evaluación se capturan ahí.
              </p>
            </div>
          </div>
          <h1 className="mod-title">Evaluación</h1>
          <div className="hero-right">
            <img className="hub-mascot" src={mascot} alt="Miss Garabatos" />
          </div>
        </div>
        <div className="hero-tools">
          <button type="button" className="btn secondary catalog-open-btn" onClick={() => setShowCatalog(true)}>
            Ajustar catálogo (Campos / Contenidos / PDA)
            {hasCustomCatalog() ? ' · personalizado' : ''}
          </button>
          <button type="button" className="btn secondary catalog-open-btn" onClick={() => setShowNiveles(true)}>
            Ajustar niveles (Logrado / Esperado / Proceso / RA)
            {hasCustomNiveles() ? ' · personalizado' : ''}
          </button>
        </div>
        <div className="meta-bar">
          <label>
            Escuela
            <input
              value={meta.escuela}
              onChange={(e) => setMeta({ ...meta, escuela: e.target.value })}
              placeholder="Nombre de la escuela"
            />
          </label>
          <label>
            Grupo
            <input
              value={meta.grupo}
              onChange={(e) => setMeta({ ...meta, grupo: e.target.value })}
              placeholder="1A"
            />
          </label>
          <label>
            Periodo
            <input
              value={meta.periodo}
              onChange={(e) => setMeta({ ...meta, periodo: e.target.value })}
              placeholder="Diagnóstico"
            />
          </label>
          <label>
            Docente
            <input
              value={meta.docente}
              onChange={(e) => setMeta({ ...meta, docente: e.target.value })}
              placeholder="Tu nombre"
            />
          </label>
        </div>
      </header>

      <nav className="steps" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`step-pill ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => {
              if (i <= step || canJumpTo(i)) setStep(i)
            }}
          >
            <span className="step-emoji">{s.emoji}</span>
            <span className="step-label">
              {i + 1}. {s.label}
            </span>
          </button>
        ))}
      </nav>

      <main className="panel">
        {step === 0 && (
          <StepCampos selected={selectedCampos} onToggle={toggleCampo} catalog={catalog} />
        )}
        {step === 1 && (
          <StepContenidos
            selectedCampos={selectedCampos}
            selectedContenidos={selectedContenidos}
            onToggle={toggleContenido}
            campoIdx={contenidoCampoIdx}
          />
        )}
        {step === 2 && (
          <StepPdas
            selectedCampos={selectedCampos}
            selectedContenidos={selectedContenidos}
            selectedPdas={selectedPdas}
            gradoFiltro={gradoFiltro}
            setGradoFiltro={setGradoFiltro}
            onToggle={togglePda}
            onSelectAll={selectAllPdasInContenido}
            onClear={clearPdasInContenido}
            campoIdx={pdaCampoIdx}
          />
        )}
        {step === 3 && (
          <StepDescripciones
            pdaKeys={pdaKeys}
            descripciones={descripciones}
            onUpdate={updateDesc}
            niveles={niveles}
          />
        )}
        {step === 4 && (
          <StepGenerar
            meta={meta}
            counts={counts}
            pdaKeys={pdaKeys}
            descripciones={descripciones}
            busy={busy}
            onGenerate={handleGenerate}
          />
        )}

        {showCatalog && (
          <div className="catalog-modal" role="dialog" aria-modal="true">
            <CatalogAdjuster
              catalog={catalog}
              onChange={setCatalog}
              onClose={() => setShowCatalog(false)}
            />
          </div>
        )}
        {showNiveles && (
          <div className="catalog-modal" role="dialog" aria-modal="true">
            <NivelesAdjuster
              pdaKeys={pdaKeys}
              onClose={() => setShowNiveles(false)}
              onSaved={(cfg) => setNiveles(cfg.niveles)}
            />
          </div>
        )}
      </main>

      <footer className="footer-bar">
        <div className="summary-chips">
          <span className="chip">{counts.campos} campo(s)</span>
          <span className="chip">{counts.contenidos} contenido(s)</span>
          <span className="chip accent">{counts.pdas} PDA</span>
        </div>
        <div className="nav-actions">
          <button type="button" className="btn ghost" disabled={step === 0} onClick={handleAtras}>
            Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn primary"
              disabled={!canGoNext()}
              onClick={handleContinuar}
            >
              Continuar
            </button>
          ) : (
            <div className="nav-gen-pair">
              <button
                type="button"
                className="btn secondary"
                disabled={busy || pdaKeys.length === 0}
                onClick={() => handleGenerate(false)}
              >
                {busy ? 'Generando…' : 'Sin modificar'}
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy || pdaKeys.length === 0}
                onClick={() => handleGenerate(true)}
              >
                {busy ? 'Generando…' : 'Modificar'}
              </button>
            </div>
          )}
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )

  function canJumpTo(i) {
    if (i === 0) return true
    if (i === 1) return selectedCampos.length >= 1
    if (i === 2) return selectedCampos.every((id) => (selectedContenidos[id] || []).length >= 1)
    if (i >= 3) return pdaKeys.length >= 1
    return false
  }
}

export function StepCampos({ selected, onToggle, catalog, title, help }) {
  const list = catalog?.length ? catalog : CAMPOS
  return (
    <section>
      <h2>{title || '1. Elige de 1 a 4 Campos formativos'}</h2>
      {help !== false && (
        <p className="help">
          {help || (
            <>
              Son los cuatro campos del Programa Sintético Fase 2. Puedes evaluar uno solo o combinar varios.
              Si un código o texto no cuadra, usa <strong>Ajustar catálogo</strong> arriba.
            </>
          )}
        </p>
      )}
      <div className="campo-grid">
        {list.map((c) => {
          const on = selected.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              className={`campo-card ${on ? 'selected' : ''}`}
              style={{
                '--campo': c.color,
                '--campo-soft': c.colorSoft,
                '--campo-dark': c.colorDark,
              }}
              onClick={() => onToggle(c.id)}
              aria-pressed={on}
            >
              <div className="campo-top">
                <span className="campo-title">
                  <span className="campo-emoji">{c.emoji}</span>
                  <h3>{c.nombre}</h3>
                </span>
                <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
              </div>
              <p>{c.descripcion}</p>
              <small>{c.contenidos.length} contenidos · {c.contenidos.reduce((n, x) => n + x.pdas.length, 0)} PDA (1°–3°)</small>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function StepContenidos({ selectedCampos, selectedContenidos, onToggle, title, help, campoIdx = 0 }) {
  const safeIdx = selectedCampos.length ? Math.min(campoIdx, selectedCampos.length - 1) : 0
  const campoId = selectedCampos[safeIdx]
  const campo = campoId ? getCampo(campoId) : null
  const picked = campoId ? selectedContenidos[campoId] || [] : []

  if (!campo) {
    return <p className="help">Selecciona al menos un campo en el paso anterior.</p>
  }

  return (
    <section>
      <h2>{title || '2. Selecciona Contenidos · campo por campo'}</h2>
      <p className="help">
        {help || (
          <>
            Ves <strong>un campo a la vez</strong>. Marca uno o más contenidos y pulsa <strong>Continuar</strong> para el siguiente campo.
          </>
        )}
      </p>
      <p className="pda-selected-count" style={{ marginBottom: '0.8rem' }}>
        Campo {safeIdx + 1} de {selectedCampos.length} · {picked.length} contenido(s)
      </p>
      <div
        className="bloque-campo"
        style={{ '--campo': campo.color, '--campo-soft': campo.colorSoft }}
      >
        <header>
          <span>{campo.emoji}</span>
          <h3>{campo.nombre}</h3>
          <em>{picked.length} seleccionado(s)</em>
        </header>
        <div className="contenido-list">
          {campo.contenidos.map((cont) => {
            const on = picked.includes(cont.id)
            return (
              <label key={cont.id} className={`contenido-item ${on ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(campoId, cont.id)}
                />
                <div>
                  <strong>{cont.id}</strong>
                  <p>{cont.nombre}</p>
                  <small>{cont.pdas.length} PDA disponibles</small>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function StepPdas({
  selectedCampos,
  selectedContenidos,
  selectedPdas,
  gradoFiltro,
  setGradoFiltro,
  onToggle,
  onSelectAll,
  onClear,
  campoIdx,
  title,
  help,
}) {
  const safeCampoIdx = selectedCampos.length ? Math.min(campoIdx, selectedCampos.length - 1) : 0
  const campoId = selectedCampos[safeCampoIdx]
  const campo = campoId ? getCampo(campoId) : null
  const conts = campoId ? selectedContenidos[campoId] || [] : []

  const selectedInCampo = useMemo(() => {
    if (!campoId) return 0
    return conts.reduce((n, contenidoId) => n + (selectedPdas[`${campoId}::${contenidoId}`] || []).length, 0)
  }, [campoId, conts, selectedPdas])

  if (!campo) {
    return <p className="help">Selecciona al menos un campo en el paso anterior.</p>
  }

  return (
    <section>
      <h2>{title || '3. Elige los PDA · campo por campo'}</h2>
      <p className="help">
        {help || (
          <>
            Ves <strong>un campo a la vez</strong>. Cuando termines, pulsa <strong>Continuar</strong> abajo
            para pasar al siguiente campo.
          </>
        )}
      </p>

      <div className="grado-filters">
        <span>Ver grado:</span>
        {[
          { v: 0, label: 'Todos' },
          { v: 1, label: '1°' },
          { v: 2, label: '2°' },
          { v: 3, label: '3°' },
        ].map((g) => (
          <button
            key={g.v}
            type="button"
            className={`btn tiny ${gradoFiltro === g.v ? 'primary' : 'ghost'}`}
            onClick={() => setGradoFiltro(g.v)}
          >
            {g.label}
          </button>
        ))}
        <em className="pda-selected-count">
          Campo {safeCampoIdx + 1} de {selectedCampos.length} · {selectedInCampo} PDA
        </em>
      </div>

      <div
        className="bloque-campo"
        style={{ '--campo': campo.color, '--campo-soft': campo.colorSoft }}
      >
        <header>
          <span>{campo.emoji}</span>
          <h3>{campo.nombre}</h3>
          <em>prefijo {campo.prefix}PDA</em>
        </header>
        {conts.map((contenidoId) => {
          const cont = getContenido(campoId, contenidoId)
          if (!cont) return null
          const ck = `${campoId}::${contenidoId}`
          const picked = selectedPdas[ck] || []
          const visiblePdas = cont.pdas.filter((p) => !gradoFiltro || p.grado === gradoFiltro)
          return (
            <div key={contenidoId} className="pda-block">
              <div className="pda-block-head">
                <div>
                  <strong>{cont.id}</strong>
                  <p>{cont.nombre}</p>
                </div>
                <div className="mini-actions">
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => onSelectAll(campoId, contenidoId, visiblePdas)}
                  >
                    Todos{gradoFiltro ? ` ${gradoFiltro}°` : ''}
                  </button>
                  <button type="button" className="btn tiny ghost" onClick={() => onClear(campoId, contenidoId)}>
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="pda-list">
                {visiblePdas.map((pda) => {
                  const on = picked.includes(pda.id)
                  return (
                    <label key={pda.id} className={`pda-item ${on ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => onToggle(campoId, contenidoId, pda.id, pda.texto)}
                      />
                      <div>
                        <span className="pda-badge">{pda.codigo}</span>
                        <span className="grado-badge">{pda.grado}°</span>
                        <p>{pda.texto}</p>
                      </div>
                    </label>
                  )
                })}
                {visiblePdas.length === 0 && (
                  <p className="muted">No hay PDA de {gradoFiltro}° en este contenido.</p>
                )}
              </div>
            </div>
          )
        })}
        {conts.length === 0 && (
          <p className="muted">Este campo no tiene contenidos seleccionados.</p>
        )}
      </div>
    </section>
  )
}

function StepDescripciones({ pdaKeys, descripciones, onUpdate, niveles }) {
  const nivelList = niveles?.length ? niveles : getActiveNiveles()
  if (pdaKeys.length === 0) {
    return <p className="help">Aún no hay PDA seleccionados.</p>
  }
  return (
    <section>
      <h2>4. Configura descripciones por nivel</h2>
      <p className="help">
        Por cada PDA y cada nivel (L / E / P / RA) hay <strong>3 opciones</strong> (190–200 caracteres):
        lenguaje de rúbrica preescolar a partir del PDA. Elige una o escribe la tuya.
      </p>
      <div className="stack">
        {pdaKeys.map((key) => {
          const { campoId, contenidoId, pdaId } = parsePdaKey(key)
          const campo = getCampo(campoId)
          const cont = getContenido(campoId, contenidoId)
          const pda = getPda(campoId, contenidoId, pdaId)
          if (!campo || !cont || !pda) return null
          const desc = descripciones[key] || defaultDescripcionState(pda?.texto || '')
          const opcionesPda = buildOpcionesParaPda(pda?.texto || '')
          return (
            <article
              key={key}
              className="desc-card"
              style={{ '--campo': campo.color, '--campo-soft': campo.colorSoft }}
            >
              <header>
                <span className="pill" style={{ background: campo.color }}>
                  {campo.emoji} {campo.nombre}
                </span>
                <h3>{cont.id}</h3>
                <p className="muted">{cont.nombre}</p>
                <p className="pda-focus">
                  <span className="pda-badge">{pda.codigo}</span>{' '}
                  <span className="grado-badge">{pda.grado}°</span>
                  <br />
                  <strong>PDA:</strong> {pda.texto}
                </p>
              </header>
              <div className="nivel-grid">
                {nivelList.map((n) => {
                  const slot = desc[n.code]
                  const opciones = opcionesPda[n.code] || []
                  return (
                    <div key={n.code} className="nivel-box" style={{ borderColor: n.color }}>
                      <div className="nivel-head" style={{ background: n.bg, color: n.fg }}>
                        {n.code} · {n.label}
                      </div>
                      <div className="opciones">
                        {opciones.map((txt, i) => (
                          <label key={i} className={(!slot.useCustom && slot.optionIndex === i) ? 'picked' : ''}>
                            <input
                              type="radio"
                              name={`${key}-${n.code}`}
                              checked={!slot.useCustom && slot.optionIndex === i}
                              onChange={() => onUpdate(key, n.code, { optionIndex: i, useCustom: false })}
                            />
                            <span><em>Opción {i + 1}</em> {txt}</span>
                          </label>
                        ))}
                        <label className={slot.useCustom ? 'picked custom' : 'custom'}>
                          <input
                            type="radio"
                            name={`${key}-${n.code}`}
                            checked={!!slot.useCustom}
                            onChange={() => onUpdate(key, n.code, { useCustom: true })}
                          />
                          <span>
                            <em>Escribir la mía</em>
                            <textarea
                              rows={3}
                              value={slot.custom}
                              placeholder="Tu descripción para este nivel…"
                              onChange={(e) =>
                                onUpdate(key, n.code, { custom: e.target.value, useCustom: true })
                              }
                              onFocus={() => onUpdate(key, n.code, { useCustom: true })}
                            />
                          </span>
                        </label>
                      </div>
                      <div className="preview-txt">
                        <strong>Quedará en el Excel:</strong>
                        <p>{resolveTextoNivel(desc, n.code)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function StepGenerar({
  counts,
  pdaKeys,
  descripciones,
  busy,
  onGenerate,
  meta,
}) {
  const items = useMemo(() => buildItems(pdaKeys, descripciones), [pdaKeys, descripciones])

  return (
    <section className="generar">
      <h2>5. Generar Excel</h2>
      <p className="help">
        Descarga el Excel (.xlsm). En la página ya elegiste las 3 opciones o tu texto.
        Aquí decides si quien reciba el archivo podrá cambiar esos textos con la lista 1, 2, 3.
      </p>

      <div className="resume-grid">
        <div className="resume-card">
          <h3>Resumen</h3>
          <ul>
            <li><strong>{counts.campos}</strong> campos</li>
            <li><strong>{counts.contenidos}</strong> contenidos</li>
            <li><strong>{counts.pdas}</strong> PDA</li>
            <li>Esc: <strong>{meta.escuela || '—'}</strong></li>
            <li>Docente: <strong>{meta.docente || '—'}</strong></li>
            <li>Grupo: <strong>{meta.grupo || '—'}</strong></li>
          </ul>
        </div>
        <div className="resume-card wide">
          <h3>Indicadores</h3>
          <ol className="indicator-list">
            {items.map((it) => (
              <li key={it.key}>
                <span className="dot" style={{ background: it.campo?.color }} />
                <div>
                  <strong>{it.shortCode} · {it.campo?.nombre} · {it.pda?.grado}°</strong>
                  <p>{it.pda?.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ol className="flow-steps">
        <li>Descarga el Excel (.xlsm) con Esc / Docente / Grupo prellenados (habilita macros al abrirlo).</li>
        <li>Completa la hoja <strong>Alumnos</strong> y marca L/E/P/RA en <strong>Evaluacion</strong>.</li>
        <li>
          En <strong>Tablas y Graficas Grupal</strong> verás conteos y una gráfica por cada campo formativo que elegiste; se actualizan solos.
        </li>
        <li>
          En <strong>Reporte_Individual</strong> verás la franja verde «PDF TODOS LOS ALUMNOS». Con macros: Alt+F8 →{' '}
          <strong>GenerarPDFTodosReportes</strong> (también se crea un botón clicable al abrir).
        </li>
      </ol>

      <div className="gen-actions">
        <button
          type="button"
          className="btn secondary xl"
          disabled={busy || pdaKeys.length === 0}
          onClick={() => onGenerate(false)}
        >
          {busy ? 'Generando…' : 'Sin modificar'}
        </button>
        <button
          type="button"
          className="btn primary xl"
          disabled={busy || pdaKeys.length === 0}
          onClick={() => onGenerate(true)}
        >
          {busy ? 'Generando…' : 'Modificar'}
        </button>
      </div>
      <p className="help gen-hint">
        <strong>Sin modificar:</strong> textos fijos, como los dejaste aquí.{' '}
        <strong>Modificar:</strong> en el Excel aparece la lista 1, 2, 3 para cambiar el texto.
      </p>
    </section>
  )
}
