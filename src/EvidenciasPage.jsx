import { useEffect, useMemo, useState } from 'react'
import {
  getActiveCampos,
  getCampo,
  getPda,
} from './data/catalogoFase2'
import { generateEvidenciasPptx } from './pptx/generateEvidenciasPptx'
import { proponerIndicadores } from './data/indicadoresCotejo'
import { StepCampos, StepContenidos, StepPdas, scrollToTop } from './App'
import { saveAs } from 'file-saver'
import { mgPut, MG_KEYS } from './api/missGarabatosApi'
import { listPlantillasEvidencias, savePlantillaEvidencia } from './data/plantillasEvidenciasStore'
import mascot from './assets/miss-garabatos.png'
import './App.css'

const MAX_PDA = 3
const TIPO = {
  grafica: { id: 'grafica', label: 'Evidencia gráfica', emoji: '🖼️' },
  cotejo: { id: 'cotejo', label: 'Lista de cotejo', emoji: '☑️' },
}
const STEPS = [
  { id: 'tipo', label: 'Tipo', emoji: '🗂️' },
  { id: 'campos', label: 'Campo', emoji: '📚' },
  { id: 'contenidos', label: 'Contenido', emoji: '🧩' },
  { id: 'pdas', label: 'PDA', emoji: '⭐' },
  { id: 'adjuntos', label: 'Adjuntar', emoji: '📎' },
  { id: 'descargar', label: 'Descargar', emoji: '📽️' },
]
function firstFourWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, 4).join(' ')
}

function pdaPreview(slide) {
  return (slide.pdaIds || [])
    .map((id) => firstFourWords(getPda(slide.campoId, slide.contenidoId, id)?.texto))
    .filter(Boolean)
    .join(' · ')
}

function emptyDraft(tipo = null) {
  return {
    tipo,
    selectedCampos: [],
    selectedContenidos: {},
    selectedPdas: {},
    pptAdjunto: null,
    pptVacio: false,
    adjuntoModo: null,
    indicadoresSel: [],
    cotejoVacio: false,
  }
}

function slidesFromDraft(draft) {
  const campoId = draft.selectedCampos[0]
  const contenidoId = (draft.selectedContenidos[campoId] || [])[0]
  const pdaIds = (draft.selectedPdas[`${campoId}::${contenidoId}`] || []).slice(0, MAX_PDA)
  if (!draft.tipo || !campoId || !contenidoId || !pdaIds.length) return []
  return [{
    tipo: draft.tipo,
    campoId,
    contenidoId,
    pdaIds,
    pptName: draft.tipo === 'grafica' && !draft.pptVacio ? draft.pptAdjunto?.name : undefined,
    pptBlob: draft.tipo === 'grafica' && !draft.pptVacio ? draft.pptAdjunto?.blob : undefined,
    pptVacio: draft.tipo === 'grafica' ? Boolean(draft.pptVacio) : false,
    indicadores: draft.tipo === 'cotejo' && !draft.cotejoVacio ? (draft.indicadoresSel || []) : [],
    cotejoVacio: draft.tipo === 'cotejo' ? Boolean(draft.cotejoVacio) : false,
  }]
}

function slideToDraft(slide) {
  if (!slide) return emptyDraft()
  return {
    tipo: slide.tipo || 'grafica',
    selectedCampos: [slide.campoId],
    selectedContenidos: { [slide.campoId]: [slide.contenidoId] },
    selectedPdas: { [`${slide.campoId}::${slide.contenidoId}`]: [...slide.pdaIds] },
    pptAdjunto: slide.pptBlob ? { name: slide.pptName, blob: slide.pptBlob } : null,
    pptVacio: Boolean(slide.pptVacio),
    adjuntoModo: slide.pptVacio ? 'vacio' : slide.pptBlob ? 'subir' : null,
    indicadoresSel: slide.indicadores || [],
    cotejoVacio: Boolean(slide.cotejoVacio) || (slide.tipo === 'cotejo' && !(slide.indicadores || []).length),
  }
}

export default function EvidenciasPage({ onBack, savedState = null }) {
  const [step, setStep] = useState(0)
  const [gradoFiltro, setGradoFiltro] = useState(0)
  const [draft, setDraft] = useState(emptyDraft)
  const [slides, setSlides] = useState([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [extraIndicador, setExtraIndicador] = useState('')
  const [hydrated, setHydrated] = useState(!savedState)
  const [plantillas, setPlantillas] = useState([])
  const catalog = getActiveCampos()
  const slideNum = slides.length + 1
  const { tipo, selectedCampos, selectedContenidos, selectedPdas, pptAdjunto, pptVacio, adjuntoModo, indicadoresSel = [], cotejoVacio = false } = draft

  useEffect(() => {
    const saved = savedState
    if (!saved) return
    const hasWork = (Array.isArray(saved.slides) && saved.slides.length) || saved.draft?.tipo
    if (!hasWork) return
    if (saved.draft) setDraft({ ...emptyDraft(), ...saved.draft, pptAdjunto: null })
    if (Array.isArray(saved.slides)) {
      setSlides(saved.slides.map((s) => ({ ...s, pptBlob: undefined })))
    }
    if (typeof saved.step === 'number') setStep(Math.min(Math.max(saved.step, 0), STEPS.length - 1))
    if (typeof saved.gradoFiltro === 'number') setGradoFiltro(saved.gradoFiltro)
    setHydrated(true)
  }, [savedState])

  useEffect(() => {
    listPlantillasEvidencias()
      .then(setPlantillas)
      .catch((err) => console.error('No se pudieron leer plantillas propias', err))
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const t = setTimeout(() => {
      const draftSafe = { ...draft, pptAdjunto: null }
      const slidesSafe = slides.map((s) => {
        const { pptBlob, ...rest } = s
        return rest
      })
      mgPut(MG_KEYS.evidencias, { draft: draftSafe, slides: slidesSafe, step, gradoFiltro }).catch((err) => {
        console.error('No se pudo guardar evidencias en la BD', err)
      })
    }, 450)
    return () => clearTimeout(t)
  }, [hydrated, draft, slides, step, gradoFiltro])

  useEffect(() => {
    scrollToTop()
  }, [step])

  const gruposPlantillas = useMemo(() => {
    const map = new Map()
    for (const p of plantillas) {
      const key = p.campoId || 'otros'
      if (!map.has(key)) {
        map.set(key, {
          nombre: p.campoNombre || getCampo(p.campoId)?.nombre || 'Otros',
          items: [],
        })
      }
      map.get(key).items.push(p)
    }
    return [...map.values()]
  }, [plantillas])

  const propuestasCotejo = useMemo(() => {
    if (tipo !== 'cotejo') return []
    return proponerIndicadores(selectedCampos[0])
  }, [tipo, selectedCampos])

  const pdaCount = useMemo(() => {
    const campoId = selectedCampos[0]
    const contenidoId = (selectedContenidos[campoId] || [])[0]
    if (!campoId || !contenidoId) return 0
    return (selectedPdas[`${campoId}::${contenidoId}`] || []).length
  }, [selectedCampos, selectedContenidos, selectedPdas])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  function toggleCampo(id) {
    setDraft((prev) => {
      if (prev.selectedCampos[0] === id) {
        return { ...emptyDraft(prev.tipo) }
      }
      return {
        tipo: prev.tipo,
        selectedCampos: [id],
        selectedContenidos: {},
        selectedPdas: {},
        pptAdjunto: null,
        indicadoresSel: [],
        cotejoVacio: false,
      }
    })
  }

  function toggleContenido(campoId, contenidoId) {
    setDraft((prev) => {
      const cur = (prev.selectedContenidos[campoId] || [])[0]
      const nextId = cur === contenidoId ? null : contenidoId
      return {
        ...prev,
        selectedContenidos: nextId ? { [campoId]: [nextId] } : { [campoId]: [] },
        selectedPdas: {},
      }
    })
  }

  function togglePda(campoId, contenidoId, pdaId) {
    const ck = `${campoId}::${contenidoId}`
    setDraft((prev) => {
      const list = prev.selectedPdas[ck] || []
      if (list.includes(pdaId)) {
        return { ...prev, selectedPdas: { ...prev.selectedPdas, [ck]: list.filter((x) => x !== pdaId) } }
      }
      if (list.length >= MAX_PDA) {
        flash(`Máximo ${MAX_PDA} PDA por diapositiva.`)
        return prev
      }
      return { ...prev, selectedPdas: { ...prev.selectedPdas, [ck]: [...list, pdaId] } }
    })
  }

  function selectAllPdasInContenido(campoId, contenidoId, pdas) {
    const ck = `${campoId}::${contenidoId}`
    const add = pdas.map((p) => p.id).slice(0, MAX_PDA)
    if (pdas.length > MAX_PDA) flash(`Se tomaron los primeros ${MAX_PDA} PDA.`)
    setDraft((prev) => ({ ...prev, selectedPdas: { ...prev.selectedPdas, [ck]: add } }))
  }

  function clearPdasInContenido(campoId, contenidoId) {
    const ck = `${campoId}::${contenidoId}`
    setDraft((prev) => ({ ...prev, selectedPdas: { ...prev.selectedPdas, [ck]: [] } }))
  }

  function canGoNext() {
    if (step === 0) return tipo === 'grafica' || tipo === 'cotejo'
    if (step === 1) return selectedCampos.length === 1
    if (step === 2) return selectedCampos.every((id) => (selectedContenidos[id] || []).length === 1)
    if (step === 3) return pdaCount >= 1
    if (step === 4) {
      if (tipo === 'cotejo') return cotejoVacio || indicadoresSel.length >= 1
      return Boolean(pptAdjunto?.blob) || Boolean(pptVacio)
    }
    return slides.length >= 1
  }

  function handleContinuar() {
    if (step === 3) {
      if (pdaCount < 1) {
        flash('Selecciona al menos un PDA.')
        return
      }
      if (tipo === 'cotejo') {
        setDraft((prev) => ({
          ...prev,
          cotejoVacio: prev.cotejoVacio || !(prev.indicadoresSel || []).length,
        }))
      }
      setStep(4)
      return
    }
    if (step === 4) {
      const nuevos = slidesFromDraft(draft)
      if (!nuevos.length) {
        flash('Falta completar campo, contenido y PDA.')
        return
      }
      if (tipo === 'grafica' && !nuevos[0].pptBlob && !draft.pptVacio) {
        flash('Sube, selecciona o elige Vacío.')
        return
      }
      if (tipo === 'cotejo' && !draft.cotejoVacio && !(nuevos[0].indicadores || []).length) {
        flash('Elige Vacío o al menos un indicador.')
        return
      }
      setSlides((prev) => [...prev, ...nuevos])
      setStep(5)
      return
    }
    if (!canGoNext()) return
    setStep((s) => s + 1)
  }

  function handleAtras() {
    if (step === 0 && slides.length) {
      setStep(5)
      return
    }
    if (step === 5) {
      setSlides((prev) => {
        if (!prev.length) return prev
        const last = prev[prev.length - 1]
        setDraft(slideToDraft(last))
        return prev.slice(0, -1)
      })
      setStep(4)
      return
    }
    setStep((s) => Math.max(0, s - 1))
  }

  function onPickPpt(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const ok = /\.pptx?$/i.test(file.name) || /presentation|powerpoint/i.test(file.type)
    if (!ok) {
      flash('Sube un archivo PowerPoint (.pptx).')
      return
    }
    setDraft((prev) => ({ ...prev, pptAdjunto: { name: file.name, blob: file }, pptVacio: false, adjuntoModo: 'subir' }))
    flash('PowerPoint listo. Se descargará tal cual.')
    const campoId = selectedCampos[0]
    if (campoId) {
      savePlantillaEvidencia({
        campoId,
        campoNombre: getCampo(campoId)?.nombre,
        name: file.name,
        blob: file,
      })
        .then((rec) => setPlantillas((prev) => [rec, ...prev.filter((p) => p.id !== rec.id)]))
        .catch((err) => console.error(err))
    }
  }

  function quitarPpt() {
    setDraft((prev) => ({ ...prev, pptAdjunto: null, pptVacio: false }))
  }

  function elegirPlantilla(rec) {
    setDraft((prev) => ({
      ...prev,
      pptAdjunto: { name: rec.name, blob: rec.blob },
      pptVacio: false,
      adjuntoModo: 'seleccionar',
    }))
    flash(`Seleccionaste ${rec.name}.`)
  }

  function irVacioYDescargar() {
    const next = { ...draft, pptAdjunto: null, pptVacio: true, adjuntoModo: 'vacio' }
    const nuevos = slidesFromDraft(next)
    if (!nuevos.length) {
      flash('Falta completar campo, contenido y PDA.')
      return
    }
    setDraft(next)
    setSlides((prev) => [...prev, ...nuevos])
    setStep(5)
  }

  function toggleVacio() {
    setDraft((prev) => ({
      ...prev,
      cotejoVacio: true,
      indicadoresSel: [],
    }))
  }

  function toggleIndicador(texto) {
    setDraft((prev) => {
      const list = prev.indicadoresSel || []
      const next = list.includes(texto) ? list.filter((x) => x !== texto) : [...list, texto]
      return { ...prev, cotejoVacio: false, indicadoresSel: next }
    })
  }

  function agregarIndicadorManual() {
    const t = extraIndicador.trim()
    if (!t) return
    setDraft((prev) => {
      const list = prev.indicadoresSel || []
      if (list.includes(t)) return prev
      return { ...prev, cotejoVacio: false, indicadoresSel: [...list, t] }
    })
    setExtraIndicador('')
  }

  function handleAgregarDiapositiva() {
    setDraft(emptyDraft())
    setExtraIndicador('')
    setGradoFiltro(0)
    setStep(0)
    flash(`Diapositiva ${slides.length + 1} lista. Ahora arma la siguiente.`)
  }

  function quitarSlide(idx) {
    setSlides((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleGenerate() {
    const passthrough = slides.filter((s) => s.pptBlob)
    const generated = slides.filter((s) => !s.pptBlob)
    if (!passthrough.length && !generated.length) return
    setBusy(true)
    try {
      for (const s of passthrough) {
        saveAs(s.pptBlob, s.pptName || 'Evidencia.pptx')
      }
      if (generated.length) {
        await generateEvidenciasPptx({ slides: generated })
      }
      flash(passthrough.length
        ? 'Tu PowerPoint se descargó tal cual lo subiste.'
        : 'PowerPoint de evidencias listo.')
    } catch (err) {
      console.error(err)
      flash('No se pudo descargar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app theme-evidencias">
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
          <h1 className="mod-title">Evidencias</h1>
          <div className="hero-right">
            <img className="hub-mascot" src={mascot} alt="Miss Garabatos" />
          </div>
        </div>
      </header>

      <nav className="steps" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`step-pill ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => {
              if (i < step) setStep(i)
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
        {step < 5 && (
          <p className="slide-progress">
            Armando <strong>diapositiva {slideNum}</strong>
            {tipo ? ` · ${TIPO[tipo]?.label}` : ''}
            {slides.length > 0 ? ` · ${slides.length} ya en el PowerPoint` : ''}
          </p>
        )}
        {step === 0 && (
          <section>
            <h2>1. Diapositiva {slideNum} · ¿Qué hoja quieres?</h2>
            <p className="help">
              Evidencia gráfica: subes tu PowerPoint y se descarga igual. Lista de cotejo es la rúbrica Sí / Con ayuda / No.
            </p>
            <div className="tipo-pick-grid">
              {Object.values(TIPO).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`hub-card evidencias ${tipo === t.id ? 'selected' : ''}`}
                  onClick={() => setDraft((prev) => ({ ...emptyDraft(t.id), tipo: t.id }))}
                  aria-pressed={tipo === t.id}
                >
                  <div className="hub-card-head">
                    <span className="hub-emoji">{t.emoji}</span>
                    <h2>{t.label}</h2>
                    <span className={`check ${tipo === t.id ? 'on' : ''}`}>{tipo === t.id ? '✓' : ''}</span>
                  </div>
                  <p>
                    {t.id === 'grafica'
                      ? 'Sube tu PowerPoint y se descarga tal cual, sin cambiarlo.'
                      : 'Campo, PDA, indicación, nombre, fecha e indicadores Sí / Con ayuda / No.'}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}
        {step === 1 && (
          <StepCampos
            selected={selectedCampos}
            onToggle={toggleCampo}
            catalog={catalog}
            title={`2. Diapositiva ${slideNum} · Elige un campo`}
            help="Un campo por hoja. El contenido se usa para elegir PDA; en lista de cotejo no se imprime en la diapositiva."
          />
        )}
        {step === 2 && (
          <StepContenidos
            selectedCampos={selectedCampos}
            selectedContenidos={selectedContenidos}
            onToggle={toggleContenido}
            title={`3. Diapositiva ${slideNum} · Elige un contenido`}
            help="Marca un solo contenido. En lista de cotejo este texto no aparece en la hoja; solo sirve para ubicar los PDA."
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
            campoIdx={0}
            title={`4. Diapositiva ${slideNum} · Elige hasta ${MAX_PDA} PDA`}
            help="De 1 a 3 PDA por hoja. En el siguiente paso subes tu PowerPoint o eliges indicadores."
          />
        )}
        {step === 4 && (
          <section>
            <h2>5. Diapositiva {slideNum} · {tipo === 'cotejo' ? 'Indicadores de cotejo' : 'Tu plantilla'}</h2>
            {tipo === 'grafica' ? (
              <>
                <p className="help">
                  <strong>Subir</strong> un documento nuevo, <strong>Seleccionar</strong> uno que ya hayas subido (por campo)
                  o <strong>Vacío</strong> para ir directo a Descargar con la hoja en blanco.
                </p>
                <div className="adjunto-modo-grid">
                  <label className={`hub-card evidencias ${adjuntoModo === 'subir' ? 'selected' : ''}`}>
                    <div className="hub-card-head">
                      <h2>Subir</h2>
                      <span className={`check ${adjuntoModo === 'subir' ? 'on' : ''}`}>{adjuntoModo === 'subir' ? '✓' : ''}</span>
                    </div>
                    <p>Coloca un PowerPoint o documento nuevo.</p>
                    <input
                      type="file"
                      accept=".pptx,.ppt,.pdf,.doc,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      hidden
                      onChange={(e) => {
                        setDraft((prev) => ({ ...prev, adjuntoModo: 'subir', pptVacio: false }))
                        onPickPpt(e)
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className={`hub-card evidencias ${adjuntoModo === 'seleccionar' ? 'selected' : ''}`}
                    onClick={() => setDraft((prev) => ({ ...prev, adjuntoModo: 'seleccionar', pptVacio: false }))}
                    aria-pressed={adjuntoModo === 'seleccionar'}
                  >
                    <div className="hub-card-head">
                      <h2>Seleccionar</h2>
                      <span className={`check ${adjuntoModo === 'seleccionar' ? 'on' : ''}`}>{adjuntoModo === 'seleccionar' ? '✓' : ''}</span>
                    </div>
                    <p>Elige un archivo que ya subiste, agrupado por campo.</p>
                  </button>
                  <button
                    type="button"
                    className={`hub-card evidencias ${adjuntoModo === 'vacio' ? 'selected' : ''}`}
                    onClick={irVacioYDescargar}
                    aria-pressed={adjuntoModo === 'vacio'}
                  >
                    <div className="hub-card-head">
                      <h2>Vacío</h2>
                      <span className={`check ${adjuntoModo === 'vacio' ? 'on' : ''}`}>{adjuntoModo === 'vacio' ? '✓' : ''}</span>
                    </div>
                    <p>Sin archivo: pasa a Descargar con la plantilla en blanco.</p>
                  </button>
                </div>
                {adjuntoModo === 'subir' && pptAdjunto?.name && (
                  <p className="ppt-file-chip">
                    <strong>{pptAdjunto.name}</strong>
                    <button type="button" className="btn tiny ghost" onClick={quitarPpt}>Quitar</button>
                  </p>
                )}
                {adjuntoModo === 'seleccionar' && (
                  <div className="plantillas-por-campo">
                    {gruposPlantillas.length === 0 ? (
                      <p className="empty">Aún no has subido plantillas. Usa Subir primero.</p>
                    ) : (
                      gruposPlantillas.map((g) => (
                        <div key={g.nombre} className="plantilla-campo-block">
                          <h3>{g.nombre}</h3>
                          <ul className="plantilla-file-list">
                            {g.items.map((rec) => (
                              <li key={rec.id}>
                                <button
                                  type="button"
                                  className={`plantilla-file-btn ${pptAdjunto?.name === rec.name ? 'selected' : ''}`}
                                  onClick={() => elegirPlantilla(rec)}
                                >
                                  <span className={`check ${pptAdjunto?.name === rec.name ? 'on' : ''}`}>{pptAdjunto?.name === rec.name ? '✓' : ''}</span>
                                  <span>{rec.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="help">
                  Elige <strong>Vacío</strong> para la lista en blanco (tú la llenas en PowerPoint), o marca solo los indicadores que quieras.
                </p>
                <div className="indicador-list">
                  <button
                    type="button"
                    className={`indicador-card vacio ${cotejoVacio ? 'selected' : ''}`}
                    onClick={toggleVacio}
                    aria-pressed={cotejoVacio}
                  >
                    <span className={`check ${cotejoVacio ? 'on' : ''}`}>{cotejoVacio ? '✓' : ''}</span>
                    <span>
                      <strong>Vacío</strong>
                      <small> Filas en blanco para escribir directo en PowerPoint.</small>
                    </span>
                  </button>
                  {propuestasCotejo.map((t) => {
                    const on = indicadoresSel.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`indicador-card ${on ? 'selected' : ''}`}
                        onClick={() => toggleIndicador(t)}
                        aria-pressed={on}
                      >
                        <span className={`check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                        <span>{t}</span>
                      </button>
                    )
                  })}
                  {indicadoresSel.filter((t) => !propuestasCotejo.includes(t)).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="indicador-card selected"
                      onClick={() => toggleIndicador(t)}
                    >
                      <span className="check on">✓</span>
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
                <div className="indicador-add">
                  <input
                    value={extraIndicador}
                    onChange={(e) => setExtraIndicador(e.target.value)}
                    placeholder="Escribe un indicador propio…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        agregarIndicadorManual()
                      }
                    }}
                  />
                  <button type="button" className="btn ghost" onClick={agregarIndicadorManual}>
                    Agregar
                  </button>
                </div>
              </>
            )}
          </section>
        )}
        {step === 5 && (
          <section className="generar">
            <h2>6. Descargar o agregar diapositiva</h2>
            <p className="help">
              Ya tienes {slides.length} hoja{slides.length === 1 ? '' : 's'} en el mismo PowerPoint.
              Puedes agregar evidencia gráfica o lista de cotejo.
            </p>
            <ol className="slide-deck-list">
              {slides.map((sl, i) => {
                const campo = getCampo(sl.campoId)
                return (
                  <li key={`${sl.tipo}-${sl.campoId}-${i}`}>
                    <div>
                      <strong>Diapositiva {i + 1}</strong>
                      <p>
                        {TIPO[sl.tipo]?.label || 'Evidencia gráfica'} · {campo?.nombre} · {pdaPreview(sl)}
                        {sl.pptName ? ` · ${sl.pptName}` : ''}
                        {sl.pptVacio ? ' · vacía' : ''}
                        {sl.tipo === 'cotejo' && sl.indicadores?.length ? ` · ${sl.indicadores.length} indicador(es)` : ''}
                      </p>
                    </div>
                    <button type="button" className="btn tiny ghost" onClick={() => quitarSlide(i)}>
                      Quitar
                    </button>
                  </li>
                )
              })}
            </ol>
            <div className="gen-actions">
              <button
                type="button"
                className="btn primary xl"
                disabled={busy || slides.length === 0}
                onClick={handleGenerate}
              >
                {busy ? 'Generando…' : '📽️ Descargar PowerPoint'}
              </button>
              <button type="button" className="btn ghost xl" onClick={handleAgregarDiapositiva}>
                ➕ Agregar diapositiva
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer-bar">
        <div className="summary-chips">
          <span className="chip">{slides.length} diapositiva(s)</span>
          <span className="chip accent">{pdaCount} PDA en esta hoja</span>
        </div>
        <div className="nav-actions">
          <button type="button" className="btn ghost" disabled={step === 0 && slides.length === 0} onClick={handleAtras}>
            Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn primary" disabled={!canGoNext()} onClick={handleContinuar}>
              Continuar
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={handleAgregarDiapositiva}>
              Agregar diapositiva
            </button>
          )}
        </div>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
