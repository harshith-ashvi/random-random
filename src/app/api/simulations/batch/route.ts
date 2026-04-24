import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseSavePayload, ValidationError } from "@/lib/api/validate";

const RUN_CAP_PER_CLIENT = 1000;
const MAX_BATCH = 200;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
    return NextResponse.json({ error: "Expected { items: [...] }" }, { status: 400 });
  }
  const items = (body as { items: unknown[] }).items;
  if (items.length === 0 || items.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `items length must be 1..${MAX_BATCH}` },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = items.map((it) => parseSavePayload(it));
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const clientIds = new Set(parsed.map((p) => p.simulation.client_id));
  if (clientIds.size !== 1) {
    return NextResponse.json(
      { error: "all items must share a single client_id" },
      { status: 400 },
    );
  }
  const clientId = parsed[0]!.simulation.client_id;

  const supabase = createServiceClient();

  const { count, error: countError } = await supabase
    .from("simulations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) + parsed.length > RUN_CAP_PER_CLIENT) {
    return NextResponse.json(
      { error: `Run cap of ${RUN_CAP_PER_CLIENT} would be exceeded.` },
      { status: 429 },
    );
  }

  const { data: simRows, error: simError } = await supabase
    .from("simulations")
    .insert(parsed.map((p) => p.simulation))
    .select("id");

  if (simError || !simRows || simRows.length !== parsed.length) {
    return NextResponse.json(
      { error: simError?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  const sampleInserts = parsed.map((p, i) => ({
    simulation_id: simRows[i]!.id,
    ...p.samples,
  }));

  const { error: samplesError } = await supabase.from("simulation_samples").insert(sampleInserts);
  if (samplesError) {
    await supabase
      .from("simulations")
      .delete()
      .in(
        "id",
        simRows.map((r) => r.id),
      );
    return NextResponse.json({ error: samplesError.message }, { status: 500 });
  }

  return NextResponse.json({ ids: simRows.map((r) => r.id) }, { status: 201 });
}
