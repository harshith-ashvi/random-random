"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSimStore } from "@/lib/store";
import { getClientId } from "@/lib/client-id";
import { saveRunBatch } from "@/lib/api/client";
import type {
  BatchRunSummary,
  BatchWorkerMessageOut,
  BatchWorkerStart,
} from "@/components/sim/workers/batch-runner.worker";

const BATCH_SAVE_CHUNK = 50;

type Phase = "idle" | "running" | "saving" | "done" | "error" | "cancelling";

type WinnerTally = { rock: number; paper: number; scissors: number; timeout: number };

export function BatchRunner() {
  const config = useSimStore((s) => s.config);
  const simStatus = useSimStore((s) => s.status);

  const [count, setCount] = useState(50);
  const [phase, setPhase] = useState<Phase>("idle");
  const [completed, setCompleted] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState<WinnerTally>({
    rock: 0,
    paper: 0,
    scissors: 0,
    timeout: 0,
  });

  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<BatchRunSummary[]>([]);
  const startedAtRef = useRef(0);

  const canStart =
    phase === "idle" || phase === "done" || phase === "error";
  const disabled =
    simStatus === "running" ||
    simStatus === "paused" ||
    !canStart ||
    count < 1 ||
    count > 1000;

  const cleanup = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    pendingRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const flushPending = useCallback(
    async (final: boolean) => {
      const clientId = getClientId();
      if (!clientId) return;
      const buf = pendingRef.current;
      while (buf.length >= BATCH_SAVE_CHUNK || (final && buf.length > 0)) {
        const chunk = buf.splice(0, BATCH_SAVE_CHUNK);
        try {
          const { ids } = await saveRunBatch(chunk, config, clientId);
          setSavedCount((s) => s + ids.length);
        } catch (err) {
          throw err;
        }
      }
    },
    [config],
  );

  const onStart = useCallback(() => {
    const clientId = getClientId();
    if (!clientId) {
      toast.error("No client id available");
      return;
    }
    if (count < 1 || count > 1000) {
      toast.error("Count must be 1–1000");
      return;
    }

    setPhase("running");
    setCompleted(0);
    setSavedCount(0);
    setError(null);
    setTally({ rock: 0, paper: 0, scissors: 0, timeout: 0 });
    startedAtRef.current = performance.now();
    pendingRef.current = [];

    const worker = new Worker(
      new URL("./workers/batch-runner.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;

    worker.onmessage = async (e: MessageEvent<BatchWorkerMessageOut>) => {
      const msg = e.data;
      if (msg.type === "result") {
        pendingRef.current.push(msg.summary);
        setTally((t) => {
          const w = msg.summary.winner as keyof WinnerTally;
          return { ...t, [w]: t[w] + 1 };
        });
        if (pendingRef.current.length >= BATCH_SAVE_CHUNK) {
          try {
            await flushPending(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "save failed");
            setPhase("error");
            worker.terminate();
            workerRef.current = null;
          }
        }
      } else if (msg.type === "progress") {
        setCompleted(msg.completed);
      } else if (msg.type === "done") {
        setPhase("saving");
        try {
          await flushPending(true);
          setPhase("done");
          window.dispatchEvent(new CustomEvent("rr:run-saved"));
          const dur = ((performance.now() - startedAtRef.current) / 1000).toFixed(1);
          toast.success(`Batch complete: ${count} runs in ${dur}s`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "save failed");
          setPhase("error");
        } finally {
          worker.terminate();
          workerRef.current = null;
        }
      } else if (msg.type === "cancelled") {
        setPhase("saving");
        try {
          await flushPending(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : "save failed");
        }
        setPhase("idle");
        window.dispatchEvent(new CustomEvent("rr:run-saved"));
        toast.message(`Cancelled after ${msg.completed} runs`);
        worker.terminate();
        workerRef.current = null;
      } else if (msg.type === "error") {
        setError(msg.message);
        setPhase("error");
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.onerror = (e) => {
      setError(e.message);
      setPhase("error");
      worker.terminate();
      workerRef.current = null;
    };

    const start: BatchWorkerStart = {
      type: "start",
      config,
      count,
      screenW: window.innerWidth,
      screenH: window.innerHeight,
    };
    worker.postMessage(start);
  }, [config, count, flushPending]);

  const onCancel = useCallback(() => {
    if (!workerRef.current) return;
    setPhase("cancelling");
    workerRef.current.postMessage({ type: "cancel" });
  }, []);

  const progressPct =
    count > 0 && (phase === "running" || phase === "cancelling")
      ? (completed / count) * 100
      : phase === "saving"
        ? 100
        : 0;

  const active = phase === "running" || phase === "saving" || phase === "cancelling";

  return (
    <div className="space-y-2">
      <Label className="text-xs">Batch auto-run (headless)</Label>
      <div className="flex gap-2">
        <Input
          type="number"
          min={1}
          max={1000}
          value={count}
          disabled={active}
          onChange={(e) => {
            const v = Number(e.target.value);
            setCount(Number.isFinite(v) ? Math.max(1, Math.min(1000, v)) : 1);
          }}
          className="h-8 w-20 text-xs"
        />
        {!active ? (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onStart}
            disabled={disabled}
          >
            <Zap className="mr-1 h-3 w-3" />
            Run {count}
          </Button>
        ) : phase === "cancelling" ? (
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" disabled>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Cancelling…
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 h-8 text-xs"
            onClick={onCancel}
            disabled={phase === "saving"}
          >
            <X className="mr-1 h-3 w-3" />
            {phase === "saving" ? "Saving…" : "Cancel"}
          </Button>
        )}
      </div>

      {(active || phase === "done" || phase === "error") && (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={
                phase === "error"
                  ? "h-full bg-destructive transition-all"
                  : "h-full bg-primary transition-all"
              }
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>
              {completed}/{count} run{count === 1 ? "" : "s"}
            </span>
            <span>
              saved {savedCount} · 🪨{tally.rock} 📄{tally.paper} ✂️{tally.scissors}
              {tally.timeout > 0 ? ` ⏱️${tally.timeout}` : ""}
            </span>
          </div>
          {error && (
            <div className="text-[10px] text-destructive">{error}</div>
          )}
        </>
      )}

      <Separator className="my-1" />
      <p className="text-[10px] leading-snug text-muted-foreground">
        Runs headless in a worker using the current config. Saves in chunks of
        {" "}
        {BATCH_SAVE_CHUNK}. Counts toward the 1000-run cap.
      </p>
    </div>
  );
}
