import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSVG, type RenderContext } from './render';
import { useGraphStore } from '@/stores/graph-store';
import { useUIStore } from '@/stores/ui-store';
import { createEffects } from '@/lib/effects';

// Lightweight stand-in — render only writes to .innerHTML and reads no
// other DOM properties from the SVG element.
class FakeSVG {
  innerHTML = '';
}

class FakeContainer {
  clientWidth = 1024;
  clientHeight = 768;
}

function makeCtx(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    svg: new FakeSVG() as unknown as SVGSVGElement,
    container: new FakeContainer() as unknown as HTMLDivElement,
    selDash: 0,
    time: 0,
    deadEnds: new Set(),
    edgeCreatedAt: new Map(),
    effects: createEffects(),
    ...overrides,
  };
}

function setNodes(nodes: unknown[], edges: unknown[] = []) {
  useGraphStore.setState({
    // @ts-expect-error — bypass strict typing in tests for fixture brevity
    nodes,
    // @ts-expect-error - test fixture edges are intentionally loose
    edges,
    bodies: Object.fromEntries(
      // @ts-expect-error - test fixture nodes are intentionally loose
      nodes.map(n => [n.id, { x: 100, y: 100, vx: 0, vy: 0, ax: 0, ay: 0, fx: undefined, fy: undefined, hx: 0, hy: 0, r: 24 }]),
    ),
  });
}

beforeEach(() => {
  useGraphStore.getState().clearGraph();
  useUIStore.setState({
    scale: 1,
    panX: 0,
    panY: 0,
    selectedNodeId: null,
    selectedNodeIds: new Set(),
    hoveredNodeId: null,
    highlightMode: null,
    pathTrace: null,
    searchQuery: '',
    searchResults: [],
  });
});

describe('renderSVG', () => {
  it('is a no-op when svg ref is null', () => {
    const ctx = makeCtx({ svg: null });
    expect(() => renderSVG(ctx)).not.toThrow();
  });

  it('always emits a <defs> block with required gradient ids', () => {
    const ctx = makeCtx();
    renderSVG(ctx);
    const html = (ctx.svg as unknown as FakeSVG).innerHTML;
    expect(html).toContain('<defs>');
    expect(html).toContain('id="node-user-fill"');
    expect(html).toContain('id="node-ai-fill"');
    expect(html).toContain('id="glow-select-halo"');
    expect(html).toContain('</defs>');
  });

  it('shows the empty-state monogram when no nodes', () => {
    const ctx = makeCtx();
    renderSVG(ctx);
    const html = (ctx.svg as unknown as FakeSVG).innerHTML;
    expect(html).toContain('data-empty-state="dreamcatcher-seed"');
    expect(html).toContain('data-empty-seed-core="true"');
    expect(html).toContain('data-empty-seed-trace="true"');
    expect(html).toContain('data-empty-title="true"');
    expect(html).toContain('DREAMCATCHER');
    expect(html).not.toContain('Begin a thread');
    expect(html).not.toContain('a seed becomes a map');
  });

  it('renders nodes when graph has content', () => {
    setNodes(
      [
        { id: 'u1', role: 'user', type: 'message', text: 'hi', label: 'hi', parentId: null, timestamp: 0, metadata: {} },
        { id: 'a1', role: 'ai', type: 'message', text: 'hello', label: 'hello', parentId: 'u1', timestamp: 0, metadata: {} },
      ],
      [{ id: 'e1', from: 'u1', to: 'a1', type: 'reply', weight: 1 }],
    );
    const ctx = makeCtx();
    renderSVG(ctx);
    const html = (ctx.svg as unknown as FakeSVG).innerHTML;
    expect(html).toContain('data-id="u1"');
    expect(html).toContain('data-id="a1"');
    // Empty state should NOT appear once we have nodes
    expect(html).not.toContain('DREAMCATCHER');
  });

  it('escapes hostile node labels at LOD ≥ 2', () => {
    useUIStore.setState({ scale: 1 }); // LOD 3
    setNodes([
      {
        id: 'u1', role: 'user', type: 'message',
        text: '<script>',
        label: '<script>alert("x")</script>',
        parentId: null, timestamp: 0, metadata: {},
      },
    ]);
    const ctx = makeCtx();
    renderSVG(ctx);
    const html = (ctx.svg as unknown as FakeSVG).innerHTML;
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('records edge creation timestamps', () => {
    setNodes(
      [
        { id: 'u1', role: 'user', type: 'message', text: 'hi', label: 'hi', parentId: null, timestamp: 0, metadata: {} },
        { id: 'a1', role: 'ai', type: 'message', text: 'hello', label: 'hello', parentId: 'u1', timestamp: 0, metadata: {} },
      ],
      [{ id: 'e1', from: 'u1', to: 'a1', type: 'reply', weight: 1 }],
    );
    const map = new Map<string, number>();
    renderSVG(makeCtx({ edgeCreatedAt: map }));
    expect(map.has('u1->a1')).toBe(true);
  });

  it('prunes stale edge timestamps when edges removed', () => {
    const map = new Map([['u1->a1', 100], ['u1->stale', 200]]);
    setNodes(
      [{ id: 'u1', role: 'user', type: 'message', text: '', label: '', parentId: null, timestamp: 0, metadata: {} }],
      [], // no edges
    );
    renderSVG(makeCtx({ edgeCreatedAt: map }));
    expect(map.size).toBe(0);
  });
});
