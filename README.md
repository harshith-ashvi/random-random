# random-random

A visual lab for interrogating JavaScript PRNG quality, dressed up as a full-screen Rock-Paper-Scissors brawl. Entities move, collide, transform per RPS rules, and the run ends when one type dominates. Every run records the chi-square / KS / direction-entropy stats on the random stream that drove it, so you can compare `Math.random` against `crypto.getRandomValues` against a seeded Mulberry32 over hundreds of runs.

## Stack

- Next.js 16.2.4 (App Router) + React 19 + TypeScript
- Tailwind 4 + shadcn (radix-nova) primitives
- Recharts 3 for analytics, Vaul for the bottom drawer
- Zustand for client state, Sonner for toasts
- Supabase (Postgres + RLS) for persistence
- Bun as runtime / package manager / test runner

## Setup

1. Install deps:

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env` and fill in the three values from your Supabase project (Project Settings → API):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable / anon key>
   SUPABASE_SECRET_KEY=<service-role secret key>
   ```

   The publishable key is used in the browser for inserts only (RLS is insert-only). The secret key is server-side; it bypasses RLS for the read endpoints and never reaches the client.

3. Apply the database schema. The migration lives at `supabase/migrations/0001_init.sql` — paste it into the Supabase SQL editor and run, or pipe via `psql`:

   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
   ```

   It creates two tables (`simulations`, `simulation_samples`), insert-only RLS, and the public `leaderboard_view`.

4. (Optional) Verify the secret-key client can write end-to-end:

   ```bash
   bun run --env-file=.env scripts/smoke-supabase.ts
   ```

5. Run the dev server:

   ```bash
   bun dev
   ```

   Open <http://localhost:3000>.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | Next dev server |
| `bun run build` | Production build |
| `bun start` | Start the prod build |
| `bun run lint` | ESLint |
| `bun test` | Engine + stats unit tests |
| `bun run test:e2e` | Playwright smoke test (requires `bunx playwright install chromium` once) |

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Start / pause / resume |
| `R` | Reset |
| `A` | Toggle analytics drawer |
| `H` | Hide all floating UI |

## How it works

- **Engine** (`src/components/sim/engine/`) — framework-free TypeScript. Spatial-hash collision, deterministic when fed `mulberry32` with a fixed seed. Reusable in a Web Worker for headless batch runs.
- **PRNGs** (`prng.ts`) — `MathRandom`, `CryptoRandom`, `Mulberry32(seed)`. All three share the `next() ∈ [0,1)` interface. Every draw is bucketed into a 20-bin histogram; angles into 16 bins; positions into a 32×32 heatmap.
- **Stats** (`src/lib/stats/`) — pure chi-square, KS, and Shannon-entropy helpers, each unit-tested against a textbook example.
- **Persistence** — runs auto-save to Supabase via `POST /api/simulations`. Anonymous users are tracked by a `client_id` in localStorage; the server verifies the id before returning a row.
- **Analytics drawer** — four tabs:
  - *This Run* — live charts + post-run scorecard + kill-chain lineage of the survivor.
  - *All Runs* — aggregates across your local history (winner pie, duration histogram, χ² p-value distribution, etc.).
  - *History* — table of past runs with a detail dialog.
  - *Leaderboard* — global top-N reading from `leaderboard_view`.

## Project docs

- `docs/PLAN.md` — phased implementation plan
- `docs/CHECKLIST.md` — ordered task list, line-by-line
- `docs/USER-INPUTS.md` — things only the user can do (Supabase project, env values, migration apply)
