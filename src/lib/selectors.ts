// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Zustand Selector Equality Functions
// Prevents unnecessary re-renders during streaming by comparing
// only content-relevant fields instead of reference equality.
// Source pattern: Clui CC's custom equality functions.
// ═══════════════════════════════════════════════════════════════

import type { GraphNode } from '@/types/graph';

// Compare nodes by content-relevant fields only
// Ignores position changes, which are handled imperatively by the canvas
export function nodeContentEqual(
  a: GraphNode | undefined | null,
  b: GraphNode | undefined | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.label === b.label &&
    a.type === b.type &&
    a.metadata === b.metadata
  );
}

// Compare arrays of nodes by IDs only (for list-level checks)
export function nodeListIdsEqual(
  a: readonly GraphNode[],
  b: readonly GraphNode[]
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}
