const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with ${response.status}`)
  }

  return response.json()
}

export const api = {
  getAirports: () => request('/api/airports'),
  getFlights: () => request('/api/flights/positions'),
  createFlight: (payload) => request('/api/flights', { method: 'POST', body: JSON.stringify(payload) }),
  seedDemo: () => request('/api/dev/seed-demo', { method: 'POST' })
}
