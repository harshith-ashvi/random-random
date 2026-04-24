"use client";

import { Play, Pause, RotateCcw, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSimStore } from "@/lib/store";
// import { BatchRunner } from "./BatchRunner";
import type {
  EntityType,
  MovementMode,
  Placement,
  PrngKind,
} from "@/lib/supabase/types";

const SPEEDS: Array<0.5 | 1 | 2 | 4> = [0.5, 1, 2, 4];

export function FloatingControls() {
  const config = useSimStore((s) => s.config);
  const setConfig = useSimStore((s) => s.setConfig);
  const status = useSimStore((s) => s.status);
  const setStatus = useSimStore((s) => s.setStatus);
  const controlsOpen = useSimStore((s) => s.controlsOpen);
  const setControlsOpen = useSimStore((s) => s.setControlsOpen);

  const isRunning = status === "running";
  const isPaused = status === "paused";
  const canEdit = status === "idle" || status === "ended";

  const onStart = () => {
    if (status === "running") {
      setStatus("paused");
    } else if (status === "paused") {
      setStatus("running");
    } else {
      setStatus("idle");
      queueMicrotask(() => setStatus("running"));
    }
  };

  const onReset = () => {
    setStatus("idle");
  };

  if (!controlsOpen) {
    return (
      <Button
        size="icon"
        variant="secondary"
        className="fixed bottom-4 left-4 z-40 shadow-md"
        onClick={() => setControlsOpen(true)}
        aria-label="Open controls"
      >
        <Settings2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-40 w-[320px] max-h-[85vh] overflow-y-auto shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-sm font-semibold">Controls</CardTitle>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setControlsOpen(false)}
          aria-label="Close controls"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={onStart}
            variant={isRunning ? "secondary" : "default"}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {isPaused ? "Resume" : "Start"}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onReset} aria-label="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Entities per type</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {config.countPerType}
            </span>
          </div>
          <Slider
            min={10}
            max={20}
            step={1}
            disabled={!canEdit}
            value={[config.countPerType]}
            onValueChange={([v]) => setConfig({ countPerType: v })}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Step (px/tick)</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {config.stepPx.toFixed(1)}
            </span>
          </div>
          <Slider
            min={1}
            max={8}
            step={0.5}
            value={[config.stepPx]}
            onValueChange={([v]) => setConfig({ stepPx: v })}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Speed</Label>
          <div className="flex gap-1.5">
            {SPEEDS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={config.speed === s ? "default" : "outline"}
                className="flex-1 h-8 text-xs"
                onClick={() => setConfig({ speed: s })}
              >
                {s}×
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Movement</Label>
          <Select
            value={config.movementMode}
            onValueChange={(v) =>
              setConfig({ movementMode: v as MovementMode })
            }
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jitter">Jitter (random every tick)</SelectItem>
              <SelectItem value="persistent">
                Persistent (small turns)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Placement</Label>
          <Select
            value={config.placement}
            onValueChange={(v) => setConfig({ placement: v as Placement })}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random</SelectItem>
              <SelectItem value="grouped">Grouped by corner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">PRNG</Label>
          <Select
            value={config.prng}
            onValueChange={(v) => setConfig({ prng: v as PrngKind })}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="math-random">Math.random</SelectItem>
              <SelectItem value="crypto-random">
                crypto.getRandomValues
              </SelectItem>
              <SelectItem value="mulberry32">Mulberry32 (seeded)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.prng === "mulberry32" && (
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="seed">
              Seed
            </Label>
            <Input
              id="seed"
              type="number"
              placeholder="Date.now()"
              disabled={!canEdit}
              value={config.seed ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                setConfig({ seed: raw === "" ? null : Number(raw) });
              }}
              className="h-8 text-xs"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label className="text-xs" htmlFor="chaos">
            Chaos mode
          </Label>
          <Switch
            id="chaos"
            checked={config.chaosMode}
            onCheckedChange={(v) => setConfig({ chaosMode: v })}
          />
        </div>

        {config.chaosMode && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Chaos probability</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {(config.chaosProbability * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              min={0}
              max={0.5}
              step={0.05}
              value={[config.chaosProbability]}
              onValueChange={([v]) => setConfig({ chaosProbability: v })}
            />
          </div>
        )}

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">Predict the winner</Label>
          <div className="flex gap-1.5">
            {(["rock", "paper", "scissors"] as EntityType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={config.predictedWinner === t ? "default" : "outline"}
                className="flex-1 h-8 text-base"
                onClick={() =>
                  setConfig({
                    predictedWinner: config.predictedWinner === t ? null : t,
                  })
                }
                disabled={!canEdit}
                aria-label={`Predict ${t}`}
              >
                {t === "rock" ? "🪨" : t === "paper" ? "📄" : "✂️"}
              </Button>
            ))}
          </div>
        </div>

        {/* <Separator />

        <BatchRunner /> */}
      </CardContent>
    </Card>
  );
}
