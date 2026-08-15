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
        const health = await mgHealth()
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
        const extra = migrated.length ? ` · migrado de este navegador: ${migrated.join(', ')}` : ''
        setBoot({
          ready: true,
          apiOk: true,
          message: `BD ${health.database} · ${health.teachers} maestra(s) · ${health.configs} config(s)${extra}`,
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

  const banner = (
    <p className="api-banner" style={{
      margin: 0,
      padding: '0.45rem 1rem',
      fontSize: '0.85rem',
      background: boot.apiOk ? '#d5f5e3' : '#fadbd8',
      color: '#1c2833',
      textAlign: 'center',
    }}>
      {boot.apiOk ? `Conectado a Postgres: ${boot.message}` : boot.message}
    </p>
  )

  async function recoverBrowser() {
    try {
      const all = await mgGetAll()
      const migrated = await migrateLocalStorageToDb(all.configs || {}, { force: true })
      window.alert(migrated.length
        ? `Se subió a la BD: ${migrated.join(', ')}. Recarga lista.`
        : 'Este navegador no tiene catálogo, niveles ni evidencias guardados. Prueba Microsoft Edge si ahí hiciste los ajustes.')
      window.location.reload()
    } catch (err) {
      console.error(err)
      window.alert('No se pudo subir lo del navegador. ¿La API está en :8080?')
    }
  }

  if (mode === 'home') {
    return (
      <>
        {banner}
        <HubHome onSelect={setMode} onRecoverBrowser={recoverBrowser} />
      </>
    )
  }
  if (mode === 'planeacion') {
    return (
      <>
        {banner}
        <PlaneacionApp onBack={() => setMode('home')} />
      </>
    )
  }
  if (mode === 'evidencias') {
    return (
      <>
        {banner}
        <EvidenciasPage onBack={() => setMode('home')} savedState={boot.evidencias} />
      </>
    )
  }
  return (
    <>
      {banner}
      <App onBack={() => setMode('home')} />
    </>
  )
}
