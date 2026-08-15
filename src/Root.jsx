import { useEffect, useState } from 'react'
import HubHome from './HubHome'
import App from './App'
import PlaneacionApp from './PlaneacionApp'
import EvidenciasPage from './EvidenciasPage'
import mascot from './assets/miss-garabatos.png'
import { mgHealth, mgGetAll, MG_KEYS, migrateLocalStorageToDb } from './api/missGarabatosApi'
import { hydrateCatalogFromApi } from './data/catalogoFase2'
import { hydrateNivelesFromApi } from './data/nivelesStore'

function BootSplash() {
  return (
    <div className="boot-splash" role="status" aria-live="polite">
      <div className="boot-logo-wrap">
        <span className="boot-ring" aria-hidden />
        <img className="boot-logo" src={mascot} alt="" />
      </div>
      <p className="boot-title">Miss Garabatos</p>
      <p className="boot-msg">Preparando el salón…</p>
      <span className="boot-dots" aria-hidden>
        <i /><i /><i />
      </span>
    </div>
  )
}

export default function Root() {
  const [mode, setMode] = useState('home')
  const [boot, setBoot] = useState({ ready: false, apiOk: false, evidencias: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await mgHealth()
        let all = await mgGetAll()
        let cfg = all.configs || {}
        const migrated = await migrateLocalStorageToDb(cfg)
        if (migrated.length) {
          all = await mgGetAll()
          cfg = all.configs || {}
        }
        hydrateCatalogFromApi(cfg[MG_KEYS.catalog])
        hydrateNivelesFromApi(cfg[MG_KEYS.niveles])
        if (cancelled) return
        setBoot({
          ready: true,
          apiOk: true,
          evidencias: cfg[MG_KEYS.evidencias] || null,
        })
      } catch (err) {
        console.error(err)
        try {
          const rawCat = localStorage.getItem('missgarabatos.catalogoFase2.v1')
          if (rawCat) hydrateCatalogFromApi(JSON.parse(rawCat))
          const rawNiv = localStorage.getItem('missgarabatos.nivelesDesempeno.v1')
          if (rawNiv) hydrateNivelesFromApi(JSON.parse(rawNiv))
        } catch { /* ignore */ }
        if (cancelled) return
        let evidencias = null
        try {
          const rawEv = localStorage.getItem('mg_evidencias_borrador_v1')
          if (rawEv) evidencias = JSON.parse(rawEv)
        } catch { /* ignore */ }
        setBoot({
          ready: true,
          apiOk: false,
          evidencias,
        })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!boot.ready) return <BootSplash />

  const page =
    mode === 'home' ? (
      <HubHome onSelect={setMode} />
    ) : mode === 'planeacion' ? (
      <PlaneacionApp onBack={() => setMode('home')} />
    ) : mode === 'evidencias' ? (
      <EvidenciasPage onBack={() => setMode('home')} savedState={boot.evidencias} />
    ) : (
      <App onBack={() => setMode('home')} />
    )

  if (boot.apiOk) return page

  return (
    <>
      <p className="api-banner" style={{
        margin: 0,
        padding: '0.45rem 1rem',
        fontSize: '0.85rem',
        background: '#fadbd8',
        color: '#1c2833',
        textAlign: 'center',
      }}>
        No pude conectar con el servidor. Puedes seguir; los cambios se quedan en este navegador.
      </p>
      {page}
    </>
  )
}
