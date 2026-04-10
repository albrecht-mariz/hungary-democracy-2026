import { useState } from 'react'
import HungaryDemocracy from './components/hungary_democracy'
import LightVersion from './components/hungary_democracy/LightVersion'

export default function App() {
  const [light, setLight] = useState(true)

  return (
    <>
      <button
        onClick={() => setLight(l => !l)}
        title={light ? 'Switch to dark theme' : 'Switch to light theme'}
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 300,
          padding: '5px 14px', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', cursor: 'pointer',
          background: light ? '#111' : 'rgba(255,255,255,0.9)',
          color: light ? '#fff' : '#111',
          border: 'none', borderRadius: 20,
          boxShadow: '0 1px 8px rgba(0,0,0,0.22)',
          fontFamily: "'IBM Plex Sans', system-ui",
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {light ? '◑ Dark' : '◐ Light'}
      </button>
      {light ? <LightVersion /> : <HungaryDemocracy />}
    </>
  )
}
