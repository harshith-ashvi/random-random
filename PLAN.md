# PLAN — Rock-Paper-Scissors Randomness Lab

See `PRD.md` for *what & why*. This doc covers *how & in what order*.

## Stack

- **Next.js 16.2.4** (App Router) + **React 19**. Not the vanilla Next.js — respect `node_modules/next/dist/docs/` when an API looks unfamiliar.
- **Tailwind 4** with OKLCH tokens already set up in `src/app/globals.css`, including `--chart-1..5` used by Recharts.
- **shadcn/ui** (radix-nova style). `Button` already present; more to add.
- **Recharts** for charts.
- **@supabase/supabase-js** + **@supabase/ssr** for DB + optional auth.
- **Zustand** for the run-config / runtime store (light, no provider boilerplate).
- **Sonner** for toasts.
- Package manager: **bun**.

## Auth model

- **Login is optional.** Anyone can open the app, run simulations, save results, and view analytics/leaderboard without an account.
- Every browser gets a `client_id` (UUID) in `localStorage` on first visit. That id is attached to every saved run.
- Sign-in (magic link) is a purely additive feature: on first login, any rows with the current `client_id` and `user_id IS NULL` are reclaimed by attaching `user_id`. Everything else continues to work.

## Required per-run record

Every completed simulation MUST persist these four at minimum:

1. **`winner`** — which type ended the run (`rock` \| `paper` \| `scissors` \| `timeout`).
2. **`duration_ms`** — wall-clock time from start to end.
3. **`screen_w`, `screen_h`** — viewport dimensions captured at run start.
4. **`client_id`** — so anonymous runs are attributable to a browser.

These are non-nullable (except `winner` can be `timeout`). Anything else is a nice-to-have.

## Data model

### Table `simulations` (one row per run — summary only)

| column | type | notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid null | fk → `auth.users`; null for anon runs |
| `client_id` | text not null | localStorage UUID |
| `created_at` | timestamptz default now() | |
| `winner` | text not null | `rock` \| `paper` \| `scissors` \| `timeout` |
| `duration_ms` | int not null | wall clock — **required** |
| `screen_w` | int not null | viewport width — **required** |
| `screen_h` | int not null | viewport height — **required** |
| `tick_count` | int | |
| `prng` | text | `math-random` \| `crypto-random` \| `mulberry32` |
| `seed` | bigint null | mulberry32 only |
| `movement_mode` | text | `jitter` \| `persistent` |
| `step_px` | real | |
| `placement` | text | `random` \| `grouped` |
| `counts` | jsonb | `{rock, paper, scissors}` |
| `chaos_mode` | bool | |
| `predicted_winner` | text null | |
| `min_population_of_winner` | int | "biggest comeback" metric |
| `chi_square_stat`, `chi_square_p` | real | |
| `ks_stat`, `ks_p` | real | |
| `direction_entropy_bits` | real | |
| `draws_total` | int | sample count |

### Table `simulation_samples` (one row per run — heavy arrays)

| column | type | notes |
| --- | --- | --- |
| `simulation_id` | uuid pk fk | |
| `draws_histogram` | int[20] | |
| `direction_histogram` | int[16] | |
| `heatmap` | int[1024] | 32×32 flattened |
| `population_series` | jsonb | `[{t, rock, paper, scissors}, ...]` at ~5 Hz |

### RLS

- `simulations`: public insert (no auth required); select own rows by `auth.uid() = user_id` OR `client_id` header match; `leaderboard_view` exposes only anonymized aggregates and is world-readable.
- `simulation_samples`: mirrors parent.

### Migration

- Single file: `supabase/migrations/0001_init.sql` with tables, RLS, and `leaderboard_view`.

## Critical files

**New:**

- `src/app/page.tsx` — canvas + floating UI (replaces template).
- `src/components/sim/SimulationCanvas.tsx` — canvas + RAF loop (`'use client'`).
- `src/components/sim/engine/{entity,world,collision,prng,stats,step}.ts` — pure TS, framework-free (reusable in worker).
- `src/components/sim/workers/batch-runner.worker.ts` — headless auto-run.
- `src/components/sim/FloatingControls.tsx`, `FloatingAnalytics.tsx`, `FloatingAbout.tsx`, `FloatingToggle.tsx`.
- `src/components/sim/AnalyticsDrawer.tsx` + `tabs/ThisRun.tsx`, `History.tsx`, `Leaderboard.tsx`.
- `src/components/sim/charts/{PopulationArea,Histogram,Heatmap,Scorecard}.tsx`.
- `src/lib/supabase/{client,server,types}.ts`.
- `src/lib/stats/{chi-square,ks,entropy}.ts`.
- `src/lib/store.ts` — Zustand store.
- `src/app/api/simulations/route.ts` — `POST` save, `GET` list.
- `src/app/api/simulations/[id]/route.ts` — `GET` detail with samples.
- `src/app/api/simulations/batch/route.ts` — batch insert for auto-run.
- `src/app/api/leaderboard/route.ts` — reads `leaderboard_view`.
- `supabase/migrations/0001_init.sql`.
- `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Modified:**

- `src/app/layout.tsx` — add `<Toaster />`, `ThemeProvider`.
- `package.json` — new deps (bun).

**Reuse:**

- `src/lib/utils.ts` (`cn`).
- `globals.css` tokens (chart palette, radius scale, dark mode).
- `src/components/ui/button.tsx`.

## Next.js 16 / React 19 conventions

- Canvas-driven UI is client. Use `'use client'` at the top of `SimulationCanvas.tsx` and the floating components; keep `layout.tsx` server.
- Route Handlers at `src/app/api/**/route.ts`. Import `NextRequest` from `next/server`. For dynamic segments use the generated `RouteContext<'/path/[id]'>` helper; `ctx.params` is a `Promise` — `await` it.
- Server Supabase client via `@supabase/ssr` (cookie-based). Browser client in client components only.
- Tailwind 4 — no `tailwind.config.*`. Use existing CSS variables.

## Phases

### Phase 0 — Foundations (~0.5 day)

- [ ] `bun add @supabase/supabase-js @supabase/ssr recharts zustand sonner`.
- [ ] Add shadcn primitives: `drawer sheet slider tabs select switch input tooltip sonner card badge label separator skeleton dialog`.
- [ ] Supabase project created; `0001_init.sql` applied.
- [ ] `.env.example` and `.env.local` wired.
- [ ] Supabase browser + server clients.
- [ ] `<Toaster />` and `ThemeProvider` in `layout.tsx`.
- [ ] Generate + persist `client_id` in `localStorage` on first load.

### Phase 1 — Engine (~1 day)

- [ ] `PRNG` interface + three impls (`math-random`, `crypto-random`, `mulberry32`). `next(): number` and `nextAngle(): number`.
- [ ] `Entity { id, type, x, y, angle, flashUntil }`.
- [ ] `World` with spatial hash (16×16 cells) for O(n) collision at n≤60.
- [ ] `step(world, dt)` — advance, reflect off walls, resolve pairwise collisions, apply RPS rule (or chaos rule when enabled), record stats.
- [ ] `Stats` accumulates `drawsHist[20]`, `dirHist[16]`, `heatmap[1024]`, `populationSeries`, `minPopulationOfWinner`.
- [ ] On run end, engine emits a `RunResult` that **always includes** `winner`, `durationMs`, `screenW`, `screenH`.
- [ ] Unit tests (`bun test`): determinism with seeded mulberry32, RPS rule, bounce, stats accumulation, `RunResult` shape.

### Phase 2 — Canvas + UI shell (~1 day)

- [ ] `SimulationCanvas` — mounts, resizes to viewport, runs RAF, renders rock/paper/scissors glyphs (emoji or inline SVG), transform flash animation. Capture `window.innerWidth`/`innerHeight` at run start into the store.
- [ ] `FloatingControls` — counts (slider 10–20), placement, movement mode, step size, speed, PRNG, seed (enabled for mulberry32), chaos toggle, start/pause/reset.
- [ ] `FloatingAnalytics`, `FloatingAbout`, `FloatingToggle` (hide-all).
- [ ] Zustand store — run config + runtime state.
- [ ] Keyboard shortcuts: `space` pause, `r` reset, `a` analytics, `h` hide UI.

### Phase 3 — Stats + analytics drawer (~1 day)

- [ ] `chi-square.ts`, `ks.ts`, `entropy.ts` with unit tests against textbook examples.
- [ ] `AnalyticsDrawer` with `This Run` / `History` / `Leaderboard` tabs.
- [ ] Recharts components: `PopulationArea` (stacked area), `Histogram` (bar), `Heatmap` (CSS grid — simpler than Recharts heatmap), `Scorecard` (stat tiles with tooltips).
- [ ] Tooltip copy for chi-square, KS, entropy.
- [ ] Run-end toast prominently shows **winner + duration**.

### Phase 4 — Persistence (~0.5 day)

- [ ] On run end, POST summary + samples to `/api/simulations`. Runs save for anon users too — no auth gate.
- [ ] Server validates presence of `winner`, `duration_ms`, `screen_w`, `screen_h`, `client_id`.
- [ ] `History` tab hits `GET /api/simulations` (filtered by `user_id` if logged in, else `client_id`).
- [ ] `Leaderboard` tab hits `GET /api/leaderboard`.
- [ ] Run-detail dialog fetches `GET /api/simulations/[id]`.

### Phase 5 — Optional auth (~0.5 day)

- [ ] Magic-link sign-in — clearly optional, surfaced in About sheet only.
- [ ] On login, merge rows where `client_id` matches current localStorage id and `user_id IS NULL`.
- [ ] Server-side soft cap: 1000 runs per `user_id` OR per `client_id` (whichever applies).

### Phase 6 — Auto-run + workers (~1 day)

- [ ] `batch-runner.worker.ts` imports engine; runs N sims headless; streams progress.
- [ ] Progress UI + cancel.
- [ ] `POST /api/simulations/batch` endpoint for bulk insert.

### Phase 7 — Fun extras (~0.5 day)

- [ ] Winner prediction UI before start; persisted per run.
- [ ] Chaos mode in collision rule.
- [ ] Motion trails (alpha fade on clear).
- [ ] WebAudio tick + fanfare; mute switch.
- [ ] PNG export — canvas + stats panel composited onto an offscreen canvas.
- [ ] Kill-chain view — engine records `transformedBy` on each entity; render as a tree.

### Phase 8 — Polish (~0.5 day)

- [ ] Empty/loading/error states; a11y on floating buttons; aria-labels and focus rings.
- [ ] README update with env setup and a local Supabase note.
- [ ] Lighthouse pass + visual QA on retina.

Total: ~6–7 working days.

## Verification

**Manual:**

1. `bun dev` → `/`. Canvas fills the viewport. 30 entities move. Collisions transform correctly.
2. Complete a run **without signing in** → toast shows winner + duration; row appears in `simulations` with `user_id NULL`, `client_id` set, and `duration_ms` / `screen_w` / `screen_h` populated.
3. Open Analytics → live population chart updates; post-run chi-square/KS/entropy shown.
4. Choose `mulberry32` with seed `42` → run twice → identical duration and winner.
5. Toggle Hide UI → all floating buttons vanish; corner peek-button restores them.
6. Auto-run 100× with `math-random`, then 100× with `crypto-random` → leaderboard shows per-PRNG aggregates (no login needed).
7. Optionally sign in → prior anon runs from the same browser attach to the new account.
8. Export PNG result card → looks correct on retina.

**Automated:**

- `bun test` for engine (determinism, RPS rule, bounce, stats, `RunResult` has winner/duration/screen) and stats modules (chi-square, KS, entropy).
- Playwright smoke: load `/` as a fresh anon user, run seeded mulberry32, assert a row appears in History with the expected four required fields.

## Tracking

Each phase above has a checkbox list. Work top-to-bottom; don't open a later phase while an earlier one has open items.
