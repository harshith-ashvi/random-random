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

- [x] `prng.ts` — `PRNG` interface + `MathRandom`, `CryptoRandom`, `Mulberry32(seed)` impls. Both `next()` → [0,1) and `nextAngle()` → [0, 2π)
- [x] `entity.ts` — `Entity { id, type, x, y, angle, flashUntil }`
- [x] `world.ts` — spatial hash (16×16 cells), add/remove, neighbour query
- [x] `collision.ts` — circle-overlap test, RPS winner lookup, chaos-mode branch
- [x] `stats.ts` — accumulators for `drawsHist[20]`, `dirHist[16]`, `heatmap[1024]`, `populationSeries` (5 Hz sampler), `minPopulationOfWinner`
- [x] `step.ts` — `step(world, dt)`: advance, reflect walls, resolve collisions, stats
- [x] `run.ts` — orchestrator; returns `RunResult` that **must** contain `winner`, `durationMs`, `screenW`, `screenH`
- [x] `index.ts` — barrel export

### Engine tests (`bun test`)

- [x] Determinism: same `mulberry32` seed ⇒ identical tick-by-tick state
- [x] RPS rule: rock+paper ⇒ both become paper
- [x] Same-type touch: no change
- [x] Wall bounce: angle reflected correctly on all four walls
- [x] Stats: histograms sum to expected totals, heatmap sums to `tickCount × entityCount`
- [x] `RunResult` always has the four required fields

---

## 2 — Canvas + UI shell

- [x] `src/lib/store.ts` — Zustand store (config, runtime, runStatus)
- [x] `src/components/sim/SimulationCanvas.tsx` — canvas, resize observer, RAF loop, emoji-glyph rendering (🪨 📄 ✂️), flash animation. Captures `window.innerWidth`/`innerHeight` at run start.
- [x] `src/components/sim/FloatingControls.tsx` — counts (10–20), placement, movement mode, step size, speed, PRNG select, seed input (mulberry32 only), chaos toggle, start/pause/reset, predicted-winner picker
- [x] `src/components/sim/FloatingAnalytics.tsx` — opens bottom drawer
- [x] `src/components/sim/FloatingAbout.tsx` — sheet with project + stat-test explainer
- [x] `src/components/sim/FloatingToggle.tsx` — master hide-all; corner peek-button restores
- [x] `src/app/page.tsx` — replace template with canvas + floating UI
- [x] Keyboard shortcuts: `space` pause, `r` reset, `a` analytics, `h` hide UI

---

## 3 — Stats + analytics drawer

- [x] `src/lib/stats/chi-square.ts` + tests (textbook example)
- [x] `src/lib/stats/ks.ts` + tests (known distribution pair)
- [x] `src/lib/stats/entropy.ts` + tests (uniform ⇒ log2(k))
- [x] `src/components/sim/charts/PopulationArea.tsx` (Recharts stacked area)
- [x] `src/components/sim/charts/Histogram.tsx` (Recharts bar)
- [x] `src/components/sim/charts/Heatmap.tsx` (CSS grid using `--chart-*` tokens)
- [x] `src/components/sim/charts/Scorecard.tsx` (stat tiles + shadcn tooltip copy)
- [x] `src/components/sim/AnalyticsDrawer.tsx` + `tabs/ThisRun.tsx`, `tabs/History.tsx`, `tabs/Leaderboard.tsx`
- [x] Run-end toast: **winner + duration** prominent; save automatic in Phase 4

---

## 4 — Persistence

- [x] `src/app/api/simulations/route.ts` — `POST` (validates `winner`, `duration_ms`, `screen_w`, `screen_h`, `client_id`) and `GET` list filtered by `?client_id=`
- [x] `src/app/api/simulations/[id]/route.ts` — `GET` detail (+ samples); server verifies the `client_id` matches the row before returning
- [x] `src/app/api/simulations/batch/route.ts` — bulk insert for auto-run
- [x] `src/app/api/leaderboard/route.ts` — reads `leaderboard_view`
- [x] Soft rate limit: reject writes when that `client_id` has ≥ 1000 runs
- [x] Wire `ThisRun` tab to POST on run end; wire `History` and `Leaderboard` tabs to GETs
- [x] Run-detail dialog (on History row click)
- [x] Smoke-test: complete a run; row appears with the four required fields

---

## 5 — Auto-run + workers

- [x] `src/components/sim/workers/batch-runner.worker.ts` — imports engine; runs N sims headless; `postMessage` progress
- [x] Batch-run UI: count input (1–1000), progress bar, cancel
- [x] Client batches POSTs to `/api/simulations/batch` (e.g. 50 at a time)

---

## 6 — Fun extras

- [x] Winner prediction field persisted on each run
- [x] Chaos-mode slider (chaos probability 0–50%) wired through engine
- [x] Motion trails (alpha fade on each clear)
- [x] Victory fanfare (WebAudio synth, no external asset)
- [x] Mute switch in controls
- [x] PNG export: offscreen canvas composites final frame + stats panel; `canvas.toBlob` + `navigator.clipboard.write` / download
- [x] Kill-chain view — engine records `transformedBy`; tree rendered in run-detail dialog

---

## 7 — Polish

- [x] Empty / loading / error states everywhere
- [x] A11y: aria-labels on floating buttons, focus rings, keyboard-reachable drawer close
- [x] `README.md` — setup steps, env variables, migration command
- [ ] 🧍 Lighthouse pass (run in Chrome DevTools → Lighthouse → Mobile + Desktop)
- [ ] 🧍 Retina visual QA (open at 2× DPR; verify emoji glyphs are crisp, charts not blurry)

---

## Final sign-off

- [ ] 🧍 Manual verification steps in `docs/PLAN.md` §Verification all pass
- [x] `bun test` green (39 pass, engine + stats)
- [x] Playwright smoke test green (`bun run test:e2e`)
- [ ] 🧍 Branch merged to `main`
