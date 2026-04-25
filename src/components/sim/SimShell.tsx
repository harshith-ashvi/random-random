"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimulationCanvas } from "./SimulationCanvas";
import { FloatingControls } from "./FloatingControls";
import { FloatingAnalytics } from "./FloatingAnalytics";
import { FloatingAbout } from "./FloatingAbout";
import { FloatingToggle } from "./FloatingToggle";
import { AnalyticsDrawer } from "./AnalyticsDrawer";
import { useSimStore } from "@/lib/store";
import { getClientId } from "@/lib/client-id";
import { downloadBlob, exportRunPng } from "@/lib/png-export";

export function SimShell() {
  const uiHidden = useSimStore((s) => s.uiHidden);
  const status = useSimStore((s) => s.status);
  const setStatus = useSimStore((s) => s.setStatus);
  const setAnalyticsOpen = useSimStore((s) => s.setAnalyticsOpen);
  const toggleUi = useSimStore((s) => s.toggleUi);
  const lastResult = useSimStore((s) => s.lastResult);

  useEffect(() => {
    getClientId();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const cur = useSimStore.getState().status;
      if (e.key === " ") {
        e.preventDefault();
        if (cur === "running") setStatus("paused");
        else if (cur === "paused") setStatus("running");
        else if (cur === "idle" || cur === "ended") {
          setStatus("idle");
          queueMicrotask(() => setStatus("running"));
        }
      } else if (e.key.toLowerCase() === "r") {
        setStatus("idle");
      } else if (e.key.toLowerCase() === "a") {
        setAnalyticsOpen(!useSimStore.getState().analyticsOpen);
      } else if (e.key.toLowerCase() === "h") {
        toggleUi();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setStatus, setAnalyticsOpen, toggleUi]);

  useEffect(() => {
    if (status !== "ended" || !lastResult) return;
    const label =
      lastResult.winner === "timeout"
        ? "Timeout"
        : `${lastResult.winner === "rock" ? "🪨" : lastResult.winner === "paper" ? "📄" : "✂️"} ${lastResult.winner}`;
    toast(`${label} wins`, {
      description: `${(lastResult.durationMs / 1000).toFixed(1)}s • ${lastResult.tickCount.toLocaleString()} ticks`,
      action: {
        label: "Save PNG",
        onClick: async () => {
          const result = useSimStore.getState().lastResult;
          const url = useSimStore.getState().lastFrameDataUrl;
          if (!result) return;
          try {
            const blob = await exportRunPng(result, url);
            if (!blob) throw new Error("PNG encode failed");
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            downloadBlob(blob, `random-random-${result.winner}-${ts}.png`);
          } catch (err) {
            toast.error("Couldn't export PNG", {
              description: err instanceof Error ? err.message : "Unknown error",
            });
          }
        },
      },
    });

    const clientId = getClientId();
    if (!clientId) return;
    let cancelled = false;
    import("@/lib/api/client").then(async ({ saveRun }) => {
      try {
        await saveRun(lastResult, clientId);
        if (!cancelled) window.dispatchEvent(new CustomEvent("rr:run-saved"));
      } catch (err) {
        if (!cancelled) {
          toast.error("Couldn't save run", {
            description: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [status, lastResult]);

  const lastFrameDataUrl = useSimStore((s) => s.lastFrameDataUrl);

  const onDownload = async () => {
    if (!lastResult) return;
    try {
      const blob = await exportRunPng(lastResult, lastFrameDataUrl);
      if (!blob) throw new Error("PNG encode failed");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `random-random-${lastResult.winner}-${ts}.png`);
    } catch (err) {
      toast.error("Couldn't export PNG", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return (
    <>
      <SimulationCanvas />
      {!uiHidden && (
        <>
          <FloatingControls />
          <FloatingAnalytics />
          <FloatingAbout />
          {status === "ended" && lastResult && (
            <Button
              size="sm"
              variant="secondary"
              className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 shadow-md"
              onClick={onDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              Save PNG
            </Button>
          )}
        </>
      )}
      <FloatingToggle />
      <AnalyticsDrawer />
    </>
  );
}
