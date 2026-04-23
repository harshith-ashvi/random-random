"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSimStore } from "@/lib/store";

export function FloatingAnalytics() {
  const analyticsOpen = useSimStore((s) => s.analyticsOpen);
  const setAnalyticsOpen = useSimStore((s) => s.setAnalyticsOpen);
  const liveStats = useSimStore((s) => s.liveStats);
  const lastResult = useSimStore((s) => s.lastResult);

  return (
    <>
      <Button
        size="icon"
        variant="secondary"
        className="fixed bottom-4 right-4 z-40 shadow-md"
        onClick={() => setAnalyticsOpen(true)}
        aria-label="Open analytics"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>

      <Drawer open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Analytics</DrawerTitle>
            <DrawerDescription>
              Live stats and post-run statistical tests.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 text-sm text-muted-foreground">
            {liveStats ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Tick" value={liveStats.tick.toLocaleString()} />
                <Stat
                  label="Elapsed"
                  value={`${(liveStats.elapsedMs / 1000).toFixed(1)}s`}
                />
                <Stat label="Draws" value={liveStats.drawsTotal.toLocaleString()} />
                <Stat
                  label="Alive"
                  value={`${liveStats.counts.rock}🪨 / ${liveStats.counts.paper}📄 / ${liveStats.counts.scissors}✂️`}
                />
              </div>
            ) : (
              <p>No run data yet. Hit Start to begin.</p>
            )}
            {lastResult && (
              <div className="mt-4 rounded-md border p-3">
                <p className="font-medium text-foreground">
                  Last run: {lastResult.winner} in {(lastResult.durationMs / 1000).toFixed(1)}s
                </p>
                <p className="mt-1 text-xs">
                  {lastResult.tickCount} ticks • {lastResult.screenW}×{lastResult.screenH} •
                  {lastResult.drawsTotal.toLocaleString()} random draws
                </p>
              </div>
            )}
            <p className="mt-4 text-xs italic">
              Charts (stacked area, histograms, heatmap, chi-square / KS / entropy) arrive in the
              next pass.
            </p>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm tabular-nums text-foreground">{value}</div>
    </div>
  );
}
