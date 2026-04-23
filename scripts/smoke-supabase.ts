import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const clientId = `smoke-${crypto.randomUUID()}`;

const { data: inserted, error: insertErr } = await supabase
  .from("simulations")
  .insert({
    client_id: clientId,
    winner: "rock",
    duration_ms: 1234,
    screen_w: 1920,
    screen_h: 1080,
    prng: "math-random",
    movement_mode: "jitter",
    step_px: 3,
    placement: "random",
    counts: { rock: 10, paper: 10, scissors: 10 },
    chaos_mode: false,
  })
  .select()
  .single();

if (insertErr) {
  console.error("INSERT failed:", insertErr);
  process.exit(1);
}
console.log("✓ INSERT ok, id =", inserted.id);

const { data: read, error: readErr } = await supabase
  .from("simulations")
  .select("*")
  .eq("id", inserted.id)
  .single();

if (readErr) {
  console.error("SELECT failed:", readErr);
  process.exit(1);
}
console.log(
  "✓ SELECT ok, winner =",
  read.winner,
  "duration_ms =",
  read.duration_ms,
);

const { data: view, error: viewErr } = await supabase
  .from("leaderboard_view")
  .select("*")
  .limit(5);

if (viewErr) {
  console.error("leaderboard_view SELECT failed:", viewErr);
  process.exit(1);
}
console.log("✓ leaderboard_view ok, rows =", view.length);

const { error: delErr } = await supabase
  .from("simulations")
  .delete()
  .eq("id", inserted.id);

if (delErr) {
  console.error("cleanup DELETE failed:", delErr);
  process.exit(1);
}
console.log("✓ cleanup ok");
console.log("\nAll smoke tests passed.");
