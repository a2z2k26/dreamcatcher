import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGraphStore } from './graph-store';
import type { GraphNode, GraphEdge } from '@/types/graph';

function userNode(id: string, parentId: string | null = null, timestamp = 0): GraphNode {
  return {
    id, role: 'user', type: 'message', text: id, label: id,
    parentId, timestamp, metadata: {},
  };
}

function aiNode(id: string, parentId: string, timestamp = 0): GraphNode {
  return {
    id, role: 'ai', type: 'message', text: id, label: id,
    parentId, timestamp, metadata: {},
  };
}

function edge(id: string, from: string, to: string, type: GraphEdge['type'] = 'reply'): GraphEdge {
  return { id, from, to, type, weight: 1 };
}

beforeEach(() => {
  useGraphStore.getState().clearGraph();
});

describe('graph-store actions', () => {
  it('addNode creates a body with role-specific radius', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 10, y: 20 });
    store.addNode(aiNode('a1', 'u1'), { x: 30, y: 40 });

    const { nodes, bodies } = useGraphStore.getState();
    expect(nodes.map(n => n.id)).toEqual(['u1', 'a1']);
    expect(bodies.u1.r).toBe(24);  // NODE_R_USER
    expect(bodies.a1.r).toBe(28);  // NODE_R_AI
    expect(bodies.u1.x).toBe(10);
  });

  it('addEdge appends edges immutably', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    store.addNode(aiNode('a1', 'u1'), { x: 0, y: 0 });
    const before = useGraphStore.getState().edges;
    store.addEdge(edge('e1', 'u1', 'a1'));
    const after = useGraphStore.getState().edges;
    expect(after).not.toBe(before); // new array
    expect(after).toHaveLength(1);
  });

  it('updateNodeText replaces text and clamps label to 30 chars', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    const long = 'a'.repeat(100);
    store.updateNodeText('u1', long);
    const node = useGraphStore.getState().nodes[0];
    expect(node.text).toBe(long);
    expect(node.label).toHaveLength(30);
  });

  it('updateNodeMetadata merges, does not replace', () => {
    const store = useGraphStore.getState();
    store.addNode({ ...userNode('u1'), metadata: { model: 'm1' } }, { x: 0, y: 0 });
    store.updateNodeMetadata('u1', { tokens: 42 });
    const node = useGraphStore.getState().nodes[0];
    expect(node.metadata.model).toBe('m1');
    expect(node.metadata.tokens).toBe(42);
  });

  it('clearGraph wipes all data', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    store.addEdge(edge('e1', 'u1', 'u1'));
    store.setActiveNode('u1');
    store.clearGraph();
    const s = useGraphStore.getState();
    expect(s.nodes).toHaveLength(0);
    expect(s.edges).toHaveLength(0);
    expect(s.bodies).toEqual({});
    expect(s.activeNodeId).toBeNull();
  });
});

describe('getAncestralPath', () => {
  it('returns root → node ordering', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    store.addNode(aiNode('a1', 'u1'), { x: 0, y: 0 });
    store.addNode(userNode('u2', 'a1'), { x: 0, y: 0 });
    const path = useGraphStore.getState().getAncestralPath('u2');
    expect(path.map(n => n.id)).toEqual(['u1', 'a1', 'u2']);
  });

  it('handles single-node path', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    expect(useGraphStore.getState().getAncestralPath('u1').map(n => n.id)).toEqual(['u1']);
  });

  it('returns empty path for unknown node', () => {
    expect(useGraphStore.getState().getAncestralPath('nope')).toEqual([]);
  });
});

describe('branch helpers', () => {
  // u1 → a1 → u2 → a2 (leaf-A)
  //       └→ u3 → a3 (leaf-B)
  function setupBranchedGraph() {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    store.addNode(aiNode('a1', 'u1'), { x: 0, y: 0 });
    store.addNode(userNode('u2', 'a1'), { x: 0, y: 0 });
    store.addNode(aiNode('a2', 'u2'), { x: 0, y: 0 });
    store.addNode(userNode('u3', 'a1'), { x: 0, y: 0 });
    store.addNode(aiNode('a3', 'u3'), { x: 0, y: 0 });
    store.addEdge(edge('e1', 'u1', 'a1'));
    store.addEdge(edge('e2', 'a1', 'u2'));
    store.addEdge(edge('e3', 'u2', 'a2'));
    store.addEdge(edge('e4', 'a1', 'u3', 'branch'));
    store.addEdge(edge('e5', 'u3', 'a3'));
  }

  it('getChildCount counts outgoing edges', () => {
    setupBranchedGraph();
    const s = useGraphStore.getState();
    expect(s.getChildCount('a1')).toBe(2); // u2 and u3
    expect(s.getChildCount('u1')).toBe(1);
    expect(s.getChildCount('a3')).toBe(0);
  });

  it('getBranchPaths returns leaf-keyed paths from branch point', () => {
    setupBranchedGraph();
    const paths = useGraphStore.getState().getBranchPaths('a1');
    expect(Object.keys(paths).sort()).toEqual(['a2', 'a3']);
    expect(paths.a2).toEqual(['u2', 'a2']);
    expect(paths.a3).toEqual(['u3', 'a3']);
  });

  it('getBranchLeaves returns leaf ids', () => {
    setupBranchedGraph();
    const leaves = useGraphStore.getState().getBranchLeaves('a1');
    expect([...leaves].sort()).toEqual(['a2', 'a3']);
  });

  it('getBranchPaths returns empty when node has no children', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    expect(useGraphStore.getState().getBranchPaths('u1')).toEqual({});
  });
});

describe('getSubgraph', () => {
  it('returns nodes and only internal edges', () => {
    const store = useGraphStore.getState();
    store.addNode(userNode('u1'), { x: 0, y: 0 });
    store.addNode(aiNode('a1', 'u1'), { x: 0, y: 0 });
    store.addNode(userNode('u2', 'a1'), { x: 0, y: 0 });
    store.addEdge(edge('e1', 'u1', 'a1'));
    store.addEdge(edge('e2', 'a1', 'u2')); // crosses subgraph boundary

    const sub = useGraphStore.getState().getSubgraph(new Set(['u1', 'a1']));
    expect(sub.nodes.map(n => n.id).sort()).toEqual(['a1', 'u1']);
    expect(sub.edges.map(e => e.id)).toEqual(['e1']);
  });
});

describe('getDeadEndBranches', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T01:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks stale leaves but stops at branch points', () => {
    const NOW = Date.now();
    const STALE = NOW - 10 * 60 * 1000; // 10 min ago
    const FRESH = NOW - 1000;            // 1s ago
    const store = useGraphStore.getState();
    // Branch point a1 with two children u2 (fresh leaf) and u3 (stale leaf chain)
    store.addNode(userNode('u1', null, NOW), { x: 0, y: 0 });
    store.addNode(aiNode('a1', 'u1', NOW), { x: 0, y: 0 });
    store.addNode(userNode('u2', 'a1', FRESH), { x: 0, y: 0 });
    store.addNode(userNode('u3', 'a1', STALE), { x: 0, y: 0 });
    store.addNode(aiNode('a3', 'u3', STALE), { x: 0, y: 0 });
    store.addEdge(edge('e1', 'u1', 'a1'));
    store.addEdge(edge('e2', 'a1', 'u2'));
    store.addEdge(edge('e3', 'a1', 'u3', 'branch'));
    store.addEdge(edge('e4', 'u3', 'a3'));

    const dead = useGraphStore.getState().getDeadEndBranches();
    expect(dead.has('a3')).toBe(true);
    expect(dead.has('u3')).toBe(true);
    expect(dead.has('a1')).toBe(false); // branch point not included
    expect(dead.has('u2')).toBe(false); // fresh leaf
    expect(dead.has('u1')).toBe(false); // upstream of branch point
  });

  it('returns empty when no leaves are stale', () => {
    const store = useGraphStore.getState();
    const fresh = Date.now() - 1000;
    store.addNode(userNode('u1', null, fresh), { x: 0, y: 0 });
    store.addNode(aiNode('a1', 'u1', fresh), { x: 0, y: 0 });
    store.addEdge(edge('e1', 'u1', 'a1'));
    expect(useGraphStore.getState().getDeadEndBranches().size).toBe(0);
  });
});

describe('loadGraph', () => {
  it('rebuilds bodies from positions with correct radii', () => {
    const store = useGraphStore.getState();
    const nodes = [userNode('u1'), aiNode('a1', 'u1')];
    const edges: GraphEdge[] = [edge('e1', 'u1', 'a1')];
    const positions = { u1: { x: 100, y: 200 }, a1: { x: 300, y: 400 } };
    store.loadGraph(nodes, edges, positions, 'a1');

    const s = useGraphStore.getState();
    expect(s.bodies.u1.x).toBe(100);
    expect(s.bodies.u1.r).toBe(24);
    expect(s.bodies.a1.r).toBe(28);
    expect(s.activeNodeId).toBe('a1');
  });

  it('falls back to default position when missing', () => {
    const store = useGraphStore.getState();
    store.loadGraph([userNode('u1')], [], {}, null);
    const body = useGraphStore.getState().bodies.u1;
    expect(body.x).toBe(400);
    expect(body.y).toBe(400);
  });

  it('migrates legacy edge type "main" to "reply"', () => {
    const store = useGraphStore.getState();
    // Cast to bypass the EdgeType compile-time guard for legacy data
    const legacy = { id: 'e1', from: 'u1', to: 'a1', type: 'main' as unknown as GraphEdge['type'], weight: 1 };
    store.loadGraph([userNode('u1'), aiNode('a1', 'u1')], [legacy], {}, null);
    expect(useGraphStore.getState().edges[0].type).toBe('reply');
  });
});
