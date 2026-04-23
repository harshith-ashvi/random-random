# PRD — Rock-Paper-Scissors Randomness Lab

## 1. Why

`Math.random()` is the default random source in JavaScript, but it has never been guaranteed to be uniform or high-quality — the spec only says "approximately uniform." This project puts that claim under a microscope in a way that's fun to watch: a full-screen Rock-Paper-Scissors fight where the only thing driving the outcome is the PRNG under test. We compare `Math.random` against `crypto.getRandomValues` and a seeded Mulberry32, and we make the statistical quality of each run visible.

## 2. Goal

- Fun: run a visual RPS simulation where entities move randomly, collide, and transform.
- Rigour: for each run, record *which PRNG was used* and attach statistical measurements (chi-square, KS, direction entropy, position heatmap).
- Scale: persist everything to Supabase so aggregate patterns emerge over hundreds of runs.

## 3. Users

- Curious developers and students.
- **No accounts. No login.** Every browser gets a `client_id` (UUID) in `localStorage` on first visit; that's the only identity. It attaches to every saved run and is what we use to show "your history". A cleared localStorage ⇒ a fresh identity; that's fine for this project.

## 4. Core experience

### 4.1 Simulation

- Full-viewport HTML Canvas 2D background.
- Initial population: N rocks, N paper, N scissors. N ∈ [10, 20]. Default 10.
- Placement: `random` (default) or `grouped` (one type per corner). User-configurable.
- Movement:
  - Constant step size per tick (default ~3px; slider).
  - Modes, both captured in the run record:
    - **Jitter** — fresh random unit-vector every tick (exercises the PRNG hardest).
    - **Persistent** — direction held; small random-turn probability per tick (organic look).
- Bounce off viewport edges (reflect).
- Collision rule: entity overlap → loser transforms into winner's type. Same-type touches do nothing. Short flash/scale animation (~150ms).
- End: all entities one type → `winner` recorded. Timeout at 15 min → `winner = timeout`.
- **Always captured on run end (non-negotiable):** `winner`, `duration_ms`, `screen_w`, `screen_h`, `client_id`. These + id go to every saved row.
- Controls: start / pause / step / reset, speed multiplier 0.5×/1×/2×/4×.

### 4.2 PRNG comparison (the actual experiment)

- Selectable per run: `math-random`, `crypto-random`, `mulberry32`.
- `mulberry32` accepts a user seed for reproducibility.
- Every random draw is accumulated into a 20-bucket histogram over [0, 1) — not the raw stream, to keep storage small.
- Movement angles accumulated into a 16-bucket angular histogram.
- Position visits accumulated into a 32×32 heatmap.

### 4.3 Statistical measurements (shown in analytics, with tooltips)

- **Chi-square goodness-of-fit** on the draws histogram → p-value. Tooltip: "probability that observed bucket counts came from a truly uniform distribution; p < 0.05 is suspicious."
- **Kolmogorov–Smirnov (KS) test** on the empirical CDF vs uniform → D statistic + p-value. Tooltip: "largest gap between the observed and ideal cumulative distributions."
- **Direction entropy** — Shannon entropy in bits over 16 angular buckets. Max 4.0 bits = perfect uniform direction choice.

### 4.4 UI shell

- Canvas is the background.
- Floating **Controls** (bottom-left): counts, placement, movement mode, step size, speed, PRNG, seed, chaos toggle, start/pause/reset.
- Floating **Analytics** (bottom-right): opens bottom drawer.
- Floating **About** (top-right): sheet with project explainer, PRNG primer, stat-test primer.
- Floating **Hide UI** toggle: hides all floating elements for a clean canvas; small corner peek-button brings them back.
- Run-end toast: winner + duration; auto-saved.

### 4.5 Analytics drawer (bottom drawer)

Three tabs:

**This Run** — live during a run, frozen after:

- Population-over-time (stacked area).
- Draws histogram (bar).
- Direction histogram (bar).
- Heatmap (32×32 grid).
- Chi-square, KS, entropy values.
- Config summary.

**History** — past runs for the current `client_id`; filter by PRNG, movement mode, counts; click → detail dialog with per-run charts.

**Leaderboard** — global aggregates (anonymized):

- Fastest convergence, longest run, biggest comeback (min population of eventual winner).
- Win-rate matrix: rows = PRNG, cols = type; percentages.
- Mean/median convergence time per PRNG.

### 4.6 Auto-run mode

- Queue 1 to 1000 runs with the current config.
- Runs headless in a web worker (no render cost) and save in batches.
- Progress bar + cancel.

### 4.7 Extras (in scope for v1)

- **Winner prediction** — pick a type before starting; hit-rate tracked per `client_id`.
- **Chaos mode** — on collision, small configurable chance the loser becomes a *random* type instead of the winner's type.
- **Motion trails** — fading alpha on the canvas clear for visual intuition.
- **Sound** — tiny WebAudio synth click on collision, fanfare on victory, mute switch.
- **Shareable PNG result card** — final canvas + stats, exported via `canvas.toDataURL`.
- **Kill-chain view** — tree of who-beat-whom for the final survivor.

## 5. Data

### 5.1 Supabase

- No auth. No accounts. All access is anonymous; `client_id` (localStorage UUID) is the only identity.
- Writes go through a Next.js Route Handler that uses the Supabase `service_role` key server-side, so RLS stays strict (no direct anon reads of raw rows).
- Rate limit: 1000 runs per `client_id` (soft cap, server-enforced; auto-run counts).

### 5.2 Schema

- `simulations` — one row per run, summary stats only (fast queries).
- `simulation_samples` — histograms, heatmap, and sampled population series per run (loaded only in detail view).
- `leaderboard_view` — public, anonymized aggregate view.
- See `PLAN.md` → *Data model* for exact columns + RLS.

## 6. Success criteria

- A user opens the app, gets a running sim within 1s, and sees a converged result in under 30s for default config.
- After 100 runs across PRNGs, the leaderboard shows measurable differences (or the lack thereof) in per-PRNG convergence time.
- Chi-square / KS tooltips are understandable by a developer who hasn't taken stats in a decade.
- Everything works offline-except-save; saves succeed as soon as network returns.

## 7. Out of scope (v1)

- WebGL rendering (we're at 30–60 entities; Canvas 2D is plenty).
- Real-time multi-user rooms.
- Generating custom distributions (we analyze; we don't correct).
- Mobile touch gestures (responsive layout only).

## 8. Open questions

- Dark/light toggle in UI, or follow system. (Planning: follow system for v1.)
- Default keyboard shortcuts — `space` pause, `r` reset, `a` analytics, `h` hide UI. Open to change.
