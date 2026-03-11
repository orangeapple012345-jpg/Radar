import { useEffect, useMemo, useState } from 'react'
import FlightForm from './components/FlightForm'
import FlightsPanel from './components/FlightsPanel'
import WorldMap from './components/WorldMap'
import { api } from './lib/api'

export default function App() {
  const [flights, setFlights] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function refreshFlights() {
    const data = await api.getFlights()
    setFlights(data.flights)
  }

  useEffect(() => {
    refreshFlights().catch((error) => setMessage(error.message))
    const interval = setInterval(() => {
      refreshFlights().catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  async function handleCreateFlight(payload) {
    setBusy(true)
    setMessage('')
    try {
      await api.createFlight(payload)
      await refreshFlights()
      setMessage('Route created successfully.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSeedDemo() {
    setBusy(true)
    setMessage('')
    try {
      await api.seedDemo()
      await refreshFlights()
      setMessage('Demo flights added.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const liveCount = useMemo(() => flights.filter((flight) => flight.phase === 'live').length, [flights])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="hero panel">
          <h1>Air Radar World</h1>
          <p className="hero-text">
            Full-stack starter for your custom airline manager and live radar. Routes keep moving while you are offline because positions are recalculated from schedule time.
          </p>
          <div className="hero-metrics">
            <span>{flights.length} tracked</span>
            <span>{liveCount} live now</span>
            <button className="ghost-button" onClick={handleSeedDemo} disabled={busy}>Load demo</button>
          </div>
          {message ? <div className="notice">{message}</div> : null}
        </header>
        <FlightForm onSubmit={handleCreateFlight} busy={busy} />
        <FlightsPanel flights={flights} />
      </aside>
      <main className="map-panel">
        <div className="map-header">
          <div>
            <strong>Zoomable world radar</strong>
            <div className="muted-text">Scroll, pan, and click aircraft to inspect each live leg.</div>
          </div>
        </div>
        <WorldMap flights={flights} />
      </main>
    </div>
  )
}
