"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Counts, EntityType } from "@/lib/supabase/types";
import { useSimStore, countsFromConfig, type SimConfig } from "@/lib/store";
import {
  createPRNG,
  createStats,
  createWorld,
  initWorld,
  step,
  winnerOf,
  ENTITY_RADIUS,
  type RunConfig,
  type Stats,
  type World,
  type PRNG,
  type StepConfig,
} from "@/components/sim/engine";

const GLYPH: Record<EntityType, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const FIXED_DT_MS = 16;
const SAMPLE_INTERVAL_MS = 100;

type Loop = {
  world: World;
  stats: Stats;
  rng: PRNG;
  stepCfg: StepConfig;
  config: SimConfig;
  screenW: number;
  screenH: number;
  accumulatorMs: number;
  lastSnapshotAtMs: number;
  counts: Counts;
  rafId: number | null;
  prevFrameMs: number;
};

export function SimulationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loopRef = useRef<Loop | null>(null);
  const dprRef = useRef(1);

  const status = useSimStore((s) => s.status);
  const config = useSimStore((s) => s.config);
  const setStatus = useSimStore((s) => s.setStatus);
  const setLiveStats = useSimStore((s) => s.setLiveStats);
  const setLastResult = useSimStore((s) => s.setLastResult);

  const snapshot = useCallback(
    (loop: Loop) => {
      setLiveStats({
        tick: loop.world.tick,
        elapsedMs: loop.world.elapsedMs,
        counts: { ...loop.counts },
        drawsHist: loop.stats.drawsHist.slice(),
        dirHist: loop.stats.dirHist.slice(),
        heatmap: loop.stats.heatmap.slice(),
        populationSeries: loop.stats.populationSeries.slice(),
        drawsTotal: loop.rng.drawCount(),
      });
    },
    [setLiveStats],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const loop = loopRef.current;
    if (!canvas || !loop) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { screenW, screenH, world } = loop;
    ctx.save();
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, screenW, screenH);

    ctx.font = `${ENTITY_RADIUS * 2}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const now = world.elapsedMs;
    for (const e of world.entities) {
      const flashT = Math.max(0, (e.flashUntil - now) / loop.config.flashDurationMs);
      const scale = 1 + 0.35 * flashT;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(scale, scale);
      if (flashT > 0) {
        ctx.globalAlpha = 0.85 + 0.15 * (1 - flashT);
      }
      ctx.fillText(GLYPH[e.type], 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }, []);

  const endRun = useCallback(
    (finalWinner: Counts) => {
      const loop = loopRef.current;
      if (!loop) return;
      if (loop.rafId !== null) cancelAnimationFrame(loop.rafId);
      loop.rafId = null;

      const w = winnerOf(finalWinner) ?? "timeout";

      setLastResult({
        winner: w,
        durationMs: loop.world.elapsedMs,
        screenW: loop.screenW,
        screenH: loop.screenH,
        tickCount: loop.world.tick,
        finalCounts: { ...finalWinner },
        minPopulationOfWinner:
          w === "timeout"
            ? 0
            : Number.isFinite(loop.stats.populationMin[w])
              ? loop.stats.populationMin[w]
              : 0,
        chiSquareStat: null,
        chiSquareP: null,
        ksStat: null,
        ksP: null,
        directionEntropyBits: null,
        drawsTotal: loop.rng.drawCount(),
        stats: {
          tick: loop.world.tick,
          elapsedMs: loop.world.elapsedMs,
          counts: { ...finalWinner },
          drawsHist: loop.stats.drawsHist.slice(),
          dirHist: loop.stats.dirHist.slice(),
          heatmap: loop.stats.heatmap.slice(),
          populationSeries: loop.stats.populationSeries.slice(),
          drawsTotal: loop.rng.drawCount(),
        },
        config: loop.config,
      });

      setStatus("ended");
    },
    [setLastResult, setStatus],
  );

  const frame = useCallback(
    (t: number) => {
      const loop = loopRef.current;
      if (!loop) return;

      const statusNow = useSimStore.getState().status;
      if (statusNow !== "running") {
        loop.rafId = null;
        return;
      }

      const realDelta = Math.min(100, t - loop.prevFrameMs);
      loop.prevFrameMs = t;
      loop.accumulatorMs += realDelta * loop.config.speed;

      let ended = false;
      while (loop.accumulatorMs >= FIXED_DT_MS) {
        loop.counts = step(loop.world, loop.stats, loop.rng, loop.stepCfg, FIXED_DT_MS);
        loop.accumulatorMs -= FIXED_DT_MS;

        if (loop.world.elapsedMs >= loop.config.maxMs || winnerOf(loop.counts)) {
          ended = true;
          break;
        }
      }

      draw();

      if (loop.world.elapsedMs - loop.lastSnapshotAtMs >= SAMPLE_INTERVAL_MS) {
        loop.lastSnapshotAtMs = loop.world.elapsedMs;
        snapshot(loop);
      }

      if (ended) {
        snapshot(loop);
        endRun(loop.counts);
        return;
      }

      loop.rafId = requestAnimationFrame(frame);
    },
    [draw, endRun, snapshot],
  );

  const startLoop = useCallback(() => {
    const loop = loopRef.current;
    if (!loop) return;
    if (loop.rafId !== null) return;
    loop.prevFrameMs = performance.now();
    loop.rafId = requestAnimationFrame(frame);
  }, [frame]);

  const initRun = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenW = Math.floor(rect.width);
    const screenH = Math.floor(rect.height);

    const rng = createPRNG(config.prng, config.seed);

    const runCfg: RunConfig = {
      screenW,
      screenH,
      counts: countsFromConfig(config),
      placement: config.placement,
      movementMode: config.movementMode,
      stepPx: config.stepPx,
      turnProbability: config.turnProbability,
      turnAmount: config.turnAmount,
      chaosProbability: config.chaosMode ? config.chaosProbability : 0,
      flashDurationMs: config.flashDurationMs,
      dtMs: FIXED_DT_MS,
      maxMs: config.maxMs,
    };

    const world = initWorld(runCfg, rng);
    const stats = createStats();

    const stepCfg: StepConfig = {
      movementMode: runCfg.movementMode,
      stepPx: runCfg.stepPx,
      turnProbability: runCfg.turnProbability,
      turnAmount: runCfg.turnAmount,
      chaosProbability: runCfg.chaosProbability,
      flashDurationMs: runCfg.flashDurationMs,
    };

    loopRef.current = {
      world,
      stats,
      rng,
      stepCfg,
      config,
      screenW,
      screenH,
      accumulatorMs: 0,
      lastSnapshotAtMs: -Infinity,
      counts: countsFromConfig(config),
      rafId: null,
      prevFrameMs: 0,
    };

    snapshot(loopRef.current);
    draw();
  }, [config, draw, snapshot]);

  const resetToIdle = useCallback(() => {
    const loop = loopRef.current;
    if (loop?.rafId !== null && loop !== null) cancelAnimationFrame(loop.rafId!);

    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const screenW = Math.floor(rect.width);
      const screenH = Math.floor(rect.height);
      loopRef.current = {
        world: createWorld(screenW, screenH),
        stats: createStats(),
        rng: createPRNG(config.prng, config.seed),
        stepCfg: {
          movementMode: config.movementMode,
          stepPx: config.stepPx,
          turnProbability: config.turnProbability,
          turnAmount: config.turnAmount,
          chaosProbability: 0,
          flashDurationMs: config.flashDurationMs,
        },
        config,
        screenW,
        screenH,
        accumulatorMs: 0,
        lastSnapshotAtMs: -Infinity,
        counts: { rock: 0, paper: 0, scissors: 0 },
        rafId: null,
        prevFrameMs: 0,
      };
    }
    setLiveStats(null);

    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }, [config, setLiveStats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const sync = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    };
    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (status === "running") {
      if (!loopRef.current || loopRef.current.world.tick === 0) {
        initRun();
      }
      startLoop();
    } else if (status === "paused") {
      const loop = loopRef.current;
      if (loop?.rafId !== null && loop) {
        cancelAnimationFrame(loop.rafId!);
        loop.rafId = null;
      }
    } else if (status === "idle") {
      resetToIdle();
    }
  }, [status, initRun, startLoop, resetToIdle]);

  useEffect(() => {
    const loop = loopRef.current;
    if (loop) {
      loop.config = config;
      loop.stepCfg = {
        movementMode: config.movementMode,
        stepPx: config.stepPx,
        turnProbability: config.turnProbability,
        turnAmount: config.turnAmount,
        chaosProbability: config.chaosMode ? config.chaosProbability : 0,
        flashDurationMs: config.flashDurationMs,
      };
    }
  }, [config]);

  const canvasClass = useMemo(
    () => "block h-full w-full touch-none select-none",
    [],
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 bg-background"
      aria-hidden
    >
      <canvas ref={canvasRef} className={canvasClass} />
    </div>
  );
}
