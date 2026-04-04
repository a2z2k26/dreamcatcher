# Dreamcacher — Pattern Integration Sprint Plan

**Date:** 2026-03-24
**Authors:** Andrew Zellinger & Bumba
**Scope:** Adopt proven patterns from Understand Anything, Claude Island, and Clui CC to complete Dreamcacher's three-tier MVP
**Prerequisite:** UI theme update (in progress) must land first

---

## Codebase Inventory (Current State)

### Files That Will Be Modified

| File | Lines | Purpose | Sprints Touching It |
|------|-------|---------|---------------------|
| `src/types/graph.ts` | 69 | Node, edge, physics types | 1, 2, 3, 4 |
| `src/types/memory.ts` | 16 | Memory/clip types | 1, 4 |
| `src/stores/graph-store.ts` | 117 | Nodes, edges, positions, physics bodies | 1, 2, 3, 4 |
| `src/stores/ui-store.ts` | 80 | Selection, zoom, panels, transform | 1, 2, 3, 5, 6 |
| `src/stores/session-store.ts` | 221 | Session lifecycle, IndexedDB persistence | 1, 6 |
| `src/stores/memory-store.ts` | 96 | Memories, IndexedDB persistence | 4 |
| `src/components/canvas/GraphCanvas.tsx` | 549 | SVG canvas, physics loop, rendering | 2, 3, 5 |
| `src/components/ui/FloatingUI.tsx` | 425 | Top controls, canvas tools, floating input | 1, 3, 4, 6 |
| `src/components/ui/Inspector.tsx` | 188 | Right sidebar node detail | 3, 5 |
| `src/components/ui/MemoryShelf.tsx` | 158 | Left sidebar memory list | 4 |
| `src/components/ui/ContextMenu.tsx` | 230 | Right-click actions | 3, 4 |
| `src/components/ui/LearnOverlay.tsx` | 346 | Educational overlay | — (no changes) |
| `src/components/SessionInit.tsx` | 62 | Session bootstrap, auto-save | 1 |
| `src/lib/simulation.ts` | 133 | Force-directed physics | 2 |
| `src/lib/effects.ts` | 155 | Ripples, entrances, streaming pulse | 3, 5 |
| `src/lib/context-builder.ts` | 37 | Graph path → messages[] | 5 |
| `src/lib/theme.ts` | 103 | Elevation, luminance, accent, glass | — (theme update handles this) |
| `src/lib/models.ts` | 25 | Model registry | — (no changes) |
| `src/app/api/chat/route.ts` | 92 | Claude API + mock fallback | 5 |
| `src/app/page.tsx` | 19 | Root layout | 5, 6 |
| `package.json` | 29 | Dependencies | 2, 4 |

### Files That Will Be Created

| File | Sprint | Purpose |
|------|--------|---------|
| `src/types/session.ts` | 1 | Session phase enum, transition validation |
| `src/lib/selectors.ts` | 1 | Shared Zustand selector equality functions |
| `src/lib/physics-worker.ts` | 2 | Web Worker for force simulation |
| `src/lib/physics-bridge.ts` | 2 | Main thread ↔ worker communication |
| `src/components/ui/BranchPreview.tsx` | 3 | Branch point hover popover |
| `src/components/ui/PathTrace.tsx` | 3 | Path trace overlay + step navigation |
| `src/components/ui/ClipCreator.tsx` | 4 | Multi-select → clip creation flow |
| `src/components/ui/TimelineView.tsx` | 5 | Linear conversation timeline panel |
| `src/components/ui/ToolCard.tsx` | 5 | Tool call transparency cards |
| `src/components/ui/BranchCompare.tsx` | 5 | Side-by-side branch comparison |
| `src/components/ui/SessionPill.tsx` | 6 | Notch-style session navigator |
| `src/components/ui/ActivityFeed.tsx` | 6 | Cross-session activity feed |

### New Dependencies

| Package | Version | Sprint | Purpose |
|---------|---------|--------|---------|
| `fuse.js` | ^7 | 4 | Fuzzy search for memory shelf + command palette |

No other new dependencies. The Web Worker (Sprint 2) uses native browser APIs. All UI is custom — no component libraries.

---

## Sprint 1: Foundation

**Goal:** Upgrade the data model and state management so every subsequent sprint builds on solid infrastructure.
**Estimated tasks:** 8
**Depends on:** Theme update complete

### 1.1 — Typed Edge System
**Source:** Understand Anything's 18 edge types
**Files:** `src/types/graph.ts`, `src/stores/graph-store.ts`

**Current state:**
```ts
// graph.ts line 38-39
export interface GraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: 'main' | 'branch';
}
```

**Target state:**
```ts
export type EdgeType =
  | 'reply'        // direct response (replaces 'main')
  | 'branch'       // divergence from a branch point
  | 'regeneration' // alternative response to same prompt
  | 'summarizes'   // summary node compresses a subgraph
  | 'clips_to'     // this node belongs to a saved clip
  | 'references';  // node cites content from another node

export interface GraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: EdgeType;
  readonly weight: number;       // 0-1, strength of relationship
  readonly label?: string;       // optional description of the relationship
}
```

**Changes required:**
1. `graph.ts` — Replace `GraphEdge` type definition. Update `GraphNode.type` to add `'decision'` type (for binary/multi-decision nodes from spec).
2. `graph-store.ts` — Update `addEdge` to accept new edge structure. Update `loadGraph` to handle legacy edges (migration: `'main'` → `'reply'`).
3. `FloatingUI.tsx` line 332 — `FloatingInput.sendMessage()`: change `type: 'main'` to `type: 'reply'` for standard edges, keep `type: 'branch'` for branches.
4. `GraphCanvas.tsx` lines 121-136 — Edge rendering: update stroke colors/styles per edge type. `reply` = current main style, `branch` = current branch style, `regeneration` = dashed amber, `summarizes` = dotted subtle, `clips_to` = dashed violet.
5. `simulation.ts` lines 57-71 — Spring forces: use edge type to determine rest length and stiffness. Add constants for `REGEN_REST_LENGTH`, `SUMMARY_REST_LENGTH`.

**Acceptance criteria:**
- [ ] All existing edges render correctly with `'reply'` instead of `'main'`
- [ ] New edge types render with distinct visual styles
- [ ] Simulation adjusts spring constants per edge type
- [ ] Legacy graph documents load without errors (migration path)

### 1.2 — Session Phase State Machine
**Source:** Clui CC's tab state machine (`connecting → idle → running → completed → failed → dead`)
**Files:** New `src/types/session.ts`, `src/stores/session-store.ts`, `src/components/SessionInit.tsx`

**Create `src/types/session.ts`:**
```ts
export type SessionPhase =
  | 'empty'      // new session, no nodes yet
  | 'idle'       // has content, user's turn
  | 'streaming'  // AI response in progress
  | 'waiting'    // AI finished, awaiting user input
  | 'stale';     // no activity for > 5 minutes

export const VALID_TRANSITIONS: Record<SessionPhase, readonly SessionPhase[]> = {
  empty:     ['idle', 'streaming'],
  idle:      ['streaming', 'stale'],
  streaming: ['waiting', 'idle'],  // idle if error
  waiting:   ['streaming', 'idle', 'stale'],
  stale:     ['streaming', 'idle'],
} as const;

export function canTransition(from: SessionPhase, to: SessionPhase): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
```

**Changes required:**
1. Create `src/types/session.ts` with phase enum, transitions, and validation function.
2. `session-store.ts` — Add `phase: SessionPhase` to `Session` interface. Add `transitionPhase(sessionId: string, to: SessionPhase)` action with validation. Update `createSession` to set `phase: 'empty'`.
3. `SessionInit.tsx` — Subscribe to graph-store changes to detect streaming start/end and auto-transition: when an AI node is added with empty text → `'streaming'`; when streaming completes → `'waiting'`; when user sends message → `'streaming'`.
4. `FloatingUI.tsx` `TopControls` — Show phase indicator dot next to session name: gold for streaming, green for waiting, dim for idle/stale.

**Acceptance criteria:**
- [ ] Session phase updates automatically as conversation progresses
- [ ] Invalid transitions are blocked (canTransition returns false)
- [ ] Phase indicator dot visible in TopControls
- [ ] Phase persists through IndexedDB save/load cycle

### 1.3 — Narrow Zustand Selectors
**Source:** Clui CC's custom equality functions preventing re-renders during streaming
**Files:** New `src/lib/selectors.ts`, `src/components/ui/Inspector.tsx`, `src/components/ui/MemoryShelf.tsx`, `src/components/ui/ContextMenu.tsx`, `src/components/ui/FloatingUI.tsx`

**Create `src/lib/selectors.ts`:**
```ts
// Shallow compare for flat objects
export function shallowEqual<T extends Record<string, unknown>>(a: T | undefined, b: T | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(k => a[k] === b[k]);
}

// Compare nodes by content-relevant fields only (ignores position changes)
export function nodeContentEqual(a: GraphNode | undefined, b: GraphNode | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.text === b.text && a.label === b.label && a.metadata === b.metadata && a.type === b.type;
}
```

**Changes required (per component):**

**Inspector.tsx (lines 16-17):**
```ts
// BEFORE:
const nodes = useGraphStore(s => s.nodes);
const node = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

// AFTER:
const node = useGraphStore(
  s => selectedNodeId ? s.nodes.find(n => n.id === selectedNodeId) : null,
  nodeContentEqual
);
```
This prevents Inspector from re-rendering on every streaming text chunk unless the *selected* node's content changed.

**ContextMenu.tsx (lines 23-24):** Same pattern — select specific node by ID with content equality.

**FloatingUI.tsx (lines 283-289):** `FloatingInput` subscribes to `activeNodeId` and `getChildCount` — both change infrequently. Already efficient. No change needed.

**MemoryShelf.tsx (line 19):** `memories` array changes infrequently. Already efficient. No change needed.

**GraphCanvas.tsx:** Already uses imperative `getState()` — no React re-renders. No change needed.

**Acceptance criteria:**
- [ ] Inspector does not re-render during streaming unless the selected node's text changes
- [ ] ContextMenu does not re-render during streaming
- [ ] No performance regression — profile with React DevTools Profiler

### 1.4 — Multi-Select Infrastructure
**Source:** Needed for Clip & Spawn (Sprint 4)
**Files:** `src/stores/ui-store.ts`, `src/components/canvas/GraphCanvas.tsx`

**Changes to `ui-store.ts`:**
```ts
// Add to UIState:
selectedNodeIds: ReadonlySet<string>;  // replaces single selectedNodeId for multi-select
// Keep selectedNodeId as a derived concept: the "primary" selected node (last clicked)
```

Actually — keep `selectedNodeId` for single-click behavior (inspector, branch, etc.) and add `selectedNodeIds` as a separate concern activated by Shift+click or lasso drag. This avoids breaking existing behavior.

**Changes to `GraphCanvas.tsx`:**
1. `handleMouseDown` — If Shift is held, add node to `selectedNodeIds` Set instead of replacing `selectedNodeId`.
2. `renderSVG()` — Render multi-selection highlight ring for all nodes in `selectedNodeIds` (dimmer than primary selection ring).
3. Add lasso selection: mouseDown on empty space + drag draws a selection rectangle. On mouseUp, all nodes within the rectangle are added to `selectedNodeIds`.

**Acceptance criteria:**
- [ ] Shift+click adds/removes nodes from multi-selection
- [ ] Multi-selected nodes have visible selection indicator
- [ ] Lasso drag selects all enclosed nodes
- [ ] Single click still works as before (sets selectedNodeId, clears multi-select)

### 1.5 — GraphNode Type Expansion
**Files:** `src/types/graph.ts`

**Current node types:** `'message' | 'branch-point' | 'clip' | 'summary'`

Branch-point is currently detected dynamically via child count in `GraphCanvas.tsx` (line 141). This should remain dynamic — a node *becomes* a branch point when it gets multiple children. But we need additional explicit types:

```ts
export type NodeType =
  | 'message'        // standard conversation node (unchanged)
  | 'clip'           // imported memory from another session (unchanged)
  | 'summary'        // compressed branch representation (unchanged)
  | 'decision'       // explicit decision node (user marked a choice point)
  | 'inherited';     // node imported via clip spawn (dashed border)
```

Remove `'branch-point'` from the type enum — it's a visual state derived from child count, not a semantic type.

Add `isInherited` flag to `GraphNode`:
```ts
export interface GraphNode {
  // ... existing fields ...
  readonly isInherited?: boolean;  // true if this node came from a clip spawn
}
```

**Acceptance criteria:**
- [ ] Branch-point visual (hexagon) still renders correctly via child-count detection
- [ ] `decision` type renders with split-circle shape from spec
- [ ] `inherited` nodes render with dashed stroke
- [ ] Existing graph documents load without breaking

---

## Sprint 2: Physics & Performance

**Goal:** Move the force simulation off the main thread and prepare the rendering pipeline for larger graphs.
**Estimated tasks:** 5
**Depends on:** Sprint 1

### 2.1 — Web Worker for Physics Simulation
**Source:** Understand Anything's Web Worker pattern for dagre layout
**Files:** New `src/lib/physics-worker.ts`, new `src/lib/physics-bridge.ts`, `src/components/canvas/GraphCanvas.tsx`, `src/lib/simulation.ts`

**Why:** The current simulation runs `tickSimulation()` inside the rAF loop on the main thread (`GraphCanvas.tsx` line 256). With 50+ nodes, the O(n^2) repulsion calculation takes measurable time. Moving physics to a Worker frees the main thread for smooth 60fps SVG rendering.

**Create `src/lib/physics-worker.ts`:**
```ts
// Runs in a Web Worker
// Receives: bodies Record + edges array
// Returns: updated positions Record<string, {x, y}>
// Uses the exact same simulation.ts logic — import it directly

self.onmessage = (e: MessageEvent) => {
  const { type, bodies, edges, sim } = e.data;
  if (type === 'tick') {
    const moved = tickSimulation(sim, bodies, edges);
    // Extract positions only (not full bodies) to minimize transfer
    const positions: Record<string, { x: number; y: number }> = {};
    for (const [id, body] of Object.entries(bodies)) {
      positions[id] = { x: (body as PhysicsBody).x, y: (body as PhysicsBody).y };
    }
    self.postMessage({ type: 'positions', positions, moved, sim });
  }
};
```

**Create `src/lib/physics-bridge.ts`:**
```ts
// Main thread bridge to the physics worker
// Maintains the canonical bodies Record on the main thread for drag/render
// Sends snapshot to worker each frame, applies returned positions

export class PhysicsBridge {
  private worker: Worker;
  private pending = false;
  private onPositions: (positions: Record<string, {x:y}>) => void;

  constructor(onPositions: (pos: Record<string, {x:number; y:number}>) => void) {
    this.worker = new Worker(new URL('./physics-worker.ts', import.meta.url));
    this.onPositions = onPositions;
    this.worker.onmessage = (e) => {
      this.pending = false;
      if (e.data.type === 'positions') {
        this.onPositions(e.data.positions);
      }
    };
  }

  tick(bodies: Record<string, PhysicsBody>, edges: readonly GraphEdge[], sim: SimulationState) {
    if (this.pending) return; // Skip frame if worker is still processing
    this.pending = true;
    // Structured clone — bodies are plain objects, this is fast
    this.worker.postMessage({ type: 'tick', bodies, edges, sim });
  }

  dispose() { this.worker.terminate(); }
}
```

**Changes to `GraphCanvas.tsx`:**
1. Replace direct `tickSimulation()` call (line 256) with `physicsBridge.tick()`.
2. In the bridge callback, apply returned positions to `bodies` on the main thread.
3. Keep drag handling on the main thread (fx/fy pinning stays synchronous).
4. Fallback: if Worker creation fails (SSR, unsupported), fall back to main-thread simulation.

**Acceptance criteria:**
- [ ] Physics simulation runs in a Web Worker
- [ ] Main thread rAF loop only does rendering (drawGrid + renderSVG)
- [ ] Drag interaction remains responsive (no round-trip delay)
- [ ] Graceful fallback to main thread if Worker unavailable
- [ ] No visual difference from current behavior

### 2.2 — Edge Rendering by Type
**Source:** Understand Anything's colored edge types + Dreamcacher's edge type expansion (Sprint 1.1)
**Files:** `src/components/canvas/GraphCanvas.tsx` (lines 121-136)

**Current:** All edges render with the same dash pattern, differentiated only by `main` vs `branch`.

**Target:** Each edge type has a distinct visual signature:

| EdgeType | Stroke Color | Pattern | Width | Notes |
|----------|-------------|---------|-------|-------|
| `reply` | `T.dim` (40% white) | Animated dashes `4 6` | 1.3 | Default conversation flow |
| `branch` | `C.branch` at 35% | Animated dashes `6 4` | 1.2 | Divergence |
| `regeneration` | `ACCENT` at 25% | Short dashes `3 5` | 1.0 | Alternative responses |
| `summarizes` | `T.invisible` | Dots `1 4` | 0.8 | Meta-connection |
| `clips_to` | `C.memory` at 20% | Long dashes `8 4` | 1.0 | Clip relationship |
| `references` | `T.ghost` at 15% | Alternating `6 2 2 2` | 0.8 | Cross-reference |

**Changes:**
1. Create an `EDGE_STYLES` lookup object in `GraphCanvas.tsx` mapping `EdgeType` → `{ stroke, dashArray, width }`.
2. Replace the inline style selection (lines 130-131) with a lookup.
3. Update spring rest lengths in `simulation.ts` — `regeneration` edges should pull siblings close together (shorter rest), `summarizes` edges should be longer (summary floats above).

**Acceptance criteria:**
- [ ] Each edge type visually distinct at LOD 1+
- [ ] At LOD 0 (dots only), all edges render as uniform thin lines
- [ ] Physics constants differ per edge type (rest length, stiffness)

### 2.3 — LOD Rendering Refinement
**Files:** `src/components/canvas/GraphCanvas.tsx`

**Current:** Two LOD thresholds (`LOD_DOTS = 0.35`, `LOD_LABELS = 0.65`) with hard transitions.

**Target (from spec):** Four LOD levels with crossfade:

| Level | Zoom | Content |
|-------|------|---------|
| 0 | < 25% | Dots and lines only. Topology. No labels, no badges. |
| 1 | 25-50% | Shapes visible. User/AI/clip/summary distinguishable by shape. |
| 2 | 50-75% | Short labels. Branch count badges. Streaming indicators. |
| 3 | > 75% | Full labels. All badges. Model icons. Thinking indicators. |

**Changes:**
1. Replace binary LOD check with 4-level system: `const lod = scale < 0.25 ? 0 : scale < 0.5 ? 1 : scale < 0.75 ? 2 : 3;`
2. Add crossfade at transitions: when zoom is within 5% of a threshold, interpolate opacity between the two levels. Example: at 48% zoom, LOD 1 elements render at full opacity, LOD 2 elements render at 0.6 opacity (fading in).
3. LOD 0: render nodes as simple filled circles (no stroke differentiation, no inner elements). Edges as plain lines (no dashes).
4. LOD 1: add shape differentiation (hexagon for branch points, dashed border for clips). No labels.
5. LOD 2: add short labels (12 char), branch count badges, streaming ring.
6. LOD 3: full labels, model icons, thinking double-ring, all metadata indicators.

**Acceptance criteria:**
- [ ] Four distinct LOD levels render correctly
- [ ] Crossfade is smooth (no popping)
- [ ] LOD 0 is fast enough for 500+ nodes (minimal SVG elements per node)

### 2.4 — Dead-End Branch Dimming
**Source:** PRODUCT.md spec
**Files:** `src/components/canvas/GraphCanvas.tsx`, `src/stores/graph-store.ts`

**Logic:**
1. A "dead end" is a leaf node (no children) whose branch has had no user activity for > 5 minutes.
2. All nodes on a dead-end branch (from the branch point to the leaf) dim to `E[5]` stroke, `0.15` opacity for labels.
3. Dead-end detection runs once per second (not per frame) via a separate interval.

**Changes:**
1. `graph-store.ts` — Add `getDeadEndBranches(): Set<string>` that walks the tree, finds leaf nodes with `timestamp` older than 5 minutes, and traces back to the nearest branch point, collecting all node IDs on that branch.
2. `GraphCanvas.tsx` — In `renderSVG()`, check each node against the dead-end Set. If matched, reduce opacity and use `E[5]` for stroke colors.
3. Add a `setInterval` (1000ms) in the rAF setup effect that calls `getDeadEndBranches()` and stores the result in a ref.

**Acceptance criteria:**
- [ ] Dead-end branches visually dim after 5 minutes of inactivity
- [ ] Dimming is branch-scoped (only the dead branch, not the whole graph)
- [ ] Sending a new message on a dead branch revives it immediately
- [ ] Performance: dead-end check runs at 1Hz, not 60Hz

---

## Sprint 3: Tier 1 — Backtrack (Branching)

**Goal:** Complete the branching experience — visualization, navigation, and branch-point interactions.
**Estimated tasks:** 6
**Depends on:** Sprint 1 (typed edges), Sprint 2 (LOD, edge rendering)

### 3.1 — Branch Highlight Mode
**Source:** Understand Anything's diff overlay
**Files:** `src/stores/ui-store.ts`, `src/components/canvas/GraphCanvas.tsx`, `src/lib/effects.ts`

**Interaction:** Right-click a branch point → "Show all paths" → all descendant branches highlight with distinct luminance levels, non-branch nodes fade to 20% opacity.

**Changes:**
1. `ui-store.ts` — Add:
   ```ts
   highlightMode: null | {
     type: 'branches';
     branchPointId: string;
     branchPaths: Record<string, string[]>; // branchId → ordered node IDs
   };
   setHighlightMode: (mode: UIState['highlightMode']) => void;
   ```
2. `graph-store.ts` — Add `getBranchPaths(nodeId: string): Record<string, string[]>` that finds all child branches from a node, follows each to its leaf, and returns the node IDs per branch.
3. `GraphCanvas.tsx` `renderSVG()` — When `highlightMode` is active:
   - Non-highlighted nodes: opacity 0.15, stroke `E[5]`
   - Each branch path gets a distinct luminance level from the text hierarchy (`T.primary`, `T.secondary`, `T.tertiary`, `T.subtle`) — up to 4 branches visually distinct
   - Branch edges glow at full opacity
   - The branch point node itself renders with `ACCENT` ring
4. `effects.ts` — Add a pulse animation that travels along highlighted edges (particle moving from branch point to leaf).
5. `ContextMenu.tsx` — Add "Show all paths" menu item for nodes that are branch points.

**Acceptance criteria:**
- [ ] "Show all paths" activates highlight mode
- [ ] Each branch visually distinct through luminance
- [ ] Non-branch nodes fade without disappearing
- [ ] Clicking empty canvas or pressing Escape exits highlight mode
- [ ] Pulse animation visible along branch edges

### 3.2 — Branch Preview Popover
**Source:** Claude Island's session list pattern
**Files:** New `src/components/ui/BranchPreview.tsx`, `src/components/canvas/GraphCanvas.tsx`

**Interaction:** Hover a branch-point node for 500ms → popover appears showing each branch as a compact row:

```
┌─────────────────────────────────┐
│ Branch 1: "What about using..." │
│   → 4 nodes · 2m ago           │
│ Branch 2: "Let's try a diff..."│
│   → 7 nodes · 8m ago           │
│ Branch 3: "Actually, back to..."│
│   → 2 nodes · 12m ago  · stale │
└─────────────────────────────────┘
```

**BranchPreview.tsx:**
- Glass-effect popover (uses `glass` from theme)
- Positioned above the hovered node (converts world coords to screen coords)
- Each row: first user message text (truncated), node count, recency, stale indicator
- Click a row → navigate to that branch's leaf node (set as activeNodeId, pan canvas to it)
- Dismiss on mouse leave or click elsewhere

**Changes:**
1. Create `BranchPreview.tsx` component.
2. `GraphCanvas.tsx` — Add hover timer logic: on `handleMouseMove`, if hovering a branch-point node for > 500ms, set `ui-store.branchPreview: { nodeId, screenX, screenY }`.
3. `ui-store.ts` — Add `branchPreview: { nodeId: string; x: number; y: number } | null`.
4. `page.tsx` — Add `<BranchPreview />` to the render tree.

**Acceptance criteria:**
- [ ] Popover appears after 500ms hover on branch points only
- [ ] Shows correct branch count, first message, recency
- [ ] Click navigates to branch leaf
- [ ] Stale branches marked visually
- [ ] Popover repositions correctly as canvas pans/zooms

### 3.3 — Regeneration as Branching
**Files:** `src/components/ui/ContextMenu.tsx`, `src/components/ui/FloatingUI.tsx`

**Current:** "Regenerate" menu item exists but does nothing (line 125 — `onClick` just closes menu).

**Target:** Regeneration creates a sibling branch:
1. Find the parent of the selected AI node (the user message that prompted it).
2. Create a new AI node as another child of that same user message.
3. Connect with a `regeneration` edge.
4. Send the same context to the API with a different random seed / temperature nudge.
5. The parent user node now has two children → becomes a branch point visually.

**Changes:**
1. `ContextMenu.tsx` — Implement `handleRegenerate`: get parentId from selected node, create new AI node positioned offset to the right, add `regeneration` edge from user parent to new AI node, call `/api/chat` with the same ancestral path.
2. `FloatingUI.tsx` `CanvasTools` — Add a "Regen" button to the floating toolbar when an AI node is selected.
3. `api/chat/route.ts` — Accept optional `temperature` parameter. Regeneration calls use `temperature: 1.0` (vs default `0.7` or model default) for diversity.

**Acceptance criteria:**
- [ ] "Regenerate" creates a visible sibling branch
- [ ] Regeneration edge renders with distinct style (from Sprint 2.2)
- [ ] Original and regenerated responses are both visible and navigable
- [ ] Parent user node morphs to branch-point shape (hexagon)

### 3.4 — Canvas Auto-Pan to Active Node
**Files:** `src/components/canvas/GraphCanvas.tsx`, `src/stores/ui-store.ts`

**Problem:** When a new node is created off-screen (e.g., branching from a node at the edge of the viewport), the user has to manually pan to find it.

**Solution:** After node creation, smoothly animate the canvas to center the new node.

**Changes:**
1. `ui-store.ts` — Add `animateTo(worldX: number, worldY: number, duration?: number)` action that sets a target pan/zoom and a start time.
2. `GraphCanvas.tsx` rAF loop — Check for active animation target. If present, interpolate `panX`/`panY` toward target using easeOutCubic over the duration (default 400ms).
3. `FloatingInput.sendMessage()` — After creating new nodes, call `animateTo()` targeting the AI node position.

**Acceptance criteria:**
- [ ] Canvas smoothly pans to new nodes after creation
- [ ] Animation doesn't interrupt user if they're already panning
- [ ] User can interrupt auto-pan by clicking/dragging

---

## Sprint 4: Tier 2 — Clip & Spawn

**Goal:** Implement the memory system — select subgraphs, save as clips, spawn new sessions from clips.
**Estimated tasks:** 7
**Depends on:** Sprint 1 (multi-select, typed edges), Sprint 3 (branch highlight for path visualization)

### 4.1 — Clip Creator UI
**Source:** Clui CC's attachment chips pattern
**Files:** New `src/components/ui/ClipCreator.tsx`, `src/stores/ui-store.ts`, `src/stores/graph-store.ts`

**Interaction flow:**
1. User Shift+clicks multiple nodes (or lasso-selects from Sprint 1.4)
2. A floating pill appears above the selection: "3 nodes selected — [Clip] [Clear]"
3. Clicking "Clip" opens a compact naming popover (text input + "Save")
4. On save: extracts the selected subgraph (nodes + internal edges), creates a Memory with `type: 'subgraph'`

**ClipCreator.tsx:**
- Positioned at the centroid of selected nodes (world → screen transform)
- Glass-effect pill with node count, Clip button, Clear button
- Clip action opens inline name input (no modal)
- Saves to memory-store with all selected node IDs and edges between them

**Changes:**
1. Create `ClipCreator.tsx`.
2. `graph-store.ts` — Add `getSubgraph(nodeIds: ReadonlySet<string>): { nodes: GraphNode[]; edges: GraphEdge[] }` that returns only the nodes and edges within the selection.
3. `types/memory.ts` — Extend `Memory` type:
   ```ts
   export type MemoryType = 'node' | 'path' | 'subgraph';
   export interface Memory {
     // ... existing fields ...
     readonly type: MemoryType;
     readonly nodeIds?: readonly string[];   // for subgraph type
     readonly edgeIds?: readonly string[];   // for subgraph type
     readonly graphSnapshot?: {              // for spawn
       readonly nodes: readonly GraphNode[];
       readonly edges: readonly GraphEdge[];
     };
   }
   ```
4. `memory-store.ts` — Update `addMemory` to handle new `subgraph` type. Store the full graph snapshot for spawning.
5. `page.tsx` — Add `<ClipCreator />` to render tree.

**Acceptance criteria:**
- [ ] Multi-select → ClipCreator pill appears
- [ ] Naming and saving produces a Memory in the shelf
- [ ] Saved clip contains full graph snapshot (nodes + edges)
- [ ] ClipCreator disappears after save or clear

### 4.2 — Clip → Spawn Session
**Source:** Dreamcacher PRODUCT.md spec
**Files:** `src/stores/session-store.ts`, `src/stores/memory-store.ts`, `src/components/ui/MemoryShelf.tsx`

**Interaction:** In MemoryShelf, click "Spawn" on a subgraph clip → new session is created with the clipped nodes pre-loaded as inherited nodes.

**Changes:**
1. `session-store.ts` — Add `spawnFromClip(memory: Memory): string` that:
   - Creates a new session
   - Loads the clip's `graphSnapshot.nodes` with `isInherited: true` flag set
   - Loads the clip's `graphSnapshot.edges`
   - Sets the clip's leaf node as `activeNodeId`
   - Adds `clips_to` edges from inherited nodes back to their source session (cross-session reference — stored as metadata, not rendered)
2. `MemoryShelf.tsx` — Add "Spawn" button on subgraph-type memory cards. Wire to `spawnFromClip`.
3. `GraphCanvas.tsx` — Render `isInherited` nodes with dashed stroke (SVG `stroke-dasharray="4 2"`), slightly reduced opacity.

**Acceptance criteria:**
- [ ] Spawn creates a new session with inherited nodes visible
- [ ] Inherited nodes have dashed border (visually distinct)
- [ ] Inherited nodes are read-only (cannot be edited or deleted)
- [ ] Active node is set to the clip's leaf → user can immediately continue
- [ ] Session name defaults to "From: [clip name]"

### 4.3 — Memory Shelf Search
**Source:** Understand Anything's Fuse.js fuzzy search
**Files:** `src/components/ui/MemoryShelf.tsx`, `package.json`

**Changes:**
1. `package.json` — Add `fuse.js` dependency.
2. `MemoryShelf.tsx` — Add a search input at the top of the shelf. Create a Fuse instance indexed on `name`, `content`, `tags`. Filter displayed memories by search query. Show match highlights.
3. Search is local and instant — no debounce needed for the small dataset.

**Acceptance criteria:**
- [ ] Search filters memories by name, content, and tags
- [ ] Empty search shows all memories
- [ ] Match highlighting visible in results

### 4.4 — Clip Preview Thumbnail
**Files:** `src/components/ui/MemoryShelf.tsx`

**Target:** Each subgraph-type memory card shows a tiny graph thumbnail — the clip's topology rendered at LOD 0 (dots and lines only) inside a 60x40px container.

**Implementation:**
1. In `MemoryShelf.tsx`, for each memory with `graphSnapshot`, render a mini SVG canvas:
   - Scale all node positions to fit within 60x40px
   - Render nodes as 2px dots, edges as 0.5px lines
   - Use `E[5]` for dots, `E[7]` for edges
2. This is a static render — no physics, no interaction.

**Acceptance criteria:**
- [ ] Subgraph clips show topology thumbnail
- [ ] Thumbnail correctly represents the clip's shape
- [ ] No performance impact (rendered once on memory load)

### 4.5 — Context Menu Clip Actions
**Files:** `src/components/ui/ContextMenu.tsx`

**Enhance existing "Save as memory" to support subgraph context:**
1. Single node selected → "Save as memory" (existing behavior)
2. Multi-select active → "Clip selection" (creates subgraph memory)
3. Add "Trace origin" for clip/inherited nodes → navigates to the source session and node

**Acceptance criteria:**
- [ ] Context menu adapts to selection state (single vs. multi)
- [ ] Clip selection saves the full multi-select as a subgraph memory
- [ ] "Trace origin" navigates back to source

---

## Sprint 5: Tier 3 — Decision Transparency

**Goal:** Make the AI's reasoning visible — path tracing, tool transparency, timeline view, branch comparison.
**Estimated tasks:** 8
**Depends on:** Sprint 1 (typed edges), Sprint 3 (branch highlight)

### 5.1 — Path Trace
**Source:** Understand Anything's tour system
**Files:** New `src/components/ui/PathTrace.tsx`, `src/stores/ui-store.ts`, `src/components/canvas/GraphCanvas.tsx`

**Interaction:** Select any node → press `T` → the full chain from root to that node highlights. Everything else fades to 15% opacity. Arrow keys step through the path. The canvas auto-pans to center each step.

**Changes:**
1. `ui-store.ts` — Add:
   ```ts
   pathTrace: {
     nodeIds: readonly string[];
     currentIndex: number;
   } | null;
   startPathTrace: (nodeId: string) => void;  // calls getAncestralPath, stores result
   stepPathTrace: (direction: 1 | -1) => void;
   exitPathTrace: () => void;
   ```
2. Create `PathTrace.tsx` — A floating bar at the bottom showing: step counter ("3 / 12"), previous/next buttons, the current node's short label, and the role indicator. Keyboard: ← → for stepping, Escape to exit.
3. `GraphCanvas.tsx` — When `pathTrace` is active:
   - Highlighted nodes render at full opacity with `ACCENT` ring on the current step
   - Non-path nodes render at 15% opacity
   - Edges on the path render at full opacity with animated pulse
   - Current step node has a stronger glow / breathing animation
4. `GraphCanvas.tsx` — Add keyboard listener for `T` (start trace), arrow keys (step), Escape (exit).
5. Use `animateTo()` (from Sprint 3.4) to auto-pan to each step.

**Acceptance criteria:**
- [ ] `T` activates path trace from selected node to root
- [ ] Arrow keys step through the path with auto-pan
- [ ] Non-path elements fade
- [ ] Current step has clear visual indicator
- [ ] Escape exits trace mode
- [ ] Step counter visible in floating bar

### 5.2 — Tool Call Transparency
**Source:** Clui CC's ToolResultViews and permission cards
**Files:** `src/types/graph.ts`, `src/app/api/chat/route.ts`, `src/components/ui/Inspector.tsx`, new `src/components/ui/ToolCard.tsx`

**Current limitation:** The API route streams plain text. Tool calls made by Claude during extended thinking are not captured or displayed.

**Phase 1 (this sprint):** Capture tool use from the streaming response. This requires switching from plain text streaming to structured event streaming (if using Claude API directly) or parsing OpenRouter's stream for tool_use events.

**Changes:**
1. `graph.ts` — Add to `GraphNode.metadata`:
   ```ts
   readonly toolCalls?: readonly {
     readonly name: string;
     readonly input: Record<string, unknown>;
     readonly output?: string;
     readonly duration?: number;
   }[];
   ```
2. `api/chat/route.ts` — If the model supports tool use, parse tool_use events from the stream and include them in a structured response format. For now, capture the tool names and inputs from the streaming chunks.
3. Create `ToolCard.tsx` — A compact, expandable card showing: tool icon, tool name, truncated input, expandable output. Styled with glass effect at `E[3]` elevation. Tool names color-coded by category (file tools = `T.tertiary`, search tools = `T.subtle`, code tools = `T.secondary`).
4. `Inspector.tsx` — Below the "Reasoning" section, add a "Tool Use" section that renders `ToolCard` for each tool call in the node's metadata.

**Acceptance criteria:**
- [ ] Tool calls captured from streaming response (when available)
- [ ] Inspector shows tool cards with name, input, and output
- [ ] Tool cards are expandable/collapsible
- [ ] Nodes with tool calls have a subtle badge at LOD 2+ (small wrench icon)

### 5.3 — Timeline View (Linear Mode)
**Source:** Claude Island's chat view
**Files:** New `src/components/ui/TimelineView.tsx`, `src/stores/ui-store.ts`, `src/app/page.tsx`

**Interaction:** Button in TopControls toggles between graph view (default) and timeline view. Timeline is a scrollable panel (400px wide) that slides in from the right, overlaying the canvas. It shows the current branch's conversation in linear order.

**TimelineView.tsx:**
- Renders `getAncestralPath(activeNodeId)` as a scrollable list of messages
- Each message: role indicator (dot), timestamp, model badge (for AI), full text content
- AI messages with thinking steps: expandable accordion
- AI messages with tool calls: inline ToolCards
- Current active node is highlighted
- Click any message → sets that node as selected in the graph (canvas pans to it if in graph view)
- Markdown rendering for AI messages (add `react-markdown` to dependencies — already used by Clui CC, lightweight)

**Changes:**
1. `ui-store.ts` — Add `timelineOpen: boolean` and `toggleTimeline()`.
2. Create `TimelineView.tsx`.
3. `FloatingUI.tsx` `TopControls` — Add timeline toggle button (list icon).
4. `page.tsx` — Add `<TimelineView />`.

**Note:** This is a *reading mode*, not a replacement for the graph. The graph is always the primary interface. The timeline is the "flat" projection for sequential reading.

**Acceptance criteria:**
- [ ] Timeline shows complete conversation path (root → active node)
- [ ] Thinking steps expandable
- [ ] Tool calls shown inline
- [ ] Click message → selects node in graph
- [ ] Smooth slide-in/out animation
- [ ] Scrolls to bottom on new messages

### 5.4 — Branch Comparison View
**Source:** Understand Anything's diff overlay + layer grouping
**Files:** New `src/components/ui/BranchCompare.tsx`, `src/stores/ui-store.ts`, `src/components/canvas/GraphCanvas.tsx`

**Interaction:** Select a branch point → press `C` → comparison mode activates. Shows two (or more) branches side by side in a split-panel overlay.

**BranchCompare.tsx:**
- Full-width overlay with vertical split
- Left/right panels each show one branch's timeline (reuses TimelineView internals)
- Shared ancestor nodes shown in a header section above the split
- Divergent messages highlighted
- Toggle: "Graph view" renders the branches as a mini force-directed graph within each panel (reuses canvas rendering at fixed scale)
- Branch selector: if > 2 branches, dropdown to choose which two to compare

**Changes:**
1. `ui-store.ts` — Add:
   ```ts
   branchCompare: {
     branchPointId: string;
     leftBranchLeaf: string;
     rightBranchLeaf: string;
   } | null;
   startBranchCompare: (nodeId: string) => void;
   exitBranchCompare: () => void;
   ```
2. `graph-store.ts` — Add `getBranchLeaves(nodeId: string): string[]` that returns the leaf node IDs of each branch from a branch point.
3. Create `BranchCompare.tsx`.
4. `GraphCanvas.tsx` — Add `C` keyboard shortcut when a branch-point node is selected.
5. `page.tsx` — Add `<BranchCompare />`.

**Acceptance criteria:**
- [ ] `C` activates comparison from a branch point
- [ ] Two branches shown side by side
- [ ] Shared ancestor visible in header
- [ ] Divergent content highlighted
- [ ] Can switch which branches are compared (if > 2)
- [ ] Escape exits comparison mode

### 5.5 — Enhanced Context Builder
**Files:** `src/lib/context-builder.ts`

**Current:** Walks the ancestral path and builds a flat `messages[]` array.

**Enhancements:**
1. **Sibling summaries:** When the active node is on a branch, include a brief summary of sibling branches as a system message addendum. "Note: the user previously explored an alternative path where [summary]." This gives Claude awareness of the branching context.
2. **Clip context:** When inherited nodes are in the path, mark them in the system prompt: "The following context was imported from a previous session via a clip."
3. **Token counting:** Track approximate token count of the context. If approaching 80% of the model's context window, summarize older nodes instead of including full text.

**Changes:**
1. `context-builder.ts` — Expand `buildMessages` to:
   - Accept the full graph (not just the path) to access sibling branches
   - Include sibling branch summaries when relevant
   - Mark inherited node context
   - Implement rough token estimation (chars / 4)
   - Truncate/summarize when approaching budget

**Acceptance criteria:**
- [ ] Sibling branch context included when branching
- [ ] Inherited nodes marked in system prompt
- [ ] Token budget respected (no context overflow)
- [ ] Context quality doesn't degrade for linear conversations

---

## Sprint 6: Session Navigation

**Goal:** Build the notch-style session navigator and cross-session activity awareness.
**Estimated tasks:** 5
**Depends on:** Sprint 1 (session state machine), Sprint 4 (clip/spawn)

### 6.1 — Session Pill (Notch Pattern)
**Source:** Claude Island's Dynamic Island three-state model
**Files:** New `src/components/ui/SessionPill.tsx`, `src/components/ui/FloatingUI.tsx`, `src/stores/ui-store.ts`

**Three states:**

**Collapsed (default):**
- Centered pill at top of canvas: 160px wide, 32px tall
- Shows: session name (truncated) + phase indicator dot
- Phase dot color: gold = streaming, `T.primary` = waiting, `T.dim` = idle, `T.ghost` = stale
- Click → Open state
- Hover 1s → Peek state

**Peek (hover):**
- Pill expands to 300px wide, 80px tall
- Shows: current session name + last message preview + node count
- Below: 2-3 other recent sessions as compact rows (name + phase dot + recency)
- Mouse leave → Collapsed

**Open (click):**
- Pill expands to 360px wide, auto-height (max 400px)
- Full session list with: name, phase dot, node count, last activity, graph thumbnail (LOD 0)
- "New Session" button at top
- Double-click session name to rename (inline editing)
- Click session → switch
- Click outside or Escape → Collapsed

**Animation:** Spring-based height/width transition using CSS transitions with `cubic-bezier(0.16, 1, 0.3, 1)`.

**Changes:**
1. Create `SessionPill.tsx` with three-state rendering.
2. `ui-store.ts` — Add `sessionPillState: 'collapsed' | 'peek' | 'open'`.
3. `FloatingUI.tsx` — Replace the current `TopControls` session dropdown and logo pill with `SessionPill`. Move model selector to a separate floating element (top-right).
4. `session-store.ts` — Add `getSessionSummaries(): SessionSummary[]` that returns name, phase, node count, last message preview, and last activity time for each session.

**Acceptance criteria:**
- [ ] Three states with smooth transitions
- [ ] Phase indicator dot accurate per session
- [ ] Session switching works from all three states
- [ ] New session creation works
- [ ] Rename via double-click works
- [ ] Hover → peek → mouse leave → collapsed is smooth
- [ ] Graph thumbnail renders in Open state

### 6.2 — Activity Feed
**Source:** Claude Island's multi-session monitoring
**Files:** New `src/components/ui/ActivityFeed.tsx`, `src/stores/session-store.ts`

**Inside the Session Pill's Open state**, below the session list: a reverse-chronological activity feed showing recent events across all sessions.

**Events:**
- "AI responded" — session name, time ago
- "Branch created" — session name, branch point label
- "Clip saved" — clip name
- "Session created" — session name

**Implementation:**
1. `session-store.ts` — Add `activityLog: readonly ActivityEvent[]` to the store. Each event: `{ type, sessionId, timestamp, description }`. Max 50 events, FIFO.
2. `SessionInit.tsx` — Subscribe to graph and memory store changes. On new node → log "AI responded" or "User message". On new edge with `type: 'branch'` → log "Branch created". On new memory → log "Clip saved".
3. Create `ActivityFeed.tsx` — Compact list of events with relative timestamps.

**Acceptance criteria:**
- [ ] Activity feed shows events from all sessions
- [ ] Events are reverse-chronological
- [ ] Tapping an event switches to that session
- [ ] Feed is capped at 50 events

### 6.3 — Keyboard Shortcuts System
**Files:** `src/components/canvas/GraphCanvas.tsx`, `src/stores/ui-store.ts`

**Consolidate all keyboard shortcuts into a single handler:**

| Key | Action | Sprint |
|-----|--------|--------|
| `T` | Start/exit path trace | 5.1 |
| `C` | Start/exit branch compare | 5.4 |
| `Escape` | Exit any overlay mode (trace, compare, highlight, timeline) | All |
| `←` `→` | Step through path trace | 5.1 |
| `⌘K` | Focus search (future) | — |
| `Delete`/`Backspace` | No action (prevent accidental deletion) | — |
| `Space` | Fit graph to viewport | 6 |
| `/` | Focus floating input | 6 |
| `I` | Toggle inspector for selected node | 6 |
| `M` | Toggle memory shelf | 6 |
| `L` | Toggle timeline view | 5.3 |

**Changes:**
1. `GraphCanvas.tsx` — Consolidate keyboard handling into a single `useEffect` with a `switch` on `e.key`.
2. Ensure shortcuts don't fire when text input is focused.
3. `ui-store.ts` — Add `fitToView()` action that calculates the bounding box of all nodes and sets pan/zoom to fit them in the viewport.

**Acceptance criteria:**
- [ ] All shortcuts listed above work
- [ ] Shortcuts disabled when input is focused
- [ ] Space → fit to view works correctly
- [ ] No shortcut conflicts

---

## Sprint 7: Polish & Integration

**Goal:** Final quality pass — performance, edge cases, visual polish, and integration testing.
**Estimated tasks:** 6
**Depends on:** All previous sprints

### 7.1 — Performance Profiling
- Profile with 100, 200, 500 node graphs
- Identify and fix any rendering bottleneck
- Verify Web Worker physics stays below 16ms per tick
- Verify SVG rendering stays below 8ms per frame
- Memory profiling: IndexedDB for large sessions, GC pauses

### 7.2 — Visual Consistency Audit
- All components use theme tokens (E, T, C, ACCENT, glass)
- No hardcoded colors remain from pre-theme-update era
- Glass effect consistent across all floating elements
- Elevation hierarchy correct: canvas < floating UI < overlays < modals
- Node rendering matches the "petri dish" creative direction

### 7.3 — Edge Case Handling
- Empty session (no nodes) — all overlays handle gracefully
- Single node session — path trace, branch compare handle gracefully
- Very long text in nodes — truncation, overflow handling
- Rapid branching — physics doesn't explode with many simultaneous new nodes
- Session with 0 edges (disconnected nodes from a bug) — doesn't crash
- IndexedDB quota exceeded — graceful degradation message

### 7.4 — Animation Consistency
- All transitions use the same easing curve: `cubic-bezier(0.16, 1, 0.3, 1)`
- Spring animations for node entrances (already in effects.ts)
- No janky transitions between overlay modes
- Streaming pulse, selection ring, edge animation all synchronized to the same rAF clock

### 7.5 — Accessibility Baseline
- All interactive elements keyboard-reachable
- Focus visible indicators on all buttons
- Screen reader labels on floating UI buttons
- Sufficient contrast in the luminance hierarchy (verify WCAG AA against E and T scales)
- Reduced motion: respect `prefers-reduced-motion` — disable screen shake, reduce entrance animations

### 7.6 — Integration Smoke Test
- End-to-end flow: New session → type message → receive AI response → branch → regenerate → clip → spawn → continue in new session
- Path trace works across inherited nodes
- Timeline view shows inherited node context
- Branch comparison works for regenerated responses
- Session pill shows all sessions with correct phases
- Save/load cycle preserves all data (nodes, edges, positions, clips, sessions)

---

## File Change Summary

| Sprint | Files Modified | Files Created | New Dependencies |
|--------|---------------|---------------|------------------|
| 1 | 9 | 2 | — |
| 2 | 4 | 2 | — |
| 3 | 5 | 2 | — |
| 4 | 5 | 2 | fuse.js |
| 5 | 6 | 4 | — |
| 6 | 4 | 2 | — |
| 7 | — (fixes across all) | — | — |
| **Total** | **~15 unique files** | **14 new files** | **1 dep** |

---

## Execution Notes

- **Each sprint is a commit boundary.** Sprint should be committable and functional at completion.
- **Tests:** Each sprint includes acceptance criteria that function as manual test scripts. Automated testing is deferred to post-MVP (the canvas is inherently visual — automated testing requires Playwright + screenshot comparison, which is Sprint 8+ work).
- **Theme dependency:** This plan assumes the Bumba-Dark theme update has landed. All color references use the new theme tokens (E, T, C, ACCENT, glass). If the theme changes during execution, color values here are illustrative — use whatever the theme exports.
- **Sprint ordering is strict.** Later sprints depend on earlier foundations. Sprints 3-5 can partially parallelize (they touch different files) but all depend on Sprint 1.
- **Context window management.** Each sprint has enough detail to execute independently after compaction. If context is compressed between sprints, this document contains all necessary file references and specifications to resume.
