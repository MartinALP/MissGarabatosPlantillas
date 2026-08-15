import { useEffect, useState } from 'react'
import HubHome from './HubHome'
import App from './App'
import PlaneacionApp from './PlaneacionApp'
import EvidenciasPage from './EvidenciasPage'
import { mgHealth, mgGetAll, MG_KEYS, migrateLocalStorageToDb } from './api/missGarabatosApi'
import { hydrateCatalogFromApi } from './data/catalogoFase2'
import { hydrateNivelesFromApi } from './data/nivelesStore'

export default function Root() {
  const [mode, setMode] = useState('home')
  const [boot, setBoot] = useState({ ready: false, apiOk: false, message: 'Conectando con la API…', evidencias: null })

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
          message: '',
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
          message: 'No se pudo hablar con la API (¿está corriendo en :8080?). Se usa lo de este navegador.',
          evidencias,
        })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!boot.ready) {
    return (
      <div className="app" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>{boot.message}</p>
      </div>
    )
  }

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
        {boot.message}
      </p>
      {page}
    </>
  )
}
