import { useState } from 'react'
import HubHome from './HubHome'
import App from './App'
import PlaneacionApp from './PlaneacionApp'
import EvidenciasPage from './EvidenciasPage'

export default function Root() {
  const [mode, setMode] = useState('home')
  if (mode === 'home') return <HubHome onSelect={setMode} />
  if (mode === 'planeacion') return <PlaneacionApp onBack={() => setMode('home')} />
  if (mode === 'evidencias') return <EvidenciasPage onBack={() => setMode('home')} />
  return <App onBack={() => setMode('home')} />
}
