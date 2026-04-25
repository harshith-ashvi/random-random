"use client";

import type { EntityType, Winner } from "@/lib/supabase/types";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lastClickAtMs = 0;

const CLICK_THROTTLE_MS = 25;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {});
  }
}

const TYPE_FREQ: Record<EntityType, number> = {
  rock: 180,
  paper: 320,
  scissors: 520,
};

export function playClick(toType: EntityType): void {
  const c = ensureCtx();
  if (!c || !master) return;
  const now = performance.now();
  if (now - lastClickAtMs < CLICK_THROTTLE_MS) return;
  lastClickAtMs = now;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(TYPE_FREQ[toType], t0);
  osc.frequency.exponentialRampToValueAtTime(TYPE_FREQ[toType] * 0.6, t0 + 0.06);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.1);
}

const FANFARE: Record<Winner, number[]> = {
  rock: [196, 246.94, 293.66, 392],
  paper: [261.63, 329.63, 392, 523.25],
  scissors: [349.23, 440, 523.25, 698.46],
  timeout: [220, 207.65, 196, 185],
};

export function playFanfare(winner: Winner): void {
  const c = ensureCtx();
  if (!c || !master) return;
  const notes = FANFARE[winner];
  const t0 = c.currentTime + 0.02;
  const noteDur = winner === "timeout" ? 0.18 : 0.14;

  notes.forEach((freq, i) => {
    const start = t0 + i * noteDur;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.55, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + noteDur);
    osc.connect(gain).connect(master!);
    osc.start(start);
    osc.stop(start + noteDur + 0.02);
  });

  if (winner !== "timeout") {
    const chordStart = t0 + notes.length * noteDur;
    notes.forEach((freq) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, chordStart);
      gain.gain.setValueAtTime(0.0001, chordStart);
      gain.gain.exponentialRampToValueAtTime(0.35, chordStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.5);
      osc.connect(gain).connect(master!);
      osc.start(chordStart);
      osc.stop(chordStart + 0.55);
    });
  }
}
