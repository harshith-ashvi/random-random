"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimStore } from "@/lib/store";

export function FloatingToggle() {
  const uiHidden = useSimStore((s) => s.uiHidden);
  const toggleUi = useSimStore((s) => s.toggleUi);

  return (
    <Button
      size="icon"
      variant="secondary"
      className="fixed top-4 left-4 z-50 shadow-md"
      onClick={toggleUi}
      aria-label={uiHidden ? "Show UI" : "Hide UI"}
      title={uiHidden ? "Show UI (h)" : "Hide UI (h)"}
    >
      {uiHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  );
}
