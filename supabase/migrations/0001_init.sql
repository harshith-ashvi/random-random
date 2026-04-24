-- Rock-Paper-Scissors Randomness Lab: initial schema.
-- Works with Supabase (Postgres 15+). Idempotent-ish via IF NOT EXISTS where possible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- simulations: one row per completed run. Summary stats only (fast queries).
-- ---------------------------------------------------------------------------
create table if not exists public.simulations (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 text not null,
  created_at                timestamptz not null default now(),

  -- required
  winner                    text not null check (winner in ('rock','paper','scissors','timeout')),
  duration_ms               integer not null check (duration_ms >= 0),
  screen_w                  integer not null check (screen_w > 0),
  screen_h                  integer not null check (screen_h > 0),

  -- config
  tick_count                integer,
  prng                      text not null check (prng in ('math-random','crypto-random','mulberry32')),
  seed                      bigint,
  movement_mode             text not null check (movement_mode in ('jitter','persistent')),
  step_px                   real not null,
  placement                 text not null check (placement in ('random','grouped')),
  counts                    jsonb not null,
  chaos_mode                boolean not null default false,
  predicted_winner          text check (predicted_winner in ('rock','paper','scissors')),
  min_population_of_winner  integer,

  -- stats
  chi_square_stat           real,
  chi_square_p              real,
  ks_stat                   real,
  ks_p                      real,
  direction_entropy_bits    real,
  draws_total               integer
);

create index if not exists simulations_client_id_created_idx
  on public.simulations (client_id, created_at desc);
create index if not exists simulations_prng_idx on public.simulations (prng);

-- ---------------------------------------------------------------------------
-- simulation_samples: heavy arrays, loaded only for detail views.
-- ---------------------------------------------------------------------------
create table if not exists public.simulation_samples (
  simulation_id       uuid primary key references public.simulations(id) on delete cascade,
  draws_histogram     integer[] not null,
  direction_histogram integer[] not null,
  heatmap             integer[] not null,
  population_series   jsonb not null
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.simulations enable row level security;
alter table public.simulation_samples enable row level security;

-- There is no auth. Everyone is anon. client_id (from localStorage) is the only identity.
-- Writes: anyone can insert if client_id is present.
-- Reads: go through the server API, which uses the service_role key (bypasses RLS) and
-- filters by the client_id the request provides. No direct anon reads of raw rows.
drop policy if exists "simulations_insert_any" on public.simulations;
create policy "simulations_insert_any"
  on public.simulations
  for insert
  to anon, authenticated
  with check (client_id is not null);

drop policy if exists "simulation_samples_insert_any" on public.simulation_samples;
create policy "simulation_samples_insert_any"
  on public.simulation_samples
  for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- leaderboard_view: anonymised aggregates, world-readable.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard_view
with (security_invoker = true)
as
select
  prng,
  winner,
  count(*)::int                                               as runs,
  (percentile_cont(0.5) within group (order by duration_ms))::int as median_duration_ms,
  min(duration_ms)::int                                       as min_duration_ms,
  max(duration_ms)::int                                       as max_duration_ms
from public.simulations
where winner <> 'timeout'
group by prng, winner;

grant select on public.leaderboard_view to anon, authenticated;
