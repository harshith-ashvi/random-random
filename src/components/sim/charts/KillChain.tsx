"use client";

import type { TransformEvent } from "@/components/sim/engine";
import type { EntityType } from "@/lib/supabase/types";

const EMOJI: Record<EntityType, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

type Props = {
  transformLog: TransformEvent[];
  survivors: { id: number; type: EntityType }[];
  winnerType: EntityType | null;
};

type ChainNode = {
  id: number;
  type: EntityType;
  atMs: number;
  victims: ChainNode[];
};

function buildChain(
  rootId: number,
  rootType: EntityType,
  log: TransformEvent[],
): ChainNode {
  const byWinner = new Map<number, TransformEvent[]>();
  for (const evt of log) {
    const arr = byWinner.get(evt.winnerId) ?? [];
    arr.push(evt);
    byWinner.set(evt.winnerId, arr);
  }

  const seen = new Set<number>();
  const build = (id: number, type: EntityType, atMs: number): ChainNode => {
    seen.add(id);
    const events = (byWinner.get(id) ?? []).filter(
      (e) => e.atMs >= atMs && !seen.has(e.loserId),
    );
    return {
      id,
      type,
      atMs,
      victims: events.map((e) => build(e.loserId, e.newType, e.atMs)),
    };
  };

  return build(rootId, rootType, 0);
}

function countNodes(n: ChainNode): number {
  return 1 + n.victims.reduce((s, v) => s + countNodes(v), 0);
}

function NodeRow({ node, depth }: { node: ChainNode; depth: number }) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{ paddingLeft: depth * 14 }}
      >
        <span className="text-base leading-none">{EMOJI[node.type]}</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          #{node.id}
        </span>
        {node.atMs > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            @ {(node.atMs / 1000).toFixed(2)}s
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">
          ({node.victims.length} converted)
        </span>
      </div>
      {node.victims.map((v) => (
        <NodeRow key={v.id} node={v} depth={depth + 1} />
      ))}
    </div>
  );
}

export function KillChain({ transformLog, survivors, winnerType }: Props) {
  if (!winnerType || survivors.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        No surviving lineage yet — finish a run to see the kill chain.
      </div>
    );
  }

  const root = survivors.find((s) => s.type === winnerType) ?? survivors[0]!;
  const tree = buildChain(root.id, root.type, transformLog);
  const total = countNodes(tree);

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground">
        Lineage of survivor #{root.id} — {total} entit{total === 1 ? "y" : "ies"} in chain.
        Each row is a conversion that descended from the survivor (transitively).
      </div>
      <div className="max-h-[280px] overflow-y-auto rounded-md border bg-muted/30 p-2">
        <NodeRow node={tree} depth={0} />
      </div>
    </div>
  );
}
