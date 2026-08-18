import mascot from './assets/miss-garabatos.png'

function IconNotebook() {
  return (
    <svg className="hub-icon" viewBox="0 0 72 72" aria-hidden>
      <rect x="10" y="10" width="24" height="50" rx="2" fill="#fff" stroke="#5dade2" strokeWidth="2" />
      <rect x="34" y="10" width="26" height="50" rx="2" fill="#fffef8" stroke="#5dade2" strokeWidth="2" />
      <line x1="16" y1="20" x2="28" y2="20" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="16" y1="28" x2="28" y2="28" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="16" y1="36" x2="28" y2="36" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="16" y1="44" x2="28" y2="44" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="40" y1="20" x2="54" y2="20" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="40" y1="28" x2="54" y2="28" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="40" y1="36" x2="54" y2="36" stroke="#5dade2" strokeWidth="1.6" />
      <line x1="40" y1="44" x2="54" y2="44" stroke="#5dade2" strokeWidth="1.6" />
      <path d="M34 10v50" stroke="#e74c3c" strokeWidth="2.2" />
    </svg>
  )
}

function IconFolder() {
  return (
    <svg className="hub-icon" viewBox="0 0 72 72" aria-hidden>
      <path d="M8 22h18l6 6h32v30H8z" fill="#F4D03F" stroke="#D4A017" strokeWidth="2" />
      <path d="M8 22h16l4-6h14v6" fill="#F7DC6F" stroke="#D4A017" strokeWidth="2" />
      <rect x="8" y="30" width="56" height="28" rx="2" fill="#F9E79F" stroke="#D4A017" strokeWidth="2" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg className="hub-icon" viewBox="0 0 72 72" aria-hidden>
      <line x1="12" y1="60" x2="64" y2="60" stroke="#7f8c8d" strokeWidth="2" />
      <line x1="12" y1="12" x2="12" y2="60" stroke="#7f8c8d" strokeWidth="2" />
      <rect x="20" y="38" width="10" height="22" rx="2" fill="#F7DC6F" />
      <rect x="36" y="24" width="10" height="36" rx="2" fill="#81C784" />
      <rect x="52" y="16" width="10" height="44" rx="2" fill="#64B5F6" />
    </svg>
  )
}

export default function HubHome({ onSelect }) {
  return (
    <div className="app hub-page">
      <header className="hero hub-hero">
        <div className="brand">
          <div>
            <p className="eyebrow">Miss Garabatos · Fase 2 Preescolar</p>
            <h1>¿Qué vamos a trabajar hoy?</h1>
            <p className="tagline">Elige un módulo. Evaluación guarda tu rúbrica; Planeación arma el PowerPoint para llenar.</p>
          </div>
        </div>
        <img className="hub-mascot" src={mascot} alt="Miss Garabatos" />
      </header>
      <div className="hub-grid">
        <button type="button" className="hub-card planeacion" onClick={() => onSelect('planeacion')}>
          <div className="hub-card-head">
            <IconNotebook />
            <h2>Planeación</h2>
          </div>
          <p>Elige campo, contenido y PDA; escoge la modalidad de trabajo y descarga un PowerPoint con el cuadro listo para llenar.</p>
        </button>
        <button type="button" className="hub-card evidencias" onClick={() => onSelect('evidencias')}>
          <div className="hub-card-head">
            <IconFolder />
            <h2>Evidencias</h2>
          </div>
          <p>Arma cada hoja de evidencia diapositiva por diapositiva y descarga el PowerPoint cuando termines.</p>
        </button>
        <button type="button" className="hub-card evaluacion" onClick={() => onSelect('evaluacion')}>
          <div className="hub-card-head">
            <IconChart />
            <h2>Evaluación</h2>
          </div>
          <p>Rúbrica S / E / P / RA, Excel, reportes, tablas, gráficas y alumnos en riesgo.</p>
        </button>
      </div>
    </div>
  )
}
