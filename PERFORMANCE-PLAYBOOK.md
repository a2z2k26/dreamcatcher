# Dreamcacher -- Performance Playbook

**Date:** 2026-03-25
**Authors:** Andrew Zellinger & Bumba (Performance Engineer)
**Scope:** Rendering performance optimization for Dreamcacher's spatial graph canvas
**Architecture:** Imperative SVG via innerHTML, rAF loop, force-directed physics (Web Worker), LOD system, React/Next.js shell

---

## Table of Contents

1. [Architecture Baseline](#1-architecture-baseline)
2. [Frame Budget Analysis](#2-frame-budget-analysis)
3. [Critical Path: SVG innerHTML Pipeline](#3-critical-path-svg-innerhtml-pipeline)
4. [Physics Simulation](#4-physics-simulation)
5. [SVG Filter & Visual Effects](#5-svg-filter--visual-effects)
6. [LOD System Optimization](#6-lod-system-optimization)
7. [Viewport Culling](#7-viewport-culling)
8. [String Building & GC Pressure](#8-string-building--gc-pressure)
9. [GPU Compositing & CSS Transforms](#9-gpu-compositing--css-transforms)
10. [Canvas Grid Optimization](#10-canvas-grid-optimization)
11. [Web Worker Physics Bridge](#11-web-worker-physics-bridge)
12. [Defs & Gradient Caching](#12-defs--gradient-caching)
13. [Memory Management](#13-memory-management)
14. [Rendering Tier Escalation Path](#14-rendering-tier-escalation-path)
15. [Profiling Workflow](#15-profiling-workflow)
16. [Implementation Priority Matrix](#16-implementation-priority-matrix)

---

## 1. Architecture Baseline

### Current Rendering Pipeline

```
requestAnimationFrame(loop)
  |
  +-- tickSimulation() or Worker positions
  +-- tickEffects(dt)
  +-- auto-pan animation
  +-- getShakeOffset()
  +-- world.style.transform = translate + scale  <-- GPU composited
  +-- drawGrid()           <-- Canvas 2D, per-frame full clear
  +-- renderSVG()          <-- innerHTML string build, full replace
```

### What Dreamcacher Does Right (Already)

- **Imperative rAF loop** bypasses React reconciliation entirely for the hot path. This is the correct architectural choice for a canvas-based app. React never touches the SVG content.
- **Physics offloaded to Web Worker** via `physics-bridge.ts` and `physics-worker.ts`. Main thread only receives position updates.
- **LOD system** with 4 levels and crossfade zones reduces rendered detail at low zoom.
- **Zustand direct reads** via `getState()` inside the loop -- no selector subscriptions triggering re-renders.
- **Alpha decay with convergence detection** stops the simulation when stable, avoiding wasted frames.

### Where the Budget Goes (Estimated Per Frame at 100 Nodes)

| Phase | Estimated Cost | Notes |
|-------|---------------|-------|
| Physics tick (worker) | 0 ms main thread | Off-thread, correct |
| Worker postMessage overhead | ~0.3 ms | Serialization + deserialization of 100 position objects |
| `tickEffects()` | ~0.1 ms | Trivial array iteration |
| `drawGrid()` | ~1-2 ms | Full canvas clear + dot grid at high density |
| `renderSVG()` string build | ~2-4 ms | 100 nodes x ~8 SVG elements each = ~800 elements stringified |
| `svg.innerHTML = s` | ~3-6 ms | Browser parses string, builds SVG DOM, triggers layout + paint |
| SVG filter application | ~2-4 ms | `node-shadow` filter with dual feDropShadow on every node |
| SVG gradient resolution | ~0.5-1 ms | ~20 gradient defs resolved per frame |
| **Total** | **~9-18 ms** | **Borderline at 60fps (16.67ms budget)** |

The architecture is sound for the MVP node counts (sub-50). The concern is scaling to 100-500 nodes, where the innerHTML parse + SVG filter pipeline will blow the 16ms budget.

---

## 2. Frame Budget Analysis

### The 16.67ms Contract

At 60fps, you have 16.67ms per frame. The browser itself needs ~4ms for compositing, layout, and paint. That leaves **~12ms for JavaScript**.

```
|<------------- 16.67ms frame ------------>|
| JS (~12ms max)        | Browser (~4ms)   |
| physics | fx | grid | svg | parse | composite + paint |
```

### Scaling Projections

| Node Count | SVG Elements (est.) | innerHTML Parse | Filter Cost | Total Frame | Verdict |
|-----------|--------------------|--------------------|-------------|-------------|---------|
| 20 | ~200 | ~1 ms | ~1 ms | ~5 ms | Smooth 60fps |
| 50 | ~500 | ~2.5 ms | ~2 ms | ~9 ms | Comfortable |
| 100 | ~1,000 | ~5 ms | ~4 ms | ~16 ms | Borderline |
| 200 | ~2,000 | ~10 ms | ~8 ms | ~28 ms | 35fps, janky |
| 500 | ~5,000 | ~25 ms | ~20 ms | ~60 ms | 16fps, unusable |

The innerHTML parse cost scales linearly with element count. SVG filters scale linearly per element that references them. This is the fundamental constraint.

### Target Performance Budget

| Metric | Budget | Current (est. 50 nodes) | Status |
|--------|--------|------------------------|--------|
| JS execution | < 8 ms | ~6 ms | OK |
| innerHTML parse | < 3 ms | ~2.5 ms | OK |
| SVG paint | < 3 ms | ~2 ms | OK |
| Total frame | < 14 ms | ~10 ms | OK |
| Node count target | 200 | ~50 | Needs work |

---

## 3. Critical Path: SVG innerHTML Pipeline

### The Problem

Every frame, `renderSVG()` builds a string of the entire SVG scene graph and assigns it to `svg.innerHTML`. The browser then:

1. Parses the HTML/SVG string
2. Constructs the DOM tree
3. Resolves all `url(#...)` references (gradients, filters, markers)
4. Lays out the SVG content
5. Paints it

Steps 1-3 are repeated from scratch every frame, even when only a few nodes moved.

### Optimization Strategies

#### 3a. Dirty-Region Tracking (High Impact, Medium Complexity)

Instead of rebuilding the entire SVG string every frame, track which nodes moved and only update those elements.

**Technique:** Maintain a persistent SVG DOM. On each frame, iterate through nodes and update only the `transform` attribute on `<g>` elements that moved. For nodes that didn't move, touch nothing.

```typescript
// Instead of svg.innerHTML = s, maintain persistent DOM:
// On first render: create all <g> elements with data-id
// On subsequent frames: find and update only moved elements

function updateSVG() {
  const { bodies } = useGraphStore.getState();
  for (const [id, body] of Object.entries(bodies)) {
    const g = svgElementCache.get(id);
    if (!g) { createNodeElement(id, body); continue; }
    // Only update transform if position changed
    if (body.x !== prevPositions[id]?.x || body.y !== prevPositions[id]?.y) {
      g.setAttribute('transform', `translate(${body.x},${body.y}) scale(${entranceScale})`);
    }
  }
}
```

**Performance impact:** Eliminates innerHTML parse cost entirely after initial render. Updates become O(moved_nodes) instead of O(all_nodes). For a graph where 10 of 200 nodes are moving, this cuts frame cost by ~80%.

**When to use:** Always -- this is the single highest-impact optimization available.

**When to avoid:** Only if the entire scene changes every frame (initial layout settling). During settling, fall back to innerHTML for the first ~60 frames, then switch to incremental updates.

**Dreamcacher application:** The physics simulation converges quickly. Once stable, most nodes are stationary. A dirty-tracking system would make idle frames nearly free.

**Implementation complexity:** Medium. Requires maintaining a Map of SVG DOM elements, adding/removing nodes incrementally, and handling the defs/markers as persistent elements that never rebuild.

#### 3b. DocumentFragment Batch Construction (Medium Impact, Low Complexity)

If sticking with full rebuilds, use `createElementNS` + `DocumentFragment` instead of innerHTML string concatenation.

**Technique:** Build SVG elements programmatically and append them to a fragment, then replace the SVG content with the fragment in one operation.

**Performance impact:** ~20-40% faster than innerHTML for SVG specifically, because:
- No string parsing overhead
- SVG namespace is handled correctly without reinterpretation
- Browser can optimize DOM construction with known element types

**When to use:** As an intermediate step before full dirty-tracking.

**When to avoid:** If you're going to implement dirty-tracking anyway, skip this step.

**Implementation complexity:** Low-Medium. Mechanical transformation of string concatenation to createElement calls.

#### 3c. Hybrid innerHTML + Attribute Updates (Medium Impact, Low Complexity)

Keep innerHTML for the initial render and defs, but use `setAttribute` for transform updates on subsequent frames.

**Technique:** After the first innerHTML call, cache references to all `<g data-id="...">` elements. On subsequent frames, only update their `transform` attribute directly.

```typescript
// After innerHTML:
const groups = svg.querySelectorAll('[data-id]');
const cache = new Map<string, SVGGElement>();
groups.forEach(g => cache.set(g.getAttribute('data-id')!, g as SVGGElement));

// Subsequent frames:
for (const [id, g] of cache) {
  const body = bodies[id];
  g.setAttribute('transform', `translate(${body.x},${body.y})`);
}
```

**Performance impact:** Reduces per-frame cost from O(n * parse_cost) to O(n * setAttribute_cost). setAttribute is ~10x faster than innerHTML parse per element.

**When to use:** Quick win before implementing full dirty-tracking. Good for the current architecture where you already have data-id attributes on groups.

**Dreamcacher application:** The `<g data-id="${n.id}">` wrappers are already in place. This is the lowest-friction path to significant improvement.

**Implementation complexity:** Low. Cache elements after innerHTML, update transforms directly.

---

## 4. Physics Simulation

### Current State

The physics runs in a Web Worker (`physics-worker.ts`) with an O(n^2) all-pairs repulsion calculation. At 100 nodes, that's 4,950 pair checks per tick. At 500 nodes, it's 124,750 -- still manageable in a worker, but worth monitoring.

### Optimization Strategies

#### 4a. Spatial Hash Grid (High Impact at Scale, Medium Complexity)

Replace the O(n^2) all-pairs repulsion loop with a spatial hash grid for O(n) average-case neighbor lookup.

**Technique:** Divide the simulation space into grid cells of size `MAX_REPULSION_D` (144px). Each body is placed in its cell. Repulsion checks only occur between bodies in the same or adjacent cells (9-cell neighborhood).

```typescript
// In physics-worker.ts:
const CELL_SIZE = MAX_REPULSION_D; // 144px

function buildSpatialGrid(bodies: Record<string, WorkerBody>, ids: string[]) {
  const grid: Map<string, string[]> = new Map();
  for (const id of ids) {
    const b = bodies[id];
    const cx = Math.floor(b.x / CELL_SIZE);
    const cy = Math.floor(b.y / CELL_SIZE);
    const key = `${cx},${cy}`;
    const cell = grid.get(key);
    if (cell) cell.push(id);
    else grid.set(key, [id]);
  }
  return grid;
}

// Then iterate only over neighboring cells for repulsion
```

**Performance impact:** At 500 nodes, reduces pair checks from ~125,000 to ~5,000-15,000 (depending on density). 10-25x speedup for the repulsion phase.

**When to use:** When node count exceeds ~150 and the worker starts taking more than 8ms per tick.

**When to avoid:** Below 100 nodes, the overhead of grid construction exceeds the savings. The current O(n^2) loop is fine for the MVP.

**Dreamcacher application:** The `MAX_REPULSION_D = 144px` is a natural cell size. Bodies outside this range already skip repulsion, so the spatial grid formalizes what the distance check already does.

**Implementation complexity:** Medium. Confined to `physics-worker.ts`. Build grid each tick (or incrementally update), iterate over 9-cell neighborhoods.

#### 4b. Barnes-Hut Approximation (High Impact at Scale, High Complexity)

For graphs exceeding ~500 nodes, replace all-pairs repulsion with a quadtree-based Barnes-Hut approximation that groups distant nodes into center-of-mass clusters.

**Performance impact:** Reduces repulsion from O(n^2) to O(n log n). At 1,000 nodes, that's ~10,000 checks instead of 500,000.

**When to use:** Only if Dreamcacher needs to handle 500+ node graphs. The spatial hash grid is sufficient up to that point.

**When to avoid:** The overhead of quadtree construction at theta=0.5 doesn't beat naive O(n^2) until ~6,000 nodes. For Dreamcacher's expected scale (50-300 nodes), the spatial hash grid is the better choice.

**Implementation complexity:** High. Quadtree construction, center-of-mass computation, theta-criterion traversal.

#### 4c. Worker requestAnimationFrame (Low Impact, Low Complexity)

Replace `setTimeout(simulationLoop, 16)` in the worker with `requestAnimationFrame` (available in Dedicated Workers since 2024).

**Technique:** Workers now support `requestAnimationFrame()` natively. This aligns the worker's tick rate with the display refresh rate, eliminating drift and unnecessary ticks.

```typescript
// In physics-worker.ts, replace:
loopTimer = setTimeout(simulationLoop, 16);
// With:
loopTimer = requestAnimationFrame(simulationLoop);
```

**Performance impact:** Marginal but correct. Eliminates timer drift and ensures the worker doesn't run faster than the display can show. On 120Hz displays, this automatically ticks at 120Hz; on 60Hz, at 60Hz.

**Dreamcacher application:** Direct drop-in replacement. The `cancelAnimationFrame` equivalent exists for cleanup.

**Implementation complexity:** Trivial.

---

## 5. SVG Filter & Visual Effects

### The Filter Tax

The current `renderSVG()` applies a filter to every node:

```
GraphCanvas.tsx:224  filter="url(#node-shadow)"
```

This filter contains two `feDropShadow` primitives:

```svg
<filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.6)"/>
  <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="rgba(8,7,6,0.5)"/>
</filter>
```

SVG filters are **CPU-rasterized** in most browsers. Each `feDropShadow` expands to `feGaussianBlur + feOffset + feFlood + feComposite`. Two shadows means 8 filter primitives evaluated per node, per frame.

At 100 nodes, that's 800 filter primitive evaluations per frame. At `stdDeviation="6"`, the Gaussian blur kernel is ~37px wide, requiring per-pixel convolution across the filter region.

### Optimization Strategies

#### 5a. LOD-Based Filter Removal (Very High Impact, Low Complexity)

Remove the `node-shadow` filter at LOD 0 and LOD 1, where nodes are small enough that shadows are imperceptible.

```typescript
// Only apply filter at LOD 2+ where nodes are large enough to show shadows
const filterAttr = lod >= 2 ? ' filter="url(#node-shadow)"' : '';
```

**Performance impact:** At typical zoom levels (LOD 0-1), this eliminates 100% of filter cost. Users spend significant time at overview zoom levels where this applies.

**When to use:** Always. This is free performance with no visual cost.

**Dreamcacher application:** The LOD system already exists. This is a one-line change in the node rendering section.

**Implementation complexity:** Trivial.

#### 5b. Replace SVG Filters with Manual Shadow Layers (High Impact, Medium Complexity)

Replace `feDropShadow` with hand-drawn shadow circles that approximate the effect using simple SVG shapes.

**Technique:** Instead of a filter, draw a semi-transparent dark circle offset below each node. This is what the user node already does partially:

```svg
<!-- Current user node shadow (line 337) -->
<circle cx="0" cy="2" r="${r}" fill="black" opacity="0.3"/>
```

Extend this approach to all nodes and remove the `filter="url(#node-shadow)"` entirely.

```typescript
// Shadow layers (no filter needed):
s += `<circle cx="0" cy="3" r="${r + 2}" fill="black" opacity="0.18"/>`;  // outer shadow
s += `<circle cx="0" cy="1" r="${r + 1}" fill="black" opacity="0.10"/>`;  // inner shadow
```

**Performance impact:** Eliminates all SVG filter processing. Shadow becomes simple circle rendering, which the SVG rasterizer handles at near-zero cost. Expected savings: 2-4ms per frame at 100 nodes.

**When to use:** If you don't need Gaussian-blurred shadows with pixel-perfect softness. The manual approach produces a "harder" shadow, but at the node sizes in Dreamcacher (r=20-30px), the difference is subtle.

**Dreamcacher application:** The user node already has manual shadow layers. Unifying AI nodes to the same approach eliminates the filter entirely.

**Implementation complexity:** Medium. Replace the filter-based shadow with 1-2 additional circles per node.

#### 5c. Cached Filter Results via CSS Isolation (Medium Impact, Low Complexity)

If filters must stay, isolate them to prevent re-rasterization.

**Technique:** Apply `will-change: filter` to SVG elements with filters, or wrap filtered content in a `<foreignObject>` with CSS `filter: drop-shadow(...)` instead of SVG filter.

CSS `filter: drop-shadow()` is GPU-accelerated in Chrome and Safari, while SVG `<feDropShadow>` is CPU-rasterized.

```css
/* CSS approach -- GPU accelerated in most browsers */
.node-group { filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6)); }
```

**Performance impact:** Variable. GPU-accelerated filters can be 5-10x faster, but browser support and behavior varies.

**When to avoid:** If you need the dual-shadow stacking that SVG filters provide. CSS `drop-shadow` doesn't support multiple shadows in a single filter declaration.

**Implementation complexity:** Low for single shadow, Medium if replicating the dual-shadow effect.

---

## 6. LOD System Optimization

### Current Implementation

The LOD system (`getLOD()` at line 50) provides 4 levels with crossfade zones. This is well-designed. The optimization opportunities are in what each LOD level renders.

### Optimization Strategies

#### 6a. Aggressive Element Reduction at Low LOD (High Impact, Low Complexity)

Current node rendering generates 5-8 SVG elements per node regardless of LOD. At LOD 0, nodes should be single circles.

**Current state at LOD 0:**
- Aura circle
- Shadow filter (or manual shadow)
- Fill circle with gradient
- Specular highlight circle
- Rim light circle
- Core dot shadow
- Core dot
- **= 7 elements per user node**

**Target state at LOD 0:**
```typescript
if (lod === 0) {
  // Single filled circle -- topology only
  const fill = n.role === 'user' ? E[4] : E[2];
  s += `<circle cx="${body.x}" cy="${body.y}" r="${r * 0.6}" fill="${fill}" opacity="${nodeOpacity}"/>`;
  continue; // Skip the <g> wrapper and all detail layers
}
```

**Performance impact:** Reduces SVG element count by 85% at overview zoom. For 200 nodes at LOD 0, that's ~200 elements instead of ~1,400.

**Dreamcacher application:** The existing LOD levels control labels and badges but not the node material layers. Adding material LOD is the highest-value LOD improvement.

**Implementation complexity:** Low. Add early-return paths in the node rendering loop per LOD level.

#### 6b. Edge Simplification at Low LOD (Medium Impact, Low Complexity)

At LOD 0-1, replace bezier curve edges with straight lines. Bezier path computation and rendering is more expensive than straight lines.

```typescript
if (lod <= 1) {
  // Straight line instead of cubic bezier
  s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${es.stroke}" stroke-width="${es.width}"/>`;
} else {
  // Full bezier with markers and glow
  s += `<path d="${curve}" .../>`;
}
```

**Performance impact:** ~30% reduction in edge rendering cost. Eliminates bezier computation and marker resolution at overview zoom.

**Implementation complexity:** Low.

#### 6c. LOD Hysteresis (Low Impact, Low Complexity)

Add hysteresis to LOD transitions to prevent flickering when zooming near threshold boundaries.

```typescript
// Prevent rapid LOD switching by adding directional bias
const lodBias = lastLOD > currentLOD ? -0.02 : 0.02;
const adjustedScale = scale + lodBias;
```

**Implementation complexity:** Trivial.

---

## 7. Viewport Culling

### The Problem

`renderSVG()` currently iterates over **all** nodes and edges, generating SVG strings for elements that are off-screen. At 200 nodes, potentially 60-80% are outside the viewport at typical zoom levels.

### Optimization Strategies

#### 7a. Bounding Box Viewport Culling (Very High Impact, Low Complexity)

Before rendering each node, check if it falls within the visible viewport. Skip nodes (and their edges) that are entirely off-screen.

```typescript
function isVisible(body: PhysicsBody, panX: number, panY: number, scale: number, vw: number, vh: number): boolean {
  const margin = body.r * 2; // Extra margin for labels and effects
  const sx = body.x * scale + panX;
  const sy = body.y * scale + panY;
  return sx > -margin && sx < vw + margin && sy > -margin && sy < vh + margin;
}

// In renderSVG():
const vw = containerRef.current?.clientWidth || 0;
const vh = containerRef.current?.clientHeight || 0;
const visibleNodes = new Set<string>();

for (const n of nodes) {
  const body = bodies[n.id];
  if (!body) continue;
  if (!isVisible(body, panX, panY, scale, vw, vh)) continue;
  visibleNodes.add(n.id);
  // ... render node
}

// Edges: only render if both endpoints are visible (or one endpoint is visible)
for (const e of edges) {
  if (!visibleNodes.has(e.from) && !visibleNodes.has(e.to)) continue;
  // ... render edge
}
```

**Performance impact:** At typical usage (zoomed into a conversation branch), 60-80% of nodes are off-screen. This reduces rendering work proportionally. For a 200-node graph zoomed into a 30-node region, frame cost drops from ~28ms to ~8ms.

**When to use:** Always. There is no downside to viewport culling when using imperative rendering.

**When to avoid:** Never. Even at full-view zoom (spacebar fit), the culling check is cheap (~0.01ms for 200 nodes) and still eliminates nodes outside the viewport edges.

**Dreamcacher application:** The `containerRef` and transform values (panX, panY, scale) are already available in the render loop. This is a cheap bounds check before each node.

**Implementation complexity:** Low. ~15 lines of code.

#### 7b. Edge Culling with Endpoint Check (Medium Impact, Low Complexity)

For edges where both endpoints are off-screen, skip rendering entirely. For edges where one endpoint is visible, render normally (the edge may cross the viewport).

**Performance impact:** Edges are less expensive than nodes (1 SVG element vs. 5-8), but eliminating off-screen edges still saves ~20-30% of edge rendering cost.

**Implementation complexity:** Trivial. Add a `visibleNodes.has()` check in the edge loop.

---

## 8. String Building & GC Pressure

### The Problem

`renderSVG()` builds the SVG content via string concatenation (`s += ...`). For 100 nodes with ~8 elements each, this produces ~800 concatenation operations, creating intermediate string objects that pressure the garbage collector.

### Current Pattern

```typescript
let s = '';
s += `<defs>...~70 lines of gradient/filter defs...</defs>`;
for (const e of edges) {
  s += `<path .../>`;     // 1-2 per edge
}
for (const n of nodes) {
  s += `<g ...>`;
  s += `<circle .../>`;   // 5-8 per node
  s += `</g>`;
}
s += renderEffects(...);
svg.innerHTML = s;
```

### Optimization Strategies

#### 8a. Array.push + join (Low-Medium Impact, Low Complexity)

Replace string concatenation with array accumulation and a final join.

```typescript
const parts: string[] = [];
parts.push('<defs>...</defs>');
for (const n of nodes) {
  parts.push(`<g transform="translate(${body.x},${body.y})">`);
  parts.push(`<circle .../>`);
  parts.push('</g>');
}
svg.innerHTML = parts.join('');
```

**Performance impact:** Modern V8 uses rope data structures for string concatenation, which makes `+=` competitive with `Array.push + join`. However, for very large strings (>100KB), array-join can be 10-30% faster because it allocates the final string in one pass rather than incrementally growing a rope.

At 200 nodes, the SVG string is ~50-80KB. At 500 nodes, it's ~200KB. The array approach becomes measurably faster at these sizes.

**When to use:** When the SVG string exceeds ~50KB (roughly 150+ nodes).

**When to avoid:** Below 100 nodes, the difference is negligible.

**Implementation complexity:** Low. Mechanical find-and-replace of `s +=` with `parts.push()`.

#### 8b. Pre-allocated String Templates (Medium Impact, Medium Complexity)

Pre-compute static portions of the SVG string (defs, gradients, markers) once on mount, not every frame.

```typescript
// Compute once:
const STATIC_DEFS = buildDefs(); // ~2KB of gradient/filter/marker definitions

// Every frame:
const parts: string[] = [STATIC_DEFS];
// ... dynamic content only
svg.innerHTML = parts.join('');
```

**Performance impact:** The `<defs>` block is ~2KB of static content rebuilt identically every frame. Pre-computing it saves ~0.2ms per frame and reduces string length.

**Dreamcacher application:** The defs block in `renderSVG()` (lines 168-233) is entirely static. It references theme constants that don't change during a session.

**Implementation complexity:** Low. Extract the defs string to a module-level constant or a `useMemo`.

#### 8c. Minimize GC Pauses (Low Impact, Low Complexity)

Avoid creating objects inside the hot loop that become garbage.

**Current issues:**
- `renderEffects()` creates temporary strings that become garbage
- `getShakeOffset()` returns a new `{ x, y }` object every frame
- Edge rendering computes `curve` string via template literal every frame

**Fixes:**
- Reuse a mutable offset object for shake: `const shakeOffset = { x: 0, y: 0 };`
- Pre-allocate effect string buffers

**Performance impact:** Reduces GC pressure, preventing occasional 2-5ms GC pauses that cause frame drops.

**Implementation complexity:** Low.

---

## 9. GPU Compositing & CSS Transforms

### Current State

The world container uses CSS transform for pan/zoom:

```typescript
world.style.transform = `translate(${currentPanX + shake.x}px,${currentPanY + shake.y}px) scale(${scale})`;
```

### What This Gets Right

CSS `transform` is composited on the GPU. The browser creates a separate compositing layer for the world element, meaning pan/zoom operations don't trigger layout or paint -- they're pure GPU texture transforms. This is optimal.

### Optimization Strategies

#### 9a. Force GPU Layer Promotion (Low Impact, Low Complexity)

Ensure the world container has `will-change: transform` to guarantee GPU layer creation.

```css
.world-container {
  will-change: transform;
}
```

**Performance impact:** In most browsers, setting `style.transform` already triggers layer promotion. Explicit `will-change` ensures it happens before the first animation frame, avoiding a one-time layer creation cost.

**Caveats:** Each GPU layer consumes VRAM. For Dreamcacher, there's only one world layer, so the cost is negligible. Do NOT add `will-change` to individual nodes -- that would create hundreds of GPU layers ("layer explosion").

**Implementation complexity:** Trivial. One CSS property.

#### 9b. Use translate3d for Guaranteed Compositing (Negligible Impact)

```typescript
world.style.transform = `translate3d(${panX}px,${panY}px,0) scale(${scale})`;
```

**Performance impact:** `translate3d` historically forced GPU compositing in older browsers. Modern browsers treat `translate()` and `translate3d()` identically for compositing purposes. Not worth changing.

#### 9c. Avoid Layout Thrashing in the Render Loop (Medium Impact)

The render loop reads `container.clientWidth` and `container.clientHeight` in `drawGrid()` every frame. These are layout-triggering reads. If any DOM write happened earlier in the frame, this forces a synchronous layout.

**Current risk:** `world.style.transform = ...` is a DOM write. `drawGrid()` reads layout properties. If the browser hasn't flushed the write, the read forces layout.

**Fix:** Cache container dimensions and only re-read them on resize events.

```typescript
let cachedWidth = 0;
let cachedHeight = 0;

const observer = new ResizeObserver(entries => {
  cachedWidth = entries[0].contentRect.width;
  cachedHeight = entries[0].contentRect.height;
});
observer.observe(containerRef.current);

// In drawGrid():
const W = cachedWidth;
const H = cachedHeight;
```

**Performance impact:** Eliminates potential forced synchronous layout, saving 0-2ms per frame depending on browser state.

**Implementation complexity:** Low.

---

## 10. Canvas Grid Optimization

### Current State

`drawGrid()` clears and redraws the entire dot grid every frame using Canvas 2D. At high zoom, grid density is low (the `gap < 6` early return handles this). At medium zoom, the grid can have thousands of dots.

### Optimization Strategies

#### 10a. Skip Grid Redraw When Idle (High Impact, Low Complexity)

Only redraw the grid when pan/zoom changes, not every frame.

```typescript
let lastGridPanX = NaN;
let lastGridPanY = NaN;
let lastGridScale = NaN;

// In the loop:
if (panX !== lastGridPanX || panY !== lastGridPanY || scale !== lastGridScale) {
  drawGrid();
  lastGridPanX = panX;
  lastGridPanY = panY;
  lastGridScale = scale;
}
```

**Performance impact:** During physics settling and idle states, the grid doesn't need redrawing. This eliminates ~1-2ms per frame during the majority of runtime.

**Implementation complexity:** Trivial.

#### 10b. Use Tiled Grid Pattern (Medium Impact, Medium Complexity)

Instead of drawing individual dots, pre-render a tile of dots to an offscreen canvas and use `drawImage` to tile it across the viewport.

```typescript
// Pre-render a 200x200 tile of dots
const tileCanvas = document.createElement('canvas');
// ... draw dots to tile
// Then in drawGrid():
ctx.drawImage(tileCanvas, offsetX, offsetY);
ctx.drawImage(tileCanvas, offsetX + tileSize, offsetY);
// etc.
```

**Performance impact:** Replaces thousands of `arc()` calls with a handful of `drawImage()` calls. 5-10x faster for dense grids.

**When to use:** If the grid drawing exceeds 1ms at typical zoom levels.

**Implementation complexity:** Medium. Need to handle tile alignment with pan offset and scale changes.

---

## 11. Web Worker Physics Bridge

### Current State

The physics bridge (`physics-bridge.ts`) is well-architected:
- Worker sends positions back via `postMessage`
- Main thread applies positions to bodies
- Fallback to main-thread simulation if Worker unavailable

### Optimization Strategies

#### 11a. Transferable Typed Arrays (Medium Impact, Low Complexity)

Replace the `Record<string, { x, y }>` positions object with a `Float64Array` transferred (not copied) between worker and main thread.

```typescript
// In worker:
const buffer = new Float64Array(nodeIds.length * 2);
for (let i = 0; i < nodeIds.length; i++) {
  const b = bodies[nodeIds[i]];
  buffer[i * 2] = b.x;
  buffer[i * 2 + 1] = b.y;
}
self.postMessage({ type: 'positions', buffer, ids: nodeIds }, [buffer.buffer]);

// In main thread:
worker.onmessage = (e) => {
  const { buffer, ids } = e.data;
  for (let i = 0; i < ids.length; i++) {
    const body = bodies[ids[i]];
    if (body && body.fx === undefined) {
      body.x = buffer[i * 2];
      body.y = buffer[i * 2 + 1];
    }
  }
};
```

**Performance impact:** `postMessage` with a plain object serializes/deserializes the entire position record. At 200 nodes, that's serializing 200 objects with 2 properties each. With `Transferable`, the ArrayBuffer is moved (zero-copy) to the main thread. Serialization cost drops from ~0.3ms to ~0.01ms.

**When to use:** When postMessage overhead becomes measurable (100+ nodes).

**When to avoid:** Below 50 nodes, the overhead of managing typed arrays isn't worth it.

**Implementation complexity:** Low. Change the message format in worker and bridge.

#### 11b. Batched Position Updates (Low Impact)

Instead of sending positions every tick, accumulate 2-3 ticks and send once. This halves postMessage frequency at the cost of slightly delayed visual updates.

**When to use:** Only if postMessage frequency is causing main thread jank (unlikely with transferables).

**When to avoid:** For Dreamcacher, visual responsiveness during drag and physics settling is important. Skip this.

---

## 12. Defs & Gradient Caching

### The Problem

The `<defs>` block in `renderSVG()` is ~65 lines of static SVG definitions (gradients, filters, markers) that is rebuilt identically every frame.

### Optimization Strategy

#### 12a. Static Defs Layer (Medium Impact, Low Complexity)

Move the `<defs>` block to a persistent SVG element that never changes.

**Technique:** Use two SVG layers:
1. A static SVG containing only `<defs>` -- never touched after mount
2. A dynamic SVG containing edges, nodes, and effects -- updated per frame

```html
<svg class="defs-layer" style="position:absolute;width:0;height:0">
  <defs>...all gradients, filters, markers...</defs>
</svg>
<svg class="content-layer" ref={svgRef}>
  <!-- innerHTML updates here, references defs via url(#id) -->
</svg>
```

SVG `url(#id)` references work across SVG elements in the same document.

**Performance impact:** Eliminates ~2KB of string construction and parsing per frame. The browser also avoids re-resolving gradient/filter definitions.

**Dreamcacher application:** The defs in lines 168-233 of `GraphCanvas.tsx` are entirely static within a session. Factor them out to a one-time rendered SVG.

**Implementation complexity:** Low. Render defs once in a separate SVG element on mount.

---

## 13. Memory Management

### Current Concerns

1. **String concatenation GC:** Every frame creates a new SVG string (~20-80KB) that becomes garbage immediately after `innerHTML = s`. At 60fps, that's 1.2-4.8MB/s of garbage.

2. **Effects arrays:** `tickEffects()` uses `splice()` to remove expired effects. Each `splice()` shifts remaining elements, potentially triggering GC on the removed objects.

3. **Ripple double-push:** `addRipple()` creates 2 ripple objects per invocation. Frequent interactions could accumulate ripples faster than they expire.

### Optimization Strategies

#### 13a. Object Pool for Effects (Low Impact, Low Complexity)

Pre-allocate ripple and trail objects and reuse them instead of creating new ones.

```typescript
const RIPPLE_POOL: Ripple[] = Array.from({ length: 20 }, () => ({
  x: 0, y: 0, age: 0, maxAge: 0, maxRadius: 0, color: ''
}));
let ripplePoolIndex = 0;

function addRipple(fx: EffectsState, x: number, y: number, ...) {
  const ripple = RIPPLE_POOL[ripplePoolIndex % RIPPLE_POOL.length];
  ripple.x = x; ripple.y = y; ripple.age = 0; ...
  ripplePoolIndex++;
  fx.ripples.push(ripple);
}
```

**Performance impact:** Reduces object allocation and GC pressure for transient effects. Minor at current interaction rates.

**Implementation complexity:** Low.

#### 13b. Swap-Remove Instead of Splice (Low Impact, Trivial Complexity)

Replace `splice(i, 1)` in `tickEffects` with swap-remove to avoid array shifting.

```typescript
// Instead of: fx.ripples.splice(i, 1);
// Use: swap last element into position i, then pop
fx.ripples[i] = fx.ripples[fx.ripples.length - 1];
fx.ripples.pop();
```

**Performance impact:** `splice` is O(n) due to element shifting. Swap-remove is O(1). For small arrays (typically <10 ripples), the difference is negligible. Good hygiene for the pattern.

**Implementation complexity:** Trivial.

---

## 14. Rendering Tier Escalation Path

This is the long-term architecture plan for when Dreamcacher outgrows SVG innerHTML.

### Tier 0: Current (SVG innerHTML) -- 0-50 nodes

The current architecture. Suitable for the MVP and early sessions.

### Tier 1: Optimized SVG (Dirty Tracking + Culling + LOD) -- 50-200 nodes

Apply the optimizations in this playbook:
- Viewport culling (Section 7)
- LOD-based element reduction (Section 6a)
- Filter removal/replacement (Section 5a, 5b)
- Static defs layer (Section 12a)
- Grid idle skip (Section 10a)
- Cached container dimensions (Section 9c)

**Expected result:** 200 nodes at 60fps.

### Tier 2: Hybrid Canvas + SVG Overlay -- 200-500 nodes

Move node rendering to Canvas 2D while keeping SVG for interactive overlays (selection rings, labels, tooltips).

**Architecture:**
```
Canvas layer (bottom):   Edges, node shapes, shadows, effects
SVG layer (middle):      Selection rings, labels, badges (only for visible/selected nodes)
HTML layer (top):        Tooltips, context menus, input bar
```

**Key insight from Felt's migration:** Canvas redraws everything from scratch every frame with no DOM bookkeeping. At 200+ nodes, the elimination of DOM management overhead makes Canvas faster than any SVG optimization. Felt observed that large selections with SVG required React to manage thousands of SVG elements and event handlers, while Canvas handled the same scene with stable frame rates.

**Why hybrid:** Canvas loses SVG's accessibility and event handling. Keep SVG for the small number of interactive elements (selected node detail, labels at high LOD) while Canvas handles the bulk rendering.

**Implementation complexity:** High. Requires rewriting the rendering pipeline.

### Tier 3: WebGL (PixiJS) -- 500+ nodes

For extreme scale, move to WebGL-based rendering via PixiJS v8.

**Why PixiJS:** PixiJS v8 (released 2024) is the highest-performing 2D WebGL renderer. It uses reactive batch rendering that only updates what changed, and supports WebGPU on supported browsers for additional performance.

**Performance:** WebGL can render 10,000+ circles at 60fps without breaking a sweat. Sprites are batched into GPU draw calls, so the cost is nearly constant regardless of element count.

**When to escalate:** Only if Dreamcacher needs to visualize entire conversation histories with 500+ nodes simultaneously. This is an architectural rewrite, not an optimization.

**Implementation complexity:** Very high. Different rendering paradigm, different event handling, different animation system.

### Decision Framework

```
Node Count    Action
< 50          Current architecture, no changes needed
50-100        Apply Tier 1 optimizations (this playbook)
100-200       All Tier 1 optimizations are mandatory
200-500       Begin Tier 2 migration (Canvas + SVG hybrid)
500+          Evaluate Tier 3 (WebGL) based on actual usage patterns
```

---

## 15. Profiling Workflow

### Measuring Before Optimizing

Never optimize without a baseline measurement. Use this workflow:

#### Step 1: Chrome DevTools Performance Panel

1. Open DevTools > Performance
2. Start recording
3. Interact with the canvas (pan, zoom, add nodes)
4. Stop recording
5. Look at:
   - **Main thread flame chart:** Find `renderSVG` and `drawGrid` durations
   - **Frame rate graph:** Identify drops below 60fps
   - **GPU activity:** Check for filter rasterization spikes

#### Step 2: Add Timing Instrumentation

```typescript
// In the rAF loop:
const t0 = performance.now();
drawGrid();
const t1 = performance.now();
renderSVG();
const t2 = performance.now();

// Log every 60 frames:
if (frameCount % 60 === 0) {
  console.log(`Grid: ${(t1-t0).toFixed(1)}ms  SVG: ${(t2-t1).toFixed(1)}ms  Total: ${(t2-t0).toFixed(1)}ms`);
}
```

#### Step 3: Synthetic Load Testing

Create a test function that generates N nodes with random positions to stress-test at scale:

```typescript
function stressTest(nodeCount: number) {
  const store = useGraphStore.getState();
  for (let i = 0; i < nodeCount; i++) {
    store.addNode({
      id: `stress-${i}`,
      role: i % 3 === 0 ? 'user' : 'ai',
      type: 'message',
      text: `Test node ${i}`,
      label: `Node ${i}`,
      parentId: i > 0 ? `stress-${i - 1}` : null,
      timestamp: Date.now(),
      metadata: { model: 'anthropic/claude-3.5-sonnet' },
    });
  }
}
```

#### Step 4: Performance.measure API

```typescript
performance.mark('render-start');
renderSVG();
performance.mark('render-end');
performance.measure('renderSVG', 'render-start', 'render-end');
```

Entries are visible in DevTools Performance panel and can be collected programmatically.

---

## 16. Implementation Priority Matrix

Sorted by impact/effort ratio. Implement in this order.

### Phase 1: Quick Wins (1-2 days)

| # | Optimization | Section | Impact | Effort | Files |
|---|-------------|---------|--------|--------|-------|
| 1 | LOD-based filter removal | 5a | Very High | Trivial | `GraphCanvas.tsx` |
| 2 | Viewport culling | 7a | Very High | Low | `GraphCanvas.tsx` |
| 3 | Aggressive LOD 0 simplification | 6a | High | Low | `GraphCanvas.tsx` |
| 4 | Skip grid redraw when idle | 10a | High | Trivial | `GraphCanvas.tsx` |
| 5 | Static defs layer | 12a | Medium | Low | `GraphCanvas.tsx` |
| 6 | Cache container dimensions | 9c | Medium | Low | `GraphCanvas.tsx` |
| 7 | Pre-allocated defs string | 8b | Low-Medium | Low | `GraphCanvas.tsx` |

**Expected result:** 100 nodes at solid 60fps, 200 nodes at ~45fps.

### Phase 2: Structural Improvements (3-5 days)

| # | Optimization | Section | Impact | Effort | Files |
|---|-------------|---------|--------|--------|-------|
| 8 | Replace SVG filters with manual shadows | 5b | High | Medium | `GraphCanvas.tsx` |
| 9 | Hybrid innerHTML + setAttribute | 3c | High | Low-Medium | `GraphCanvas.tsx` |
| 10 | Edge LOD simplification | 6b | Medium | Low | `GraphCanvas.tsx` |
| 11 | Transferable typed arrays for worker | 11a | Medium | Low | `physics-worker.ts`, `physics-bridge.ts` |
| 12 | Worker requestAnimationFrame | 4c | Low | Trivial | `physics-worker.ts` |
| 13 | Swap-remove in effects | 13b | Low | Trivial | `effects.ts` |

**Expected result:** 200 nodes at solid 60fps.

### Phase 3: Scale Engineering (1-2 weeks)

| # | Optimization | Section | Impact | Effort | Files |
|---|-------------|---------|--------|--------|-------|
| 14 | Full dirty-region tracking | 3a | Very High | Medium | `GraphCanvas.tsx` (major refactor) |
| 15 | Spatial hash grid in worker | 4a | High at scale | Medium | `physics-worker.ts` |
| 16 | Tiled grid pattern | 10b | Medium | Medium | `GraphCanvas.tsx` |

**Expected result:** 300-400 nodes at 60fps.

### Phase 4: Architecture Migration (When Needed)

| # | Optimization | Section | Impact | Effort | Files |
|---|-------------|---------|--------|--------|-------|
| 17 | Canvas 2D hybrid renderer | 14 (Tier 2) | Transformative | High | New renderer module |
| 18 | PixiJS WebGL renderer | 14 (Tier 3) | Transformative | Very High | New renderer module |

**Expected result:** 500-1000+ nodes at 60fps.

---

## Appendix A: Quick Reference Card

### Frame Budget

```
60fps = 16.67ms per frame
Browser overhead = ~4ms
JS budget = ~12ms
```

### SVG Element Cost (approximate)

```
<circle>         = 0.005ms render
<path> (bezier)  = 0.01ms render
<text>           = 0.02ms render
filter reference = 0.05-0.2ms per element
innerHTML parse  = 0.005ms per element
gradient resolve = 0.002ms per reference
```

### Properties Safe to Animate (GPU Composited)

```
transform (translate, scale, rotate)
opacity
filter (CSS, not SVG -- browser dependent)
```

### Properties That Trigger Layout (Never Animate)

```
width, height, top, left, right, bottom
margin, padding, border-width
font-size, line-height
```

---

## Appendix B: Sources

- [SVG Optimization for Web Performance: The Complete 2026 Guide](https://vectosolve.com/blog/svg-optimization-web-performance-2025)
- [High Performance SVGs -- CSS-Tricks](https://css-tricks.com/high-performance-svgs/)
- [Improving SVG Runtime Performance -- CodePen](https://codepen.io/tigt/post/improving-svg-rendering-performance)
- [Optimizing SVGs for Web Performance & Scalability in 2025 -- DEV Community](https://dev.to/frontendtoolstech/optimizing-svgs-for-web-performance-scalability-in-2025-3df2)
- [Planning for Performance -- Using SVG with CSS3 and HTML5 (O'Reilly)](https://oreillymedia.github.io/Using_SVG/extras/ch19-performance.html)
- [Performant Game Loops in JavaScript -- Aleksandr Hovhannisyan](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/)
- [Improve Animation Performance With requestAnimationFrame -- DebugBear](https://www.debugbear.com/blog/requestanimationframe)
- [Supercharge Your Web Animations -- DEV Community](https://dev.to/josephciullo/supercharge-your-web-animations-optimize-requestanimationframe-like-a-pro-22i5)
- [SVG vs Canvas vs WebGL Benchmark 2025 -- SVG Genie](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025)
- [Canvas vs SVG -- SitePoint](https://www.sitepoint.com/canvas-vs-svg/)
- [From SVG to Canvas: Making Felt Faster -- Felt Engineering](https://www.felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster)
- [Comparing Rendering Performance for Large Graphs -- IMLD Research Paper](https://imld.de/cnt/uploads/Horak-2018-Graph-Performance.pdf)
- [PixiJS v8 Launches -- PixiJS](https://pixijs.com/blog/pixi-v8-launches)
- [7 Must-Know GSAP Animation Tips -- Codrops](https://tympanus.net/codrops/2025/09/03/7-must-know-gsap-animation-tips-for-creative-developers/)
- [Optimizing GSAP Animations in Next.js 15 -- Medium](https://medium.com/@thomasaugot/optimizing-gsap-animations-in-next-js-15-best-practices-for-initialization-and-cleanup-2ebaba7d0232)
- [CSS GPU Acceleration: will-change & translate3d Guide -- Lexo](https://www.lexo.ch/blog/2025/01/boost-css-performance-with-will-change-and-transform-translate3d-why-gpu-acceleration-matters/)
- [CSS GPU Animation: Doing It Right -- Smashing Magazine](https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/)
- [OffscreenCanvas -- web.dev](https://web.dev/articles/offscreen-canvas)
- [Consider Animating Your Canvas in a Web Worker -- Alex MacArthur](https://macarthur.me/posts/animate-canvas-in-a-worker/)
- [Animation Performance and Frame Rate -- MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- [120fps and No Jank -- Surma](https://surma.dev/things/120fps/)
- [Jank Busting for Better Rendering -- web.dev](https://web.dev/articles/speed-rendering)
- [The Barnes-Hut Approximation -- Jeffrey Heer](https://jheer.github.io/barnes-hut/)
- [Spatial Hash Grid for Collision Detection -- GitHub Gist](https://gist.github.com/kirbysayshi/1760774)
- [Optimizing Particle Systems with Grid Lookup -- Gorilla Sun](https://www.gorillasun.de/blog/particle-system-optimization-grid-lookup-spatial-hashing/)
- [Lazy Rendering Web UIs with IntersectionObserver -- DraftKings Engineering](https://medium.com/draftkings-engineering/lazy-rendering-web-uis-with-intersectionobserver-api-bc69a4b61325)
- [will-change -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change)
- [JavaScript String Concatenation Performance -- JavaSpring](https://www.javaspring.net/blog/most-efficient-way-to-concatenate-strings-in-javascript/)
- [Breaking Up with SVG-in-JS -- Jacob Kurt Gross](https://kurtextrem.de/posts/svg-in-js)
- [SVG versus Canvas: Which technology? -- JointJS](https://www.jointjs.com/blog/svg-versus-canvas)
- [Canvas vs. SVG Best Practices -- Apache ECharts](https://apache.github.io/echarts-handbook/en/best-practices/canvas-vs-svg/)
