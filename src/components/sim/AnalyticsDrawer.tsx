"use client";

import { X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSimStore } from "@/lib/store";
import { ThisRunTab } from "./analytics/ThisRun";
import { HistoryTab } from "./analytics/History";
import { LeaderboardTab } from "./analytics/Leaderboard";
import { AggregateTab } from "./analytics/Aggregate";

export function AnalyticsDrawer() {
  const analyticsOpen = useSimStore((s) => s.analyticsOpen);
  const setAnalyticsOpen = useSimStore((s) => s.setAnalyticsOpen);

  return (
    <Drawer open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative pb-2">
          <DrawerTitle>Analytics</DrawerTitle>
          <DrawerDescription>
            Live stats + post-run randomness tests. How random is random?
          </DrawerDescription>
          <DrawerClose asChild>
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-3 top-3 h-8 w-8"
              aria-label="Close analytics"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <Tabs defaultValue="this-run" className="w-full">
            <TabsList className="grid w-full max-w-xl grid-cols-4">
              <TabsTrigger value="this-run">This Run</TabsTrigger>
              <TabsTrigger value="aggregate">All Runs</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>
            <TabsContent value="this-run" className="mt-3">
              <ThisRunTab />
            </TabsContent>
            <TabsContent value="aggregate" className="mt-3">
              <AggregateTab />
            </TabsContent>
            <TabsContent value="history" className="mt-3">
              <HistoryTab />
            </TabsContent>
            <TabsContent value="leaderboard" className="mt-3">
              <LeaderboardTab />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
