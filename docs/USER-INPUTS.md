# User Inputs — what I need from you

Everything on this list blocks a task in `docs/CHECKLIST.md` (marked 🧍 there). Nothing here needs to be done before we start Phase 0, but the sooner the better.

## 1. Supabase project (blocks Phase 0.2 / 0.4)

- [ ] Create a free Supabase project at <https://supabase.com>
- [ ] Share from the project dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://xxxxxxxx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the long `eyJ…` key
- [ ] (Optional, cleaner) install Supabase CLI locally so I can run the migration with `supabase db push`. If you skip this, I'll paste the SQL into the Supabase SQL editor and you click Run.

Heads-up: email magic-link sign-in requires either the default Supabase SMTP (rate-limited, fine for dev) or a custom SMTP provider. You don't need to set this up until Phase 5.

## 2. Rock / Paper / Scissors icons (blocks Phase 2)

Choose ONE option. Option A is fastest.

### Option A — emojis (zero work)

Use 🪨 📄 ✂️ directly. We render them via canvas `fillText`. Free, universal, slight font-rendering differences across OSes.

### Option B — Lucide icons (zero asset files, consistent)

Lucide is already installed. We can use:

- `Mountain` or `Circle` for rock
- `FileText` or `File` for paper
- `Scissors` for scissors

Rendered to canvas by drawing their SVG path data. Looks clean, matches shadcn aesthetic.

### Option C — custom SVGs (most distinctive)

Provide three SVGs sized consistently (recommend 64×64 or 128×128 viewBox):

- `public/icons/rock.svg`
- `public/icons/paper.svg`
- `public/icons/scissors.svg`

Constraints:

- Single color (we'll recolor via `currentColor` / canvas fillStyle)
- No drop shadows or gradients (they don't composite well at small sizes)
- Readable at 24px

**Please pick A, B, or C.** If C, drop the three SVGs into `public/icons/` and I'll wire them up.

## 3. Favicon + OG image (Phase 8 polish)

- [ ] Favicon (16×16 / 32×32 / 180×180) or a single 512×512 source we can export from. Skipping = we use the default Next.js favicon.
- [ ] OG image 1200×630 for link previews. Skipping = no OG image; link previews show plain text.

## 4. Copy & branding (Phase 2 + About sheet)

- [ ] App name — "Random Random"? "RPS Randomness Lab"? Something else?
- [ ] Tagline (one line) for the About sheet
- [ ] 🧍 Author handle / link you want in the About sheet (GitHub, Twitter, or none)

## 5. Domain / deploy target (Phase 8)

- [ ] Vercel? Something else?
- [ ] Custom domain, or `*.vercel.app` for now?

## 6. Nice-to-haves (skip if unsure)

- [ ] A real victory-fanfare audio file (`public/sounds/fanfare.mp3`, ≤ 50 KB). If skipped, we synthesize a short chord with WebAudio.
- [ ] Dark/light toggle preference: follow system (default), or a manual switch in the UI?
- [ ] Leaderboard opt-out — should anon users be able to hide their runs from global aggregates?

---

When you've answered / supplied items 1 and 2, we can start coding. Everything else can come during or after implementation.
