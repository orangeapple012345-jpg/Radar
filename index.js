import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import pg from 'pg'

dotenv.config()

const app = express()
const port = process.env.PORT || 4000
const databaseUrl = process.env.DATABASE_URL

const pool = databaseUrl
  ? new pg.Pool({ connectionString: databaseUrl, ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false } })
  : null

app.use(cors())
app.use(express.json())

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function interpolate(lat1, lon1, lat2, lon2, fraction) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const φ1 = toRad(lat1)
  const λ1 = toRad(lon1)
  const φ2 = toRad(lat2)
  const λ2 = toRad(lon2)
  const delta = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2))
  if (delta === 0) return { lat: lat1, lon: lon1 }
  const A = Math.sin((1 - fraction) * delta) / Math.sin(delta)
  const B = Math.sin(fraction * delta) / Math.sin(delta)
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)
  return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: toDeg(Math.atan2(y, x)) }
}

function bearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const toDeg = (rad) => (rad * 180) / Math.PI
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function altitudeForProgress(progress) {
  if (progress <= 0.08) return (progress / 0.08) * 35000
  if (progress >= 0.88) return ((1 - progress) / 0.12) * 35000
  return 35000
}

function speedForProgress(cruiseSpeed, progress) {
  if (progress <= 0.06) return Math.max(220, cruiseSpeed * (0.4 + progress * 5))
  if (progress >= 0.9) return Math.max(240, cruiseSpeed * (1 - (progress - 0.9) * 4))
  return cruiseSpeed
}

function nextOccurrence(startDate, departureTimeUtc, recurrenceType, daysOfWeek, now) {
  const base = new Date(`${startDate}T${departureTimeUtc}:00.000Z`)
  if (recurrenceType === 'once') return base
  for (let offset = -370; offset <= 370; offset += 1) {
    const candidate = new Date(base)
    candidate.setUTCDate(base.getUTCDate() + offset)
    const day = candidate.getUTCDay()
    const match = recurrenceType === 'daily'
      || (recurrenceType === 'weekdays' && day >= 1 && day <= 5)
      || (recurrenceType === 'weekly' && daysOfWeek.includes(day))
    if (match && candidate <= now) {
      const tomorrow = new Date(candidate)
      tomorrow.setUTCDate(candidate.getUTCDate() + 1)
      return candidate
    }
  }
  return base
}

function computePosition(row, now = new Date()) {
  const departure = nextOccurrence(row.start_date, row.departure_time_utc.slice(0,5), row.recurrence_type, row.days_of_week || [], now)
  const durationMs = row.duration_minutes * 60 * 1000
  const arrival = new Date(departure.getTime() + durationMs)
  const live = now >= departure && now <= arrival
  const progress = live ? (now - departure) / durationMs : 0
  const point = live
    ? interpolate(row.origin_lat, row.origin_lon, row.destination_lat, row.destination_lon, progress)
    : { lat: row.origin_lat, lon: row.origin_lon }
  return {
    flight_instance_id: row.id,
    flight_number: row.flight_number,
    aircraft_type: row.aircraft_type,
    image_url: row.image_url,
    origin_iata: row.origin_iata,
    destination_iata: row.destination_iata,
    origin_lat: row.origin_lat,
    origin_lon: row.origin_lon,
    destination_lat: row.destination_lat,
    destination_lon: row.destination_lon,
    phase: live ? 'live' : 'ground',
    progress,
    current_lat: point.lat,
    current_lon: point.lon,
    altitude_ft: altitudeForProgress(progress),
    speed_kmh: speedForProgress(row.cruise_speed_kmh, progress),
    bearing_degrees: bearingDegrees(point.lat, point.lon, row.destination_lat, row.destination_lon)
  }
}

async function query(text, params = []) {
  if (!pool) throw new Error('DATABASE_URL is not configured. Add Supabase/Postgres connection details first.')
  return pool.query(text, params)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() })
})

app.get('/api/airports', async (_req, res) => {
  try {
    const { rows } = await query('select id, iata_code, icao_code, name, city, country, latitude_deg, longitude_deg from airports order by iata_code nulls last limit 50000')
    res.json({ airports: rows })
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.get('/api/flights/positions', async (_req, res) => {
  try {
    const { rows } = await query(`
      select
        r.id,
        r.flight_number,
        r.aircraft_type,
        r.image_url,
        r.cruise_speed_kmh,
        r.duration_minutes,
        r.start_date,
        r.departure_time_utc,
        r.recurrence_type,
        r.days_of_week,
        oa.iata_code as origin_iata,
        da.iata_code as destination_iata,
        oa.latitude_deg as origin_lat,
        oa.longitude_deg as origin_lon,
        da.latitude_deg as destination_lat,
        da.longitude_deg as destination_lon
      from routes r
      join airports oa on oa.id = r.origin_airport_id
      join airports da on da.id = r.destination_airport_id
      where r.is_active = true
      order by r.created_at desc
      limit 5000
    `)
    const flights = rows.map((row) => computePosition(row, new Date()))
    res.json({ flights })
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.post('/api/flights', async (req, res) => {
  try {
    const payload = req.body
    const airportLookup = await query(
      'select id, iata_code, latitude_deg, longitude_deg from airports where iata_code = any($1::text[])',
      [[payload.originIata, payload.destinationIata]]
    )
    const origin = airportLookup.rows.find((row) => row.iata_code === payload.originIata)
    const destination = airportLookup.rows.find((row) => row.iata_code === payload.destinationIata)
    if (!origin || !destination) {
      return res.status(400).send('Origin or destination airport code was not found in the airports table.')
    }

    const distanceKm = haversineKm(origin.latitude_deg, origin.longitude_deg, destination.latitude_deg, destination.longitude_deg)
    const durationMinutes = payload.durationMinutes || Math.max(25, Math.round((distanceKm / payload.cruiseSpeedKmh) * 60))

    const insertRoute = await query(`
      insert into routes (
        owner_user_id, hub_airport_id, origin_airport_id, destination_airport_id, flight_number,
        aircraft_type, image_url, cruise_speed_kmh, duration_minutes, departure_time_utc,
        recurrence_type, days_of_week, start_date, enable_return_leg, turnaround_minutes, is_active
      ) values (
        null, null, $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, true
      ) returning id
    `, [
      origin.id,
      destination.id,
      payload.flightNumber,
      payload.aircraftType,
      payload.imageUrl || null,
      payload.cruiseSpeedKmh,
      durationMinutes,
      `${payload.departureTimeUtc}:00`,
      payload.recurrenceType,
      payload.daysOfWeek || [],
      payload.startDate,
      payload.enableReturnLeg,
      payload.turnaroundMinutes
    ])

    if (payload.enableReturnLeg) {
      const outboundDeparture = new Date(`${payload.startDate}T${payload.departureTimeUtc}:00.000Z`)
      const returnDeparture = new Date(outboundDeparture.getTime() + (durationMinutes + Number(payload.turnaroundMinutes || 90)) * 60000)
      const hh = String(returnDeparture.getUTCHours()).padStart(2, '0')
      const mm = String(returnDeparture.getUTCMinutes()).padStart(2, '0')
      await query(`
        insert into routes (
          owner_user_id, hub_airport_id, origin_airport_id, destination_airport_id, flight_number,
          aircraft_type, image_url, cruise_speed_kmh, duration_minutes, departure_time_utc,
          recurrence_type, days_of_week, start_date, enable_return_leg, turnaround_minutes, is_active
        ) values (
          null, null, $1, $2, $3,
          $4, $5, $6, $7, $8,
          $9, $10, $11, false, $12, true
        )
      `, [
        destination.id,
        origin.id,
        `${payload.flightNumber}R`,
        payload.aircraftType,
        payload.imageUrl || null,
        payload.cruiseSpeedKmh,
        durationMinutes,
        `${hh}:${mm}:00`,
        payload.recurrenceType,
        payload.daysOfWeek || [],
        payload.startDate,
        payload.turnaroundMinutes
      ])
    }

    res.json({ ok: true, routeId: insertRoute.rows[0].id })
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.post('/api/dev/seed-demo', async (_req, res) => {
  try {
    const demoRoutes = [
      { flightNumber: 'RAD101', originIata: 'LHR', destinationIata: 'JFK', aircraftType: 'A350-900', cruiseSpeedKmh: 905, imageUrl: '', departureTimeUtc: '17:43', durationMinutes: 430, recurrenceType: 'daily', daysOfWeek: [1,2,3,4,5], startDate: new Date().toISOString().slice(0,10), enableReturnLeg: true, turnaroundMinutes: 90 },
      { flightNumber: 'RAD202', originIata: 'DXB', destinationIata: 'SYD', aircraftType: 'B777-300ER', cruiseSpeedKmh: 892, imageUrl: '', departureTimeUtc: '08:15', durationMinutes: 840, recurrenceType: 'daily', daysOfWeek: [0,1,2,3,4,5,6], startDate: new Date().toISOString().slice(0,10), enableReturnLeg: false, turnaroundMinutes: 120 },
      { flightNumber: 'RAD303', originIata: 'SIN', destinationIata: 'HND', aircraftType: 'B787-10', cruiseSpeedKmh: 903, imageUrl: '', departureTimeUtc: '12:05', durationMinutes: 425, recurrenceType: 'weekdays', daysOfWeek: [1,2,3,4,5], startDate: new Date().toISOString().slice(0,10), enableReturnLeg: true, turnaroundMinutes: 75 }
    ]

    for (const route of demoRoutes) {
      const mockReq = { body: route }
      const mockRes = { status() { return this }, send(message) { throw new Error(message) }, json() { return this } }
      await new Promise((resolve, reject) => {
        app._router.handle(mockReq, mockRes, resolve)
        reject
      }).catch(() => {})
    }

    res.json({ ok: true })
  } catch (error) {
    res.status(500).send(error.message)
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
