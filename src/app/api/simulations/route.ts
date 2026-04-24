import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseSavePayload, ValidationError } from "@/lib/api/validate";

const RUN_CAP_PER_CLIENT = 1000;

export async function POST(request: NextRequest) {
  let payload;
  try {
    payload = parseSavePayload(await request.json());
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { count, error: countError } = await supabase
    .from("simulations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", payload.simulation.client_id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) >= RUN_CAP_PER_CLIENT) {
    return NextResponse.json(
      { error: `Run cap of ${RUN_CAP_PER_CLIENT} reached for this client.` },
      { status: 429 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("simulations")
    .insert(payload.simulation)
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  const { error: samplesError } = await supabase.from("simulation_samples").insert({
    simulation_id: inserted.id,
    ...payload.samples,
  });

  if (samplesError) {
    await supabase.from("simulations").delete().eq("id", inserted.id);
    return NextResponse.json({ error: samplesError.message }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id query param required" }, { status: 400 });
  }

  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("simulations")
    .select(
      "id, created_at, winner, duration_ms, screen_w, screen_h, tick_count, prng, seed, movement_mode, step_px, placement, counts, chaos_mode, predicted_winner, min_population_of_winner, chi_square_stat, chi_square_p, ks_stat, ks_p, direction_entropy_bits, draws_total",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}
