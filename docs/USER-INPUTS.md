# User Inputs — what I need from you

Everything on this list blocks a task in `docs/CHECKLIST.md` (marked 🧍 there). Nothing here needs to be done before we start Phase 0, but the sooner the better.

## 1. Supabase project (blocks Phase 0.2 / 0.4)

- [x] Create a free Supabase project at <https://supabase.com>
- [ ] Share from the project dashboard, added to `.env`:
  - `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://xxxxxxxx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the **publishable** key (Supabase's new name for the anon/public key; safe to expose in the browser)
  - `SUPABASE_SECRET_KEY` — the **secret** key (Supabase's new name for the service-role key; server-only). Both are under *Project settings → API Keys*.
- [ ] Apply the migration: open *SQL Editor*, paste the contents of `supabase/migrations/0001_init.sql`, Run. Confirm `simulations`, `simulation_samples` tables and `leaderboard_view` appear under *Database*.

## 2. Rock / Paper / Scissors icons

- [x] Emojis (🪨 📄 ✂️) — rendered via canvas `fillText`. Zero work, done.

## 3. Favicon + OG image (Phase 7 polish)

- [ ] Favicon (16×16 / 32×32 / 180×180) or a single 512×512 source we can export from. Skip = default Next.js favicon.
- [ ] OG image 1200×630 for link previews. Skip = no OG image.

## 4. Copy & branding (Phase 2 + About sheet)

- [ ] App name — "Random Random"? "RPS Randomness Lab"? Something else?
- [ ] Tagline (one line) for the About sheet
- [ ] Author handle / link you want in the About sheet (GitHub, Twitter, or none)

## 5. Domain / deploy target (Phase 7)

- [ ] Vercel? Something else?
- [ ] Custom domain, or `*.vercel.app` for now?

## 6. Nice-to-haves (skip if unsure)

- [ ] Dark/light toggle preference: follow system (default), or a manual switch in the UI?
- [ ] Leaderboard opt-out per run — should there be a "don't include in global aggregates" checkbox?

---

When item 1 is done we're clear to start Phase 1. Everything else can come during or after implementation.
