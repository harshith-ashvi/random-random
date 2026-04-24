"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { SimulationCanvas } from "./SimulationCanvas";
import { FloatingControls } from "./FloatingControls";
import { FloatingAnalytics } from "./FloatingAnalytics";
import { FloatingAbout } from "./FloatingAbout";
import { FloatingToggle } from "./FloatingToggle";
import { AnalyticsDrawer } from "./AnalyticsDrawer";
import { useSimStore } from "@/lib/store";
import { getClientId } from "@/lib/client-id";

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
    });
  }, [status, lastResult]);

  return (
    <>
      <SimulationCanvas />
      {!uiHidden && (
        <>
          <FloatingControls />
          <FloatingAnalytics />
          <FloatingAbout />
        </>
      )}
      <FloatingToggle />
      <AnalyticsDrawer />
    </>
  );
}
