export default function FlightsPanel({ flights }) {
  return (
    <section className="panel flights-panel">
      <div className="panel-title-row">
        <h2>Active radar</h2>
        <span className="subtle">{flights.length} tracked flights</span>
      </div>
      <div className="flight-list">
        {flights.map((flight) => (
          <article key={flight.flight_instance_id} className="flight-card">
            <div className="flight-top-row">
              <div>
                <strong>{flight.flight_number}</strong>
                <div className="muted-text">{flight.aircraft_type}</div>
              </div>
              <span className={flight.phase === 'live' ? 'badge live' : 'badge ground'}>{flight.phase}</span>
            </div>
            <div className="route-label">{flight.origin_iata} → {flight.destination_iata}</div>
            <div className="muted-text">Altitude {Math.round(flight.altitude_ft).toLocaleString()} ft · {Math.round(flight.speed_kmh)} km/h</div>
            <div className="muted-text">Progress {(flight.progress * 100).toFixed(1)}%</div>
          </article>
        ))}
      </div>
    </section>
  )
}
