"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimStore } from "@/lib/store";

export function FloatingAnalytics() {
  const setAnalyticsOpen = useSimStore((s) => s.setAnalyticsOpen);

  return (
    <Button
      size="icon"
      variant="secondary"
      className="fixed bottom-4 right-4 z-40 shadow-md"
      onClick={() => setAnalyticsOpen(true)}
      aria-label="Open analytics (a)"
      title="Analytics (a)"
    >
      <BarChart3 className="h-4 w-4" />
    </Button>
  );
}
