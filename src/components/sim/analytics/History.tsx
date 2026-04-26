"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientId } from "@/lib/client-id";
import { fetchHistory, type SimulationListRow } from "@/lib/api/client";
import { RunDetailDialog } from "./RunDetailDialog";

const WINNER_EMOJI: Record<string, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
  timeout: "⏱️",
};

export function HistoryTab() {
  const [rows, setRows] = useState<SimulationListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const clientId = getClientId();
    if (!clientId) return;
    try {
      const data = await fetchHistory(clientId);
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onSaved = () => {
      void load();
    };
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
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No runs yet. Start one from the Controls panel.
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {rows.length} run{rows.length === 1 ? "" : "s"}
        </div>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{WINNER_EMOJI[r.winner] ?? "•"}</span>
              <span className="font-medium capitalize">{r.winner}</span>
              <span className="text-muted-foreground">
                {(r.duration_ms / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                {r.prng}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {r.movement_mode}
              </Badge>
              {r.chaos_mode && (
                <Badge variant="outline" className="text-[10px]">
                  chaos
                </Badge>
              )}
              <span>{new Date(r.created_at).toLocaleString()}</span>
            </div>
          </button>
        ))}
      </div>

      <RunDetailDialog
        id={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </>
  );
}
