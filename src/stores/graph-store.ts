// ═══════════════════════════════════════════════════════════════
// Dreamcacher — Graph Store (Zustand)
// Immutable state updates. Nodes and edges are the source of truth.
// Physics bodies are mutable (performance) but derived from nodes.
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { GraphNode, GraphEdge, EdgeType, NodePosition, PhysicsBody } from '@/types/graph';

const NODE_R_USER = 24;   // was 18 — scaled up for material visibility
const NODE_R_AI = 28;     // was 22 — AI nodes slightly larger
const CLEANUP_COLUMN_GAP = 192;
const CLEANUP_ROW_GAP = 108;
const CLEANUP_BOUNDS_PAD = 36;

export interface LayoutBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
}

function nodeRadius(node: GraphNode, body?: PhysicsBody): number {
  return body?.r ?? (node.role === 'user' ? NODE_R_USER : NODE_R_AI);
}

function byTimeline(a: GraphNode, b: GraphNode): number {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
  return a.id.localeCompare(b.id);
}

function getCleanupLayout(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  bodies: Record<string, PhysicsBody>
): { positions: Record<string, NodePosition>; bounds: LayoutBounds } | null {
  if (nodes.length === 0) return null;

  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const edge of edges) {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) continue;
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }

  for (const node of nodes) {
    if (!node.parentId || !nodeById.has(node.parentId)) continue;
    const children = outgoing.get(node.parentId) ?? [];
    if (children.includes(node.id)) continue;
    incoming.set(node.id, (incoming.get(node.id) ?? 0) + 1);
    outgoing.set(node.parentId, [...children, node.id]);
  }

  for (const [parentId, childIds] of outgoing) {
    outgoing.set(
      parentId,
      [...childIds].sort((a, b) => byTimeline(nodeById.get(a)!, nodeById.get(b)!))
    );
  }

  const roots = nodes
    .filter(node => !incoming.has(node.id) || !node.parentId || !nodeById.has(node.parentId))
    .sort(byTimeline);
  const queue = roots.length > 0 ? roots.map(node => node.id) : [nodes.slice().sort(byTimeline)[0].id];
  const depthById = new Map<string, number>();

  for (const rootId of queue) depthById.set(rootId, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const depth = depthById.get(id) ?? 0;
    for (const childId of outgoing.get(id) ?? []) {
      const nextDepth = depth + 1;
      const previousDepth = depthById.get(childId);
      if (previousDepth !== undefined && previousDepth <= nextDepth) continue;
      depthById.set(childId, nextDepth);
      queue.push(childId);
    }
  }

  let fallbackDepth = Math.max(0, ...depthById.values());
  for (const node of nodes.slice().sort(byTimeline)) {
    if (depthById.has(node.id)) continue;
    const parentDepth = node.parentId ? depthById.get(node.parentId) : undefined;
    if (parentDepth !== undefined) {
      depthById.set(node.id, parentDepth + 1);
      fallbackDepth = Math.max(fallbackDepth, parentDepth + 1);
    } else {
      fallbackDepth += 1;
      depthById.set(node.id, fallbackDepth);
    }
  }

  const maxDepth = Math.max(0, ...depthById.values());
  const columns = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const depth = depthById.get(node.id) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), node]);
  }

  const positions: Record<string, NodePosition> = {};
  for (const [depth, columnNodes] of columns) {
    const ordered = columnNodes.slice().sort(byTimeline);
    const columnCenter = (ordered.length - 1) / 2;
    for (let index = 0; index < ordered.length; index += 1) {
      const node = ordered[index];
      positions[node.id] = {
        x: (depth - maxDepth / 2) * CLEANUP_COLUMN_GAP,
        y: (index - columnCenter) * CLEANUP_ROW_GAP,
      };
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const position = positions[node.id];
    const radius = nodeRadius(node, bodies[node.id]) + CLEANUP_BOUNDS_PAD;
    minX = Math.min(minX, position.x - radius);
    minY = Math.min(minY, position.y - radius);
    maxX = Math.max(maxX, position.x + radius);
    maxY = Math.max(maxY, position.y + radius);
  }

  return {
    positions,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    },
  };
}

interface GraphState {
  // Data
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  positions: Record<string, NodePosition>;
  bodies: Record<string, PhysicsBody>;

  // Active conversation
  activeNodeId: string | null; // the node we're currently talking "at"

  // Actions
  addNode: (node: GraphNode, position: NodePosition) => void;
  addEdge: (edge: GraphEdge) => void;
  updateNodeText: (id: string, text: string) => void;
  updateNodeMetadata: (id: string, metadata: Partial<GraphNode['metadata']>) => void;
  setActiveNode: (id: string | null) => void;
  updatePosition: (id: string, pos: NodePosition) => void;
  getAncestralPath: (nodeId: string) => readonly GraphNode[];
  getChildCount: (nodeId: string) => number;
  getChildren: (nodeId: string) => readonly GraphEdge[];
  getBranchPaths: (nodeId: string) => Record<string, readonly string[]>;
  getBranchLeaves: (nodeId: string) => readonly string[];
  getSubgraph: (nodeIds: ReadonlySet<string>) => { nodes: readonly GraphNode[]; edges: readonly GraphEdge[] };
  getDeadEndBranches: () => ReadonlySet<string>;
  cleanupLayout: () => LayoutBounds | null;
  clearGraph: () => void;
  loadGraph: (nodes: readonly GraphNode[], edges: readonly GraphEdge[], positions: Record<string, NodePosition>, activeNodeId: string | null) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  positions: {},
  bodies: {},
  activeNodeId: null,

  addNode: (node, position) => {
    const r = node.role === 'user' ? NODE_R_USER : NODE_R_AI;
    const body: PhysicsBody = {
      x: position.x, y: position.y,
      vx: 0, vy: 0, ax: 0, ay: 0,
      fx: undefined, fy: undefined,
      hx: 0, hy: 0, r,
    };
    set(state => ({
      nodes: [...state.nodes, node],
      positions: { ...state.positions, [node.id]: position },
      bodies: { ...state.bodies, [node.id]: body },
    }));
  },

  addEdge: (edge) => {
    set(state => ({
      edges: [...state.edges, edge],
    }));
  },

  updateNodeText: (id, text) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, text, label: text.slice(0, 30) } : n),
    }));
  },

  updateNodeMetadata: (id, metadata) => {
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === id ? { ...n, metadata: { ...n.metadata, ...metadata } } : n
      ),
    }));
  },

  setActiveNode: (id) => set({ activeNodeId: id }),

  updatePosition: (id, pos) => {
    set(state => ({
      positions: { ...state.positions, [id]: pos },
    }));
  },

  // Walk the graph from root to the given node — this builds the
  // conversation context for the Claude API call
  getAncestralPath: (nodeId) => {
    const { nodes } = get();
    const path: GraphNode[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node = nodes.find(n => n.id === currentId);
      if (!node) break;
      path.unshift(node);
      currentId = node.parentId;
    }

    return path;
  },

  getChildCount: (nodeId) => {
    return get().edges.filter(e => e.from === nodeId).length;
  },

  getChildren: (nodeId) => {
    return get().edges.filter(e => e.from === nodeId);
  },

  // Returns a map of branchLeafId → ordered node IDs from branchPoint to leaf
  getBranchPaths: (nodeId) => {
    const { edges } = get();
    const childEdges = edges.filter(e => e.from === nodeId);
    const paths: Record<string, readonly string[]> = {};

    for (const edge of childEdges) {
      const path: string[] = [edge.to];
      let currentId = edge.to;
      // Walk down to the leaf
      while (true) {
        const next = edges.find(e => e.from === currentId);
        if (!next) break;
        path.push(next.to);
        currentId = next.to;
      }
      paths[currentId] = path; // keyed by leaf ID
    }
    return paths;
  },

  // Returns leaf node IDs for each branch from a branch point
  getBranchLeaves: (nodeId) => {
    const paths = get().getBranchPaths(nodeId);
    return Object.keys(paths);
  },

  // Extract a subgraph containing only the specified nodes and their internal edges
  getSubgraph: (nodeIds) => {
    const { nodes, edges } = get();
    const subNodes = nodes.filter(n => nodeIds.has(n.id));
    const subEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
    return { nodes: subNodes, edges: subEdges };
  },

  // Find all nodes on dead-end branches (leaf with no activity > 5 min)
  getDeadEndBranches: () => {
    const { nodes, edges } = get();
    const now = Date.now();
    const STALE_MS = 5 * 60 * 1000;
    const deadNodes = new Set<string>();

    // Find all node IDs that are parents (have outgoing edges)
    const parents = new Set(edges.map(e => e.from));
    // Leaves are nodes that are not parents
    const leaves = nodes.filter(n => !parents.has(n.id));

    for (const leaf of leaves) {
      if (now - leaf.timestamp < STALE_MS) continue;
      // Walk up to the nearest branch point (node with >1 child)
      let currentId: string | null = leaf.id;
      const branchNodes: string[] = [];
      while (currentId) {
        branchNodes.push(currentId);
        const node = nodes.find(n => n.id === currentId);
        if (!node || !node.parentId) break;
        const parentChildCount = edges.filter(e => e.from === node.parentId).length;
        if (parentChildCount > 1) break; // stop at branch point, don't include it
        currentId = node.parentId;
      }
      for (const id of branchNodes) deadNodes.add(id);
    }
    return deadNodes;
  },

  cleanupLayout: () => {
    const { nodes, edges, bodies } = get();
    const layout = getCleanupLayout(nodes, edges, bodies);
    if (!layout) return null;

    const nextBodies: Record<string, PhysicsBody> = {};
    for (const node of nodes) {
      const previous = bodies[node.id];
      const position = layout.positions[node.id];
      nextBodies[node.id] = {
        x: position.x,
        y: position.y,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        fx: position.x,
        fy: position.y,
        hx: 0,
        hy: 0,
        r: nodeRadius(node, previous),
      };
    }

    set({ positions: layout.positions, bodies: nextBodies });
    return layout.bounds;
  },

  clearGraph: () => {
    set({ nodes: [], edges: [], positions: {}, bodies: {}, activeNodeId: null });
  },

  loadGraph: (nodes, edges, positions, activeNodeId) => {
    // Migrate legacy edges: 'main' → 'reply', add weight if missing
    const migratedEdges: GraphEdge[] = edges.map(e => {
      const type: EdgeType = (e.type as string) === 'main' ? 'reply' : e.type;
      const weight = 'weight' in e ? e.weight : 1;
      return { ...e, type, weight };
    });

    // Rebuild physics bodies from positions
    const bodies: Record<string, PhysicsBody> = {};
    for (const node of nodes) {
      const pos = positions[node.id] || { x: 400, y: 400 };
      const r = node.role === 'user' ? NODE_R_USER : NODE_R_AI;
      bodies[node.id] = {
        x: pos.x, y: pos.y,
        vx: 0, vy: 0, ax: 0, ay: 0,
        fx: undefined, fy: undefined,
        hx: 0, hy: 0, r,
      };
    }
    set({ nodes, edges: migratedEdges, positions, bodies, activeNodeId });
  },
}));
