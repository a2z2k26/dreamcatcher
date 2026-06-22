// ═══════════════════════════════════════════════════════════════
// Dreamcatcher — Graph Data Types
// ═══════════════════════════════════════════════════════════════

export type NodeRole = 'user' | 'ai';

export type NodeType =
  | 'message'      // standard conversation node
  | 'clip'         // imported memory from another session
  | 'summary'      // compressed branch representation
  | 'decision'     // explicit decision point (user-marked choice)
  | 'inherited';   // node imported via clip spawn

export interface ThinkingStep {
  readonly label: string;   // "Considered", "Rejected", "Decided"
  readonly content: string;
}

export interface ToolCall {
  readonly name: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output?: string;
  readonly duration?: number;
}

export interface GraphNode {
  readonly id: string;
  readonly role: NodeRole;
  readonly type: NodeType;
  readonly text: string;
  readonly label: string;       // short display label for LOD
  readonly parentId: string | null;
  readonly timestamp: number;
  readonly isInherited?: boolean; // true if imported via clip spawn
  readonly metadata: {
    readonly model?: string;
    readonly tokens?: number;
    readonly latency?: number;
    readonly thinking?: readonly ThinkingStep[];
    readonly toolCalls?: readonly ToolCall[];
    readonly userMessage?: string;     // original user prompt (for retry)
    readonly userNodeId?: string;      // the user node that triggered this AI response
  };
}

export type EdgeType =
  | 'reply'        // direct response in conversation flow
  | 'branch'       // divergence from a branch point
  | 'regeneration' // alternative response to same prompt
  | 'summarizes'   // summary node compresses a subgraph
  | 'clips_to'     // node belongs to a saved clip
  | 'references';  // node cites content from another node

export interface GraphEdge {
  readonly id: string;
  readonly from: string;       // parent node id
  readonly to: string;         // child node id
  readonly type: EdgeType;
  readonly weight: number;     // 0-1, strength of relationship
  readonly label?: string;     // optional description
}

export interface NodePosition {
  x: number;
  y: number;
}

// Physics body — mutable for simulation performance
export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  fx: number | undefined;  // fixed position (drag pin)
  fy: number | undefined;
  hx: number;              // drag handle offset
  hy: number;
  r: number;               // visual radius
}

export interface GraphDocument {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly positions: Record<string, NodePosition>;
}
