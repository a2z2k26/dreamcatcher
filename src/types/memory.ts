// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Memory Types
// Memories are knowledge artifacts extracted from conversations.
// ═══════════════════════════════════════════════════════════════

import type { GraphNode, GraphEdge } from './graph';

export type MemoryType = 'node' | 'path' | 'subgraph';

export interface Memory {
  readonly id: string;
  readonly name: string;
  readonly content: string;           // the text content of the memory
  readonly context: string;           // surrounding conversation context (summarized)
  readonly tags: readonly string[];
  readonly sourceNodeId: string;       // node this was saved from
  readonly sourcePathNodeIds: readonly string[]; // full path if saved as a clip
  readonly createdAt: number;
  readonly type: MemoryType;
  // Subgraph clip data — present when type === 'subgraph'
  readonly graphSnapshot?: {
    readonly nodes: readonly GraphNode[];
    readonly edges: readonly GraphEdge[];
  };
}
