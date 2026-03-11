# Air Radar World Full-Stack Starter

This is a GitHub-ready full-stack starter for the game you described:
- zoomable world map
- 30,000+ airport-ready database structure
- custom routes by 3-letter airport code
- multiple aircraft fleets
- return flights
- altitude and speed simulation
- aircraft icons instead of emojis
- hub system tables
- multiplayer-ready architecture
- route progress based on real clock time, so flights keep moving while you are away

## Stack
- Frontend: React + Vite + Leaflet
- Backend: Node.js + Express
- Database: Supabase Postgres
- Auth: Supabase Auth ready to wire in
- Hosting: Vercel for the client, Render/Railway/Vercel server functions for the API
- Code hosting: GitHub

## Important note
This repo is a strong starter, not a finished commercial game. It gives you:
- the project structure
- working zoomable map UI
- API endpoints for route creation and live flight positions
- SQL schema for airports, hubs, airlines, aircraft, and routes
- real-time flight position recalculation from schedule time

For the full production version, the next steps are:
- import a real 30,000+ airport dataset into `airports`
- connect Supabase Auth to users and airlines
- add aircraft assignment UI and hub management pages
- add WebSocket or Supabase Realtime for live multiplayer updates
- move simulation logic into a dedicated service for very large traffic volumes

## What already works
- zoomable Leaflet world map
- create a route with origin and destination IATA codes
- choose aircraft type
- set departure time and recurrence
- optional return leg generation
- simulated altitude and speed by phase of flight
- plane icon rotates toward destination
- flight position is recalculated from current UTC time

## Recommended architecture for 1000+ routes
For your target scale, keep code in GitHub and persist world state in Supabase/Postgres.

### Why this works
The backend stores schedules, not constantly updated coordinates. On load, it calculates where each aircraft should be now.
That means if a route departs at 17:43 and you log in at 19:43, the aircraft appears about 2 hours into the leg automatically.

## Setup

### 1. Create GitHub repo
Create a new empty GitHub repository and upload this project.

### 2. Create Supabase project
Create a Supabase project, then:
- open the SQL editor
- run `db/schema.sql`
- run `db/seed_aircraft_types.sql`
- import a large airports dataset into `airports`

### 3. Add environment variables
Copy `.env.example` to:
- root `.env` for local reference
- `server/.env`
- `client/.env`

Then fill in your real Supabase values.

### 4. Install dependencies
From the repo root:

```bash
npm install
```

### 5. Run locally

```bash
npm run dev
```

Client:
- http://localhost:5173

Server:
- http://localhost:4000

### 6. Deploy

#### Frontend
Deploy `client` to Vercel.

#### Backend
Deploy `server` to Render, Railway, or Vercel serverless functions after converting the Express entrypoint.

#### Database
Use Supabase Postgres.

## Airports dataset
This repo does not bundle a 30,000+ airport dataset file because those datasets vary and can be large.
Use a trusted airports CSV and import it into the `airports` table with columns matching the schema.

## Next upgrades I would build for you
- fleet page with registrations and liveries
- hub management UI
- aircraft image uploads via Supabase Storage
- multiplayer updates via websockets or Supabase Realtime
- great-circle smoothing and waypoint rendering
- arrivals and departures boards
- airline profile and login
