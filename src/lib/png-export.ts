"use client";

import type { RunSummary } from "@/lib/store";

const WINNER_EMOJI: Record<string, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
  timeout: "⏱️",
};

export async function exportRunPng(
  result: RunSummary,
  frameDataUrl: string | null,
): Promise<Blob | null> {
  const W = result.screenW;
  const H = result.screenH;
  const PANEL_H = 140;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H + PANEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (frameDataUrl) {
    const img = await loadImage(frameDataUrl);
    ctx.drawImage(img, 0, 0, W, H);
  }

  ctx.fillStyle = "#111";
  ctx.fillRect(0, H, W, PANEL_H);
  ctx.fillStyle = "#262626";
  ctx.fillRect(0, H, W, 1);

  ctx.fillStyle = "#fafafa";
  ctx.font = "600 28px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";
  const winnerLabel =
    result.winner === "timeout"
      ? "Timeout"
      : `${WINNER_EMOJI[result.winner]} ${result.winner.toUpperCase()} wins`;
  ctx.fillText(winnerLabel, 24, H + 18);

  ctx.font = "400 14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#a3a3a3";
  ctx.fillText(
    `${(result.durationMs / 1000).toFixed(1)}s • ${result.tickCount.toLocaleString()} ticks • ${result.config.prng}${
      result.config.prng === "mulberry32" && result.config.seed != null
        ? ` (seed ${result.config.seed})`
        : ""
    }`,
    24,
    H + 56,
  );

  const tiles: Array<[string, string]> = [
    ["χ² p", result.chiSquareP == null ? "—" : result.chiSquareP.toFixed(3)],
    ["KS p", result.ksP == null ? "—" : result.ksP.toFixed(3)],
    [
      "Dir entropy",
      result.directionEntropyBits == null
        ? "—"
        : `${result.directionEntropyBits.toFixed(3)} bits`,
    ],
    ["Draws", result.drawsTotal.toLocaleString()],
    ["Min pop", String(result.minPopulationOfWinner)],
  ];

  const tileX0 = 24;
  const tileY = H + 90;
  const tileW = (W - tileX0 * 2) / tiles.length;
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  tiles.forEach(([label, value], i) => {
    const x = tileX0 + i * tileW;
    ctx.fillStyle = "#737373";
    ctx.fillText(label, x, tileY);
    ctx.fillStyle = "#fafafa";
    ctx.font = "600 16px system-ui, -apple-system, sans-serif";
    ctx.fillText(value, x, tileY + 16);
    ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  });

  ctx.fillStyle = "#525252";
  ctx.font = "400 10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("random-random • RPS randomness lab", W - 24, H + PANEL_H - 18);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
