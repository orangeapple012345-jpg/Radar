import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const planeSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.18 9"/>
    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-1.5V20l-2 1.5V23l4-1 4 1v-1.5L13 20v-5.5z"/>
  </svg>
`)

function planeIcon(rotation = 0) {
  return L.divIcon({
    className: 'plane-icon-wrapper',
    html: `<div class="plane-icon" style="transform: rotate(${rotation}deg)"><img alt="plane" src="data:image/svg+xml;charset=UTF-8,${planeSvg}" /></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  })
}

function FitBounds({ flights }) {
  const map = useMap()
  if (flights.length > 0) {
    const points = flights.flatMap((flight) => [
      [flight.origin_lat, flight.origin_lon],
      [flight.destination_lat, flight.destination_lon]
    ])
    map.fitBounds(points, { padding: [40, 40], maxZoom: 4 })
  }
  return null
}

export default function WorldMap({ flights }) {
  return (
    <MapContainer center={[20, 0]} zoom={2} minZoom={2} worldCopyJump className="map">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds flights={flights} />
      {flights.map((flight) => (
        <div key={flight.flight_instance_id}>
          <Polyline positions={[[flight.origin_lat, flight.origin_lon], [flight.destination_lat, flight.destination_lon]]} pathOptions={{ color: '#60a5fa', dashArray: '6 10' }} />
          <Marker position={[flight.current_lat, flight.current_lon]} icon={planeIcon(flight.bearing_degrees)}>
            <Popup>
              <div className="popup">
                <strong>{flight.flight_number}</strong>
                <div>{flight.origin_iata} → {flight.destination_iata}</div>
                <div>{flight.aircraft_type}</div>
                <div>Status: {flight.phase}</div>
                <div>Altitude: {Math.round(flight.altitude_ft).toLocaleString()} ft</div>
                <div>Speed: {Math.round(flight.speed_kmh)} km/h</div>
                {flight.image_url ? <img src={flight.image_url} alt={flight.aircraft_type} className="popup-image" /> : null}
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  )
}
