import type { EntityType } from "@/lib/supabase/types";

export type Entity = {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  angle: number;
  flashUntil: number;
  transformedBy: number | null;
};

export const ENTITY_RADIUS = 14;
