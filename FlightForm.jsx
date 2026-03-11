import { useState } from 'react'

const initialState = {
  flightNumber: 'MY101',
  originIata: 'LHR',
  destinationIata: 'JFK',
  aircraftType: 'A350-900',
  cruiseSpeedKmh: 905,
  imageUrl: '',
  departureTimeUtc: '17:43',
  durationMinutes: '',
  recurrenceType: 'daily',
  daysOfWeek: [1, 2, 3, 4, 5],
  startDate: new Date().toISOString().slice(0, 10),
  enableReturnLeg: true,
  turnaroundMinutes: 90,
  initialAltitudeFt: 0
}

export default function FlightForm({ onSubmit, busy }) {
  const [form, setForm] = useState(initialState)

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleDay(day) {
    const exists = form.daysOfWeek.includes(day)
    update(
      'daysOfWeek',
      exists ? form.daysOfWeek.filter((item) => item !== day) : [...form.daysOfWeek, day].sort()
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    await onSubmit({
      ...form,
      cruiseSpeedKmh: Number(form.cruiseSpeedKmh),
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      turnaroundMinutes: Number(form.turnaroundMinutes),
      initialAltitudeFt: Number(form.initialAltitudeFt)
    })
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <div className="panel-title-row">
        <h2>Create route</h2>
        <span className="subtle">Zoomable live world map</span>
      </div>

      <div className="grid two">
        <label>
          Flight number
          <input value={form.flightNumber} onChange={(e) => update('flightNumber', e.target.value.toUpperCase())} />
        </label>
        <label>
          Aircraft type
          <input value={form.aircraftType} onChange={(e) => update('aircraftType', e.target.value)} />
        </label>
      </div>

      <div className="grid two">
        <label>
          Origin IATA
          <input maxLength="3" value={form.originIata} onChange={(e) => update('originIata', e.target.value.toUpperCase())} />
        </label>
        <label>
          Destination IATA
          <input maxLength="3" value={form.destinationIata} onChange={(e) => update('destinationIata', e.target.value.toUpperCase())} />
        </label>
      </div>

      <div className="grid two">
        <label>
          Departure time (UTC)
          <input type="time" value={form.departureTimeUtc} onChange={(e) => update('departureTimeUtc', e.target.value)} />
        </label>
        <label>
          Start date
          <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
        </label>
      </div>

      <div className="grid two">
        <label>
          Cruise speed km/h
          <input type="number" value={form.cruiseSpeedKmh} onChange={(e) => update('cruiseSpeedKmh', e.target.value)} />
        </label>
        <label>
          Duration override (minutes)
          <input type="number" value={form.durationMinutes} onChange={(e) => update('durationMinutes', e.target.value)} placeholder="Optional" />
        </label>
      </div>

      <div className="grid two">
        <label>
          Image URL
          <input value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} placeholder="https://...plane.jpg" />
        </label>
        <label>
          Turnaround minutes
          <input type="number" value={form.turnaroundMinutes} onChange={(e) => update('turnaroundMinutes', e.target.value)} />
        </label>
      </div>

      <div className="grid two">
        <label>
          Recurrence
          <select value={form.recurrenceType} onChange={(e) => update('recurrenceType', e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Specific days</option>
            <option value="once">One time</option>
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={form.enableReturnLeg} onChange={(e) => update('enableReturnLeg', e.target.checked)} />
          Add return leg automatically
        </label>
      </div>

      <div>
        <div className="label-heading">Days of week</div>
        <div className="day-pills">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
            <button
              type="button"
              key={label}
              className={form.daysOfWeek.includes(index) ? 'pill active' : 'pill'}
              onClick={() => toggleDay(index)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button disabled={busy} type="submit" className="primary-button">
        {busy ? 'Saving route...' : 'Save route'}
      </button>
    </form>
  )
}
