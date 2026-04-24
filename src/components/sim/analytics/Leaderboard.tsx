"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLeaderboard } from "@/lib/api/client";
import type { LeaderboardRow } from "@/lib/supabase/types";

const WINNER_EMOJI: Record<string, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export function LeaderboardTab() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchLeaderboard();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    }
  }, []);

  useEffect(() => {
    load();
    const onSaved = () => load();
    window.addEventListener("rr:run-saved", onSaved);
    return () => window.removeEventListener("rr:run-saved", onSaved);
  }, [load]);

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        {error}
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!rows) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No runs have been recorded yet. Start one!
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {rows.length} PRNG × winner combos
        </div>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">PRNG</th>
              <th className="px-3 py-2">Winner</th>
              <th className="px-3 py-2 text-right">Runs</th>
              <th className="px-3 py-2 text-right">Median</th>
              <th className="px-3 py-2 text-right">Min</th>
              <th className="px-3 py-2 text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.prng}-${r.winner}`}
                className={i % 2 ? "bg-muted/20" : ""}
              >
                <td className="px-3 py-1.5 font-mono text-xs">{r.prng}</td>
                <td className="px-3 py-1.5 capitalize">
                  {WINNER_EMOJI[r.winner] ?? "•"} {r.winner}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{r.runs}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {(r.median_duration_ms / 1000).toFixed(1)}s
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {(r.min_duration_ms / 1000).toFixed(1)}s
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {(r.max_duration_ms / 1000).toFixed(1)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
