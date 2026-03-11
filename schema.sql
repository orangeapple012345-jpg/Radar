create extension if not exists pgcrypto;

create table if not exists airports (
  id uuid primary key default gen_random_uuid(),
  iata_code text unique,
  icao_code text unique,
  name text not null,
  city text,
  country text,
  latitude_deg double precision not null,
  longitude_deg double precision not null,
  timezone_name text,
  created_at timestamptz not null default now()
);

create table if not exists users_profile (
  id uuid primary key,
  username text unique,
  airline_name text,
  created_at timestamptz not null default now()
);

create table if not exists airlines (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users_profile(id) on delete cascade,
  name text not null,
  callsign text,
  created_at timestamptz not null default now()
);

create table if not exists hubs (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid references airlines(id) on delete cascade,
  airport_id uuid references airports(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists aircraft_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  manufacturer text,
  name text not null,
  default_cruise_speed_kmh integer not null,
  service_ceiling_ft integer not null,
  turn_rate_deg_per_sec numeric(6,2) default 3.00,
  created_at timestamptz not null default now()
);

create table if not exists aircraft (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid references airlines(id) on delete cascade,
  aircraft_type_id uuid references aircraft_types(id),
  registration text unique,
  display_name text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users_profile(id) on delete set null,
  hub_airport_id uuid references airports(id) on delete set null,
  origin_airport_id uuid not null references airports(id),
  destination_airport_id uuid not null references airports(id),
  assigned_aircraft_id uuid references aircraft(id) on delete set null,
  flight_number text not null,
  aircraft_type text not null,
  image_url text,
  cruise_speed_kmh integer not null,
  duration_minutes integer not null,
  departure_time_utc time not null,
  recurrence_type text not null check (recurrence_type in ('daily','weekdays','weekly','once')),
  days_of_week integer[] not null default '{}',
  start_date date not null,
  enable_return_leg boolean not null default false,
  turnaround_minutes integer not null default 90,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists routes_active_idx on routes (is_active, created_at desc);
create index if not exists airports_iata_idx on airports (iata_code);

alter table airports enable row level security;
alter table routes enable row level security;
alter table airlines enable row level security;
alter table hubs enable row level security;
alter table aircraft enable row level security;
alter table users_profile enable row level security;

create policy if not exists "public read airports" on airports for select using (true);
create policy if not exists "public read routes" on routes for select using (true);
