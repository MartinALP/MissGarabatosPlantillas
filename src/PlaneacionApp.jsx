import { useEffect, useMemo, useState } from 'react'
import {
  makePdaKey,
  getActiveCampos,
} from './data/catalogoFase2'
import { MODALIDADES } from './data/modalidadesTrabajo'
import { generatePlaneacionPptx } from './pptx/generatePlaneacionPptx'
import { generatePlaneacionDocx } from './docx/generatePlaneacionDocx'
import { StepCampos, StepContenidos, StepPdas, scrollToTop } from './App'
import { EJES_ARTICULADORES } from './data/ejesArticuladores'
import mascot from './assets/miss-garabatos.png'
import './App.css'

const STEPS = [
  { id: 'ejes', label: 'Ejes', emoji: '💜' },
  { id: 'campos', label: 'Campos', emoji: '📚' },
  { id: 'contenidos', label: 'Contenidos', emoji: '🧩' },
  { id: 'pdas', label: 'PDA', emoji: '⭐' },
  { id: 'modalidad', label: 'Modalidad', emoji: '🧭' },
  { id: 'generar', label: 'Descargar', emoji: '📥' },
]

export default function PlaneacionApp({ onBack }) {
  const [step, setStep] = useState(0)
  const [gradoFiltro, setGradoFiltro] = useState(0)
  const [meta, setMeta] = useState({
    escuela: '',
    grupo: '1A',
    periodo: 'Diagnóstico',
    docente: '',
  })
  const [selectedEjes, setSelectedEjes] = useState([])
  const [selectedCampos, setSelectedCampos] = useState([])
  const [selectedContenidos, setSelectedContenidos] = useState({})
  const [selectedPdas, setSelectedPdas] = useState({})
  const [pdaCampoIdx, setPdaCampoIdx] = useState(0)
  const [contenidoCampoIdx, setContenidoCampoIdx] = useState(0)
  const [modalidadId, setModalidadId] = useState('')
  const [porDia, setPorDia] = useState(false)
  const [busy, setBusy] = useState('')
  const [toast, setToast] = useState('')
  const catalog = getActiveCampos()
  const modalidad = MODALIDADES.find((m) => m.id === modalidadId)

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

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function toggleEje(nombre) {
    setSelectedEjes((prev) =>
      prev.includes(nombre) ? prev.filter((x) => x !== nombre) : [...prev, nombre],
    )
  }

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
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  function toggleContenido(campoId, contenidoId) {
    setSelectedContenidos((prev) => {
      const list = prev[campoId] || []
      const next = list.includes(contenidoId)
        ? list.filter((x) => x !== contenidoId)
        : [...list, contenidoId]
      return { ...prev, [campoId]: next }
    })
  }

  function togglePda(campoId, contenidoId, pdaId) {
    const ck = `${campoId}::${contenidoId}`
    setSelectedPdas((prev) => {
      const list = prev[ck] || []
      const nextList = list.includes(pdaId) ? list.filter((x) => x !== pdaId) : [...list, pdaId]
      return { ...prev, [ck]: nextList }
    })
  }

  function selectAllPdasInContenido(campoId, contenidoId, pdas) {
    const ck = `${campoId}::${contenidoId}`
    setSelectedPdas((prev) => {
      const existing = prev[ck] || []
      const add = pdas.map((p) => p.id)
      return { ...prev, [ck]: [...new Set([...existing, ...add])] }
    })
  }

  function clearPdasInContenido(campoId, contenidoId) {
    const ck = `${campoId}::${contenidoId}`
    setSelectedPdas((prev) => ({ ...prev, [ck]: [] }))
  }

  function pdasInCampo(campoId) {
    const conts = selectedContenidos[campoId] || []
    return conts.reduce((n, cid) => n + (selectedPdas[`${campoId}::${cid}`] || []).length, 0)
  }

  function canGoNext() {
    if (step === 0) return selectedEjes.length >= 1
    if (step === 1) return selectedCampos.length >= 1
    if (step === 2) {
      const campoId = selectedCampos[Math.min(contenidoCampoIdx, Math.max(selectedCampos.length - 1, 0))]
      return campoId ? (selectedContenidos[campoId] || []).length >= 1 : false
    }
    if (step === 3) {
      const campoId = selectedCampos[Math.min(pdaCampoIdx, Math.max(selectedCampos.length - 1, 0))]
      return campoId ? pdasInCampo(campoId) >= 1 : false
    }
    if (step === 4) return Boolean(modalidadId) || porDia
    return true
  }

  function handleAtras() {
    if (step === 3 && pdaCampoIdx > 0) {
      setPdaCampoIdx((i) => i - 1)
      return
    }
    if (step === 2 && contenidoCampoIdx > 0) {
      setContenidoCampoIdx((i) => i - 1)
      return
    }
    if (step === 3) setContenidoCampoIdx(Math.max(selectedCampos.length - 1, 0))
    setStep((s) => Math.max(0, s - 1))
  }

  function handleContinuar() {
    if (step === 2) {
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
      setStep(3)
      return
    }
    if (step === 3) {
      const cur = pdaCampoIdx
      const last = selectedCampos.length - 1
      if (pdasInCampo(selectedCampos[cur]) < 1) {
        flash('Selecciona al menos un PDA en este campo.')
        return
      }
      if (cur < last) {
        setPdaCampoIdx(cur + 1)
        return
      }
      setStep(4)
      return
    }
    if (!canGoNext()) return
    if (step === 1) setContenidoCampoIdx(0)
    setStep((s) => s + 1)
  }

  async function handleGenerate() {
    if ((!modalidad && !porDia) || pdaKeys.length === 0) return
    setBusy('ppt')
    try {
      await generatePlaneacionPptx({ meta, pdaKeys, modalidad, porDia, ejes: selectedEjes })
      flash('PowerPoint listo. Ábrelo y llena los recuadros.')
    } catch (err) {
      console.error(err)
      flash('No se pudo generar el PowerPoint.')
    } finally {
      setBusy('')
    }
  }

  async function handleGenerateWord() {
    if ((!modalidad && !porDia) || pdaKeys.length === 0) return
    setBusy('word')
    try {
      await generatePlaneacionDocx({ meta, pdaKeys, modalidad, porDia, ejes: selectedEjes })
      flash('Word listo. Ábrelo y llena los recuadros.')
    } catch (err) {
      console.error(err)
      flash('No se pudo generar el Word.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="app theme-planeacion">
      <header className="hero">
        <div className="hub-hero">
          <div className="brand hero-left">
            <button type="button" className="home-btn" onClick={onBack}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <path fill="currentColor" d="M12 3.2 3.5 10.2V20h6.2v-6.2h4.6V20h6.2V10.2L12 3.2z" />
              </svg>
              Inicio
            </button>
            <div>
              <p className="eyebrow">Miss Garabatos · Fase 2 Preescolar</p>
              <p className="tagline">Elige cada una de las opciones y descarga la plantilla</p>
            </div>
          </div>
          <h1 className="mod-title">Planeación</h1>
          <div className="hero-right">
            <img className="hub-mascot" src={mascot} alt="Miss Garabatos" />
          </div>
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
              if (i <= step) setStep(i)
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
          <section>
            <h2>1. Elige los ejes articuladores</h2>
            <p className="help">
              Marca los que trabajarás. En el PowerPoint y el Word saldrán más oscuros; los demás quedan claros para que puedas cambiarlos a mano.
            </p>
            <div className="eje-grid">
              {EJES_ARTICULADORES.map((e) => {
                const on = selectedEjes.includes(e)
                return (
                  <button
                    key={e}
                    type="button"
                    className={`eje-card ${on ? 'selected' : ''}`}
                    onClick={() => toggleEje(e)}
                    aria-pressed={on}
                  >
                    <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                    <span>{e}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
        {step === 1 && (
          <StepCampos
            selected={selectedCampos}
            onToggle={toggleCampo}
            catalog={catalog}
            help={false}
            title="2. Elige de 1 a 4 Campos formativos"
          />
        )}
        {step === 2 && (
          <StepContenidos
            selectedCampos={selectedCampos}
            selectedContenidos={selectedContenidos}
            onToggle={toggleContenido}
            campoIdx={contenidoCampoIdx}
            title="3. Selecciona Contenidos · campo por campo"
          />
        )}
        {step === 3 && (
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
            title="4. Elige los PDA · campo por campo"
          />
        )}
        {step === 4 && (
          <section>
            <div className="panel-head">
              <h2>5. Elige la modalidad de trabajo</h2>
              <button
                type="button"
                className={`btn por-dia-btn ${porDia ? 'primary' : 'ghost'}`}
                onClick={() => {
                  setPorDia(true)
                  setModalidadId('')
                }}
                aria-pressed={porDia}
              >
                {porDia ? '✓ Por día' : 'Por día'}
              </button>
            </div>
            <div className="hub-grid metodo-grid">
              {MODALIDADES.map((m) => {
                const on = modalidadId === m.id && !porDia
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`hub-card ${on ? 'selected' : ''}`}
                    style={{ '--campo': m.color, borderColor: on ? m.color : undefined }}
                    onClick={() => {
                      setModalidadId(m.id)
                      setPorDia(false)
                    }}
                    aria-pressed={on}
                  >
                    <div className="hub-card-head">
                      <h2 style={{ color: m.color }}>{m.nombre}</h2>
                      <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                    </div>
                    <p>{m.resumen} {m.momentos.length} momentos.</p>
                  </button>
                )
              })}
            </div>
            {porDia && (
              <p className="help">
                Se descargará la plantilla por día (Lunes a Viernes).{' '}
                <button type="button" className="btn tiny ghost" onClick={() => setPorDia(false)}>
                  Usar momentos
                </button>
              </p>
            )}
            {modalidad && !porDia && (
              <ol className="flow-steps">
                {modalidad.momentos.map((mo) => (
                  <li key={mo.titulo}>
                    <strong>{mo.titulo}.</strong> {mo.intencion}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
        {step === 5 && (
          <section className="generar">
            <h2>6. Descargar planeación</h2>
            <p className="help">
              {porDia
                ? 'Incluye portada, tabla de PDA, cronograma y una hoja por día (Lunes a Viernes) con título, PDA y materiales.'
                : 'Incluye portada, tabla de PDA, el cuadro de la modalidad con materiales y un cronograma semanal vacío.'}
            </p>
            <ul>
              <li>
                <strong>{selectedEjes.length}</strong> eje(s) · <strong>{pdaKeys.length}</strong> PDA · modalidad:{' '}
                <strong>{modalidad?.nombre || (porDia ? 'Por día' : '—')}</strong>
              </li>
            </ul>
            <div className="gen-actions">
              <button
                type="button"
                className="btn primary xl"
                disabled={Boolean(busy) || (!modalidad && !porDia)}
                onClick={handleGenerate}
              >
                {busy === 'ppt' ? 'Generando…' : '📽️ Descargar PowerPoint'}
              </button>
              <button
                type="button"
                className="btn primary xl"
                disabled={Boolean(busy) || (!modalidad && !porDia)}
                onClick={handleGenerateWord}
              >
                {busy === 'word' ? 'Generando…' : '📄 Descargar en Word'}
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer-bar">
        <div className="summary-chips">
          <span className="chip">{selectedEjes.length} eje(s)</span>
          <span className="chip">{selectedCampos.length} campo(s)</span>
          <span className="chip">
            {selectedCampos.reduce((n, id) => n + (selectedContenidos[id] || []).length, 0)} contenido(s)
          </span>
          <span className="chip accent">{pdaKeys.length} PDA</span>
          {modalidad && <span className="chip">{modalidad.nombre}</span>}
        </div>
        <div className="nav-actions">
          <button type="button" className="btn ghost" disabled={step === 0} onClick={handleAtras}>
            Atrás
          </button>
          {step < STEPS.length - 1 && (
            <button type="button" className="btn primary" disabled={!canGoNext()} onClick={handleContinuar}>
              Continuar
            </button>
          )}
        </div>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
