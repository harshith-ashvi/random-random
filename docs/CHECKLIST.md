# Implementation Checklist

Ordered, end-to-end. Do tasks top-to-bottom. Check off each item as it lands (`- [x]`). A section is "done" only when every box inside it is checked.

Legend: 🧍 = needs the user (you) to do something — listed in `docs/USER-INPUTS.md`.

---

## 0 — Foundations

### 0.1 Dependencies

- [x] `bun add @supabase/supabase-js @supabase/ssr recharts zustand sonner`
- [x] `bunx shadcn@latest add drawer sheet slider tabs select switch input tooltip sonner card badge label separator skeleton dialog`

### 0.2 Environment & config

- [x] 🧍 Supabase project created; URL + publishable key + secret key provided
- [x] `.env.example` committed with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- [x] `.env` populated locally (not committed)
- [x] `.gitignore` already ignores `.env*`

### 0.3 Supabase clients

- [x] `src/lib/supabase/client.ts` — browser client (publishable key, inserts only)
- [x] `src/lib/supabase/server.ts` — server client (secret key, bypasses RLS)
- [x] `src/lib/supabase/types.ts` — hand-written DB types (no `user_id`)

### 0.4 DB schema

- [x] `supabase/migrations/0001_init.sql` authored (tables, RLS insert-only, `leaderboard_view`)
- [x] 🧍 Migration applied to the Supabase project
- [x] Smoke-test: insert a dummy `simulations` row via the service-role client (`bun run --env-file=.env scripts/smoke-supabase.ts`)

### 0.5 Layout additions

- [x] `src/app/layout.tsx` — add `<Toaster />` + `<TooltipProvider>`
- [x] `src/app/layout.tsx` — add minimal `ThemeProvider` (system-preference only for v1)
- [x] `src/lib/client-id.ts` — generate + read `client_id` in localStorage

---

## 1 — Simulation engine (framework-free, reusable in worker)

Location: `src/components/sim/engine/`.

- [ ] `prng.ts` — `PRNG` interface + `MathRandom`, `CryptoRandom`, `Mulberry32(seed)` impls. Both `next()` → [0,1) and `nextAngle()` → [0, 2π)
- [ ] `entity.ts` — `Entity { id, type, x, y, angle, flashUntil }`
- [ ] `world.ts` — spatial hash (16×16 cells), add/remove, neighbour query
- [ ] `collision.ts` — circle-overlap test, RPS winner lookup, chaos-mode branch
- [ ] `stats.ts` — accumulators for `drawsHist[20]`, `dirHist[16]`, `heatmap[1024]`, `populationSeries` (5 Hz sampler), `minPopulationOfWinner`
- [ ] `step.ts` — `step(world, dt)`: advance, reflect walls, resolve collisions, stats
- [ ] `run.ts` — orchestrator; returns `RunResult` that **must** contain `winner`, `durationMs`, `screenW`, `screenH`
- [ ] `index.ts` — barrel export

### Engine tests (`bun test`)

- [ ] Determinism: same `mulberry32` seed ⇒ identical tick-by-tick state
- [ ] RPS rule: rock+paper ⇒ both become paper
- [ ] Same-type touch: no change
- [ ] Wall bounce: angle reflected correctly on all four walls
- [ ] Stats: histograms sum to expected totals, heatmap sums to `tickCount × entityCount`
- [ ] `RunResult` always has the four required fields

---

## 2 — Canvas + UI shell

- [ ] `src/lib/store.ts` — Zustand store (config, runtime, runStatus)
- [ ] `src/components/sim/SimulationCanvas.tsx` — canvas, resize observer, RAF loop, emoji-glyph rendering (🪨 📄 ✂️), flash animation. Captures `window.innerWidth`/`innerHeight` at run start.
- [ ] `src/components/sim/FloatingControls.tsx` — counts (10–20), placement, movement mode, step size, speed, PRNG select, seed input (mulberry32 only), chaos toggle, start/pause/reset, predicted-winner picker
- [ ] `src/components/sim/FloatingAnalytics.tsx` — opens bottom drawer
- [ ] `src/components/sim/FloatingAbout.tsx` — sheet with project + stat-test explainer
- [ ] `src/components/sim/FloatingToggle.tsx` — master hide-all; corner peek-button restores
- [ ] `src/app/page.tsx` — replace template with canvas + floating UI
- [ ] Keyboard shortcuts: `space` pause, `r` reset, `a` analytics, `h` hide UI

---

## 3 — Stats + analytics drawer

- [ ] `src/lib/stats/chi-square.ts` + tests (textbook example)
- [ ] `src/lib/stats/ks.ts` + tests (known distribution pair)
- [ ] `src/lib/stats/entropy.ts` + tests (uniform ⇒ log2(k))
- [ ] `src/components/sim/charts/PopulationArea.tsx` (Recharts stacked area)
- [ ] `src/components/sim/charts/Histogram.tsx` (Recharts bar)
- [ ] `src/components/sim/charts/Heatmap.tsx` (CSS grid using `--chart-*` tokens)
- [ ] `src/components/sim/charts/Scorecard.tsx` (stat tiles + shadcn tooltip copy)
- [ ] `src/components/sim/AnalyticsDrawer.tsx` + `tabs/ThisRun.tsx`, `tabs/History.tsx`, `tabs/Leaderboard.tsx`
- [ ] Run-end toast: **winner + duration** prominent; save is automatic

---

## 4 — Persistence

- [ ] `src/app/api/simulations/route.ts` — `POST` (validates `winner`, `duration_ms`, `screen_w`, `screen_h`, `client_id`) and `GET` list filtered by `?client_id=`
- [ ] `src/app/api/simulations/[id]/route.ts` — `GET` detail (+ samples); server verifies the `client_id` matches the row before returning
- [ ] `src/app/api/simulations/batch/route.ts` — bulk insert for auto-run
- [ ] `src/app/api/leaderboard/route.ts` — reads `leaderboard_view`
- [ ] Soft rate limit: reject writes when that `client_id` has ≥ 1000 runs
- [ ] Wire `ThisRun` tab to POST on run end; wire `History` and `Leaderboard` tabs to GETs
- [ ] Run-detail dialog (on History row click)
- [ ] Smoke-test: complete a run; row appears with the four required fields

---

## 5 — Auto-run + workers

- [ ] `src/components/sim/workers/batch-runner.worker.ts` — imports engine; runs N sims headless; `postMessage` progress
- [ ] Batch-run UI: count input (1–1000), progress bar, cancel
- [ ] Client batches POSTs to `/api/simulations/batch` (e.g. 50 at a time)

---

## 6 — Fun extras

- [ ] Winner prediction field persisted on each run
- [ ] Chaos-mode slider (chaos probability 0–50%) wired through engine
- [ ] Motion trails (alpha fade on each clear)
- [ ] Victory fanfare (WebAudio synth, no external asset)
- [ ] Mute switch in controls
- [ ] PNG export: offscreen canvas composites final frame + stats panel; `canvas.toBlob` + `navigator.clipboard.write` / download
- [ ] Kill-chain view — engine records `transformedBy`; tree rendered in run-detail dialog

---

## 7 — Polish

- [ ] Empty / loading / error states everywhere
- [ ] A11y: aria-labels on floating buttons, focus rings, keyboard-reachable drawer close
- [ ] `README.md` — setup steps, env variables, migration command
- [ ] Lighthouse pass
- [ ] Retina visual QA

---

## Final sign-off

- [ ] Manual verification steps in `docs/PLAN.md` §Verification all pass
- [ ] `bun test` green
- [ ] Playwright smoke test green
- [ ] Branch merged to `main`
