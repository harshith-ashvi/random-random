"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSimStore } from "@/lib/store";

export function FloatingAbout() {
  const aboutOpen = useSimStore((s) => s.aboutOpen);
  const setAboutOpen = useSimStore((s) => s.setAboutOpen);

  return (
    <>
      <Button
        size="icon"
        variant="secondary"
        className="fixed top-4 right-4 z-40 shadow-md"
        onClick={() => setAboutOpen(true)}
        aria-label="About"
      >
        <Info className="h-4 w-4" />
      </Button>

      <Sheet open={aboutOpen} onOpenChange={setAboutOpen}>
        <SheetContent side="right" className="w-[380px] sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Random Random</SheetTitle>
            <SheetDescription>
              How random is <code>Math.random</code>, really?
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-4 text-sm leading-6">
            <section>
              <h3 className="mb-1 font-semibold text-foreground">The game</h3>
              <p className="text-muted-foreground">
                Rock-paper-scissors entities roam a canvas. On contact the loser transforms into
                the winner. The run ends when one type dominates — or 15 minutes pass.
              </p>
            </section>

            <section>
              <h3 className="mb-1 font-semibold text-foreground">The point</h3>
              <p className="text-muted-foreground">
                Every movement draws a random number. Swap the PRNG (Math.random vs
                crypto.getRandomValues vs seeded Mulberry32) and watch whether the stream passes
                real statistical tests.
              </p>
            </section>

            <section>
              <h3 className="mb-1 font-semibold text-foreground">The tests</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Chi-square</strong> — are the 20 buckets of
                  [0,1) draws evenly populated? Low p-value = suspicious.
                </li>
                <li>
                  <strong className="text-foreground">KS</strong> — biggest gap between the
                  empirical CDF and a true uniform.
                </li>
                <li>
                  <strong className="text-foreground">Direction entropy</strong> — Shannon
                  entropy over 16 angular buckets. Max is 4.0 bits (perfect uniform).
                </li>
              </ul>
            </section>

            <section>
              <h3 className="mb-1 font-semibold text-foreground">Shortcuts</h3>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <kbd className="rounded border px-1 text-xs">space</kbd> pause / resume
                </li>
                <li>
                  <kbd className="rounded border px-1 text-xs">r</kbd> reset
                </li>
                <li>
                  <kbd className="rounded border px-1 text-xs">a</kbd> analytics
                </li>
                <li>
                  <kbd className="rounded border px-1 text-xs">h</kbd> hide all UI
                </li>
              </ul>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
