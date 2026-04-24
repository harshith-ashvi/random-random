import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/simulations/[id]">,
) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id query param required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: sim, error: simError } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (simError) {
    return NextResponse.json({ error: simError.message }, { status: 500 });
  }
  if (!sim) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (sim.client_id !== clientId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: samples, error: samplesError } = await supabase
    .from("simulation_samples")
    .select("draws_histogram, direction_histogram, heatmap, population_series")
    .eq("simulation_id", id)
    .maybeSingle();

  if (samplesError) {
    return NextResponse.json({ error: samplesError.message }, { status: 500 });
  }

  return NextResponse.json({ simulation: sim, samples });
}
