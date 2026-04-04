# Dreamcacher Delight System

Interaction design specification for celebration moments. Every effect in this document passes a single filter: would a desk worker opening this tool between spreadsheets smile, or cringe? If the answer is cringe, it does not ship.

The existing effects system (`src/lib/effects.ts`) provides ripples, spring-ease node entrances, screen shake, drag trails, and streaming pulses. This spec builds on that foundation with GSAP (installed, unused) and extends the tick-based effects architecture. Nothing here replaces what works. The screen shake on branch creation stays. Everything new earns its place.

---

## Design Principles

**1. Peripheral, not central.** Effects happen at the edges of attention. The user's focus is on the conversation content. Delight lives in the corner of their eye -- a glow that fades, a ripple that dissipates, a subtle weight shift. If an effect demands the user's full attention, it is too loud.

**2. Physics over graphics.** The canvas already has a force simulation, spring easing, and inertia. Delight should feel like a natural consequence of physics -- things settle, things breathe, things have weight. Particle explosions and confetti are graphics. A node that lands with a satisfying bounce is physics. Physics belongs here. Graphics do not.

**3. Earned escalation.** The first message gets a quiet acknowledgment. The tenth branch gets a slightly warmer response. The system should notice sustained use and reward it proportionally. A single-message session and a 40-node exploration session should not produce the same celebration vocabulary.

**4. Chromatic restraint.** The palette is warm blacks and luminance hierarchy with a single red accent. Delight effects use the existing palette -- E[5] through E[7] for glows, T.subtle through T.secondary for pulses, ACCENT only when the system truly means it. No new colors. No rainbow. No gradient shimmer.

**5. Reducible to zero.** Every effect respects `prefers-reduced-motion`. The reduced version is not "no animation" -- it is instant state changes with opacity fades. The tool remains usable and even pleasant with all motion disabled. The delight is in the state change itself, not only in the transition.

---

## The Catalog

### 1. First Message Sent (Session Begins)

**Trigger:** User hits Enter on the first message of an empty session. Session phase transitions from `empty` to `active`.

**Response: Canvas Awakening**
The user node appears with the existing spring entrance (0.7s), but the canvas itself responds. The dot grid surrounding the new node brightens momentarily -- a 6-node radius circle of grid dots pulses from E[5] to E[7] and back over 600ms, as if the canvas recognized that something alive just appeared on it. A single ripple (existing system) emanates from the node position, but with a slightly larger maxRadius (160px vs default 120px) and warmer color (`rgba(200,195,185,0.12)` -- warm white, not cool).

The input bar's placeholder text crossfades from "Ask anything..." to "Thinking..." during the API call, then to the contextual state after the AI responds. This is not an effect -- it is information. But the crossfade (200ms) makes it feel alive.

**Intensity:** Subtle. The grid brightening is barely perceptible on first viewing. On the third session, the user will notice they miss it if it is absent.

**Duration:** Grid pulse 600ms (ease-out). Ripple 1200ms (existing maxAge). Total envelope: ~1.2s.

**Why it is tasteful:** The canvas has been dead -- an empty void with a dot grid. The first message is the moment the tool becomes alive. The grid brightening says "I noticed" without saying "CONGRATULATIONS ON YOUR FIRST MESSAGE." It is environmental, not celebratory.

**Game reference:** Dark Souls bonfire lighting. The environment responds to the player's first meaningful action with ambient light, not fanfare. Toned down: no flame particles, no sound -- just the grid dots catching light for a moment.

**Implementation notes:**
- New effect type: `GridPulse` in effects.ts -- `{ cx, cy, age, maxAge: 0.6, radius: 6 }` (6 grid-cell radius)
- Rendered in the grid canvas (drawGrid), not SVG -- multiply grid dot opacity by pulse falloff
- Triggered only when `nodes.length` transitions from 0 to 1

```
prefers-reduced-motion: Grid pulse skipped. Ripple skipped.
Node entrance uses opacity 0->1 over 200ms instead of spring scale.
```

---

### 2. AI Response Arrives (New Node Appears)

**Trigger:** A new AI node is added to the graph. The node starts with `label: '...'` (streaming placeholder) and transitions to real content.

**Response: Materialization**
The existing system handles this well: spring entrance with overshoot (peaks at ~1.15 scale, settles to 1.0 over 0.7s), screen shake (0.35s, intensity 3), and streaming pulse (faction-colored oscillation). This spec adds one layer.

**Addition: Gravitational Settle.** When the streaming completes (label changes from "..."), the node's ambient aura (the r*2 circle rendered at 3% opacity) briefly intensifies to 8% and contracts from r*2.5 to r*2 over 400ms with ease-out. This mimics an object that was vibrating during streaming and then settles into its resting state. The streaming pulse (sin-wave border) fades out over the existing 500ms setTimeout, and the aura contraction picks up where it leaves off.

**Intensity:** Subtle. The aura change is 5 percentage points of opacity on an already-dim element. Most users will not consciously register it. They will feel that the node "finished" and "landed."

**Duration:** Aura contraction 400ms. Total streaming-to-settled envelope depends on response length.

**Why it is tasteful:** The streaming phase already communicates "working." The settle communicates "done" through the same visual language -- aura and breathing -- rather than introducing a new vocabulary like checkmarks or color flashes. It is the absence of motion, not the presence of new motion, that signals completion.

**Game reference:** Breath of the Wild cooking animation. Ingredients hover and vibrate, then settle into the final dish with a gentle landing. The settle is quieter than the activity. Toned down: no upward lift, no sparkle -- just the aura tightening.

**Implementation notes:**
- New effect type: `AuraSettle` in effects.ts -- `{ nodeId, age, duration: 0.4 }`
- Triggered when streaming clears (existing setTimeout callback in GraphCanvas subscribe)
- Rendered as modified aura radius/opacity in renderSVG node loop

```
prefers-reduced-motion: Aura jumps to resting state immediately. No contraction animation.
```

---

### 3. Branch Created from a Node

**Trigger:** User sends a message from a node that already has children. Edge type resolves to `'branch'`. This is the moment the conversation diverges.

**Response: Fork Pulse (existing shake + new radial split)**
The existing screen shake (0.35s, intensity 3) fires. This stays -- Andrew likes it. On top of that, add a **fork line**: a thin line (stroke-width 0.8, color `rgba(176,176,176,0.2)` matching branch edge stroke) that extends outward from the parent node in both directions along the horizontal axis, reaching 80px in each direction over 300ms, then fading over the next 200ms. This traces the moment of divergence -- the conversation literally splitting.

The parent node (the branch point) gains a brief hexagonal highlight. If it was already a hex (branch points render as hexagons), its stroke brightens from E[5] to T.tertiary over 150ms, then decays back over 400ms. If this is the first branch (node was circular, now becomes hex), the shape morph itself is the celebration -- the geometry changing is sufficient.

**Intensity:** Moderate. The fork line is visible and intentional. This is the most structurally significant user action in Dreamcacher -- the moment the graph stops being a thread and becomes a graph. It deserves acknowledgment.

**Duration:** Fork line 500ms total (300ms extend + 200ms fade). Hex highlight 550ms (150ms brighten + 400ms decay). Screen shake 350ms (existing).

**Why it is tasteful:** The fork line is a direct visualization of what happened -- the path split. It is informational delight, not decorative delight. The user learns something about the tool's model by seeing it. After the first time, it reinforces the mental model of branching without being redundant, because the line traces the actual split direction.

**Game reference:** Slay the Spire path selection. When you choose a path, the unchosen paths dim and the chosen path briefly illuminates. The fork line is the moment of split made visible. Toned down: no path dimming (highlight mode handles that separately), just the split-line flash.

**Implementation notes:**
- New effect type: `ForkLine` in effects.ts -- `{ cx, cy, age, duration: 0.5, angle }` (angle computed from parent-to-new-node vector)
- Rendered as two SVG lines extending from center, with opacity = `(1 - age) * 0.6` for age > 0.6
- GSAP opportunity: the fork line extension is a natural GSAP timeline -- `gsap.fromTo(lineEl, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.out' })`
- Triggered in the graph store subscriber when a new `'branch'` edge is detected

```
prefers-reduced-motion: Fork line skipped. Hex highlight uses instant opacity jump, no transition.
Screen shake skipped (existing behavior should already respect this).
```

---

### 4. Memory Saved from a Node

**Trigger:** User saves a node as memory via context menu ("Save as memory") or drag-to-Remember hotspot. `addMemory()` fires in memory-store.

**Response: Impression Mark**
The source node receives a brief **impression ring** -- a single circle that contracts inward from r*1.8 to r*1.0 over 300ms with ease-in, opacity going from 0.3 to 0, in the memory color (`C.memory` = `#A0A0A0`). This is the inverse of a ripple: instead of expanding outward (something happened here), it contracts inward (something was taken from here). The visual metaphor is an impression being pressed -- a stamp, a seal.

Simultaneously, the memory shelf icon (left edge) pulses once: its opacity goes from the resting state to 1.0 and back over 400ms. If the shelf is closed, this is the only indication that something was stored. If the shelf is open, the new memory card slides in from the top with a 200ms ease-out translateY.

**Intensity:** Subtle. The impression ring is a single contracting circle that lasts 300ms. The shelf icon pulse is a brightness change on an existing element.

**Duration:** Impression ring 300ms. Shelf icon pulse 400ms. Memory card slide-in 200ms.

**Why it is tasteful:** Memory saving is a commitment action -- the user is saying "this matters enough to keep." The contracting ring acknowledges the action without celebrating it. It says "captured" in the language of the canvas (circles and opacity), not in the language of a filing cabinet (checkmarks and folder animations). The inward direction distinguishes it from ripples (which expand outward for creation events).

**Game reference:** Hollow Knight map markers. When you place a pin on the map, there is a subtle ink-bloom that contracts to the pin point. No fanfare, just confirmation that the mark was made. Toned down: no ink texture, no color -- just the geometric contraction in warm gray.

**Implementation notes:**
- New effect type: `Impression` in effects.ts -- `{ cx, cy, age, duration: 0.3, color: C.memory }`
- Rendered as SVG circle with `r = nodeR * (1.8 - 0.8 * easeIn(age))`, opacity `0.3 * (1 - age)`
- Shelf icon pulse: CSS transition on the existing memory toggle button, triggered via a transient Zustand flag `memoryJustSaved: boolean` that auto-clears after 400ms

```
prefers-reduced-motion: Impression ring skipped. Shelf icon uses opacity jump (0.6 -> 1.0)
with no transition, held for 400ms, then jumped back.
```

---

### 5. Clip Created from Multiple Nodes

**Trigger:** User multi-selects nodes (Shift+Click) and creates a subgraph clip. This bundles a conversation fragment into a reusable artifact.

**Response: Consolidation Gather**
The multi-selection rings (the dashed circles around selected nodes) **contract** toward the centroid of the selected group over 400ms. Each ring shrinks from its current radius to zero while moving toward the group center, as if the selected nodes are being pulled together into a single artifact. Once the rings converge (at ~300ms), a single ripple emanates from the centroid in memory color (`C.memory` at 15% opacity), confirming the clip was created.

The nodes themselves do not move -- only the selection indicators contract. The graph remains stable. This is critical: the user should never feel like clip creation disturbed their spatial arrangement.

**Intensity:** Moderate. This is a multi-step action that requires deliberate effort (multiple Shift+Clicks, then a save action). The gather animation rewards that effort and provides clear confirmation that the clip captured what was selected.

**Duration:** Ring contraction 400ms (ease-in). Centroid ripple 800ms (existing ripple system). Total envelope ~1.0s.

**Why it is tasteful:** The contraction visually narrates what happened: scattered selections became a single artifact. It teaches the user about clips through motion rather than through a toast notification that says "Clip created!" The motion is directional (inward, toward unity) rather than explosive (outward, toward celebration).

**Game reference:** Tetris line clear. Selected blocks contract and vanish into a unified result. The satisfaction is in the consolidation, not in particles or flashes. Toned down: no flash, no vanish -- the nodes persist, only the selection indicators consolidate.

**Implementation notes:**
- New effect type: `Consolidation` in effects.ts -- array of `{ fromX, fromY, toX, toY, age, duration: 0.4 }` (one per selected node)
- Rendered as contracting circles moving toward centroid, using lerp on position and decreasing radius
- Centroid calculated from mean of selected node body positions
- Triggered when `selectedNodeIds` is cleared after a clip save action (requires a new action flag or event)
- GSAP opportunity: `gsap.to()` on each ring's position/radius would be cleaner than manual tick-based lerp

```
prefers-reduced-motion: Ring contraction skipped. Centroid ripple replaced with a single
0->0.3->0 opacity pulse on a static circle at centroid, 400ms duration.
```

---

### 6. Path Trace Activated

**Trigger:** User presses `T` with a node selected, or activates path trace from the UI. `startPathTrace()` fires. The ancestral path from root to the selected node is highlighted.

**Response: Thread Illumination**
The edges along the traced path **illuminate sequentially** from root to leaf. Each edge transitions from its resting stroke opacity to 1.5x its resting opacity over 60ms, staggered 40ms apart. The total illumination sweep takes `(pathLength * 40) + 60` ms. For a 10-node path: 460ms. For a 3-node path: 180ms. The speed scales with path length so it never feels slow.

The non-traced nodes dim to 0.15 opacity (existing highlight mode behavior). The illumination sweep gives the dimming a direction -- the user sees the path trace "travel" from the beginning of the conversation to the current node, reinforcing the ancestral relationship.

After the sweep completes, the current node (the one the user selected) receives a single breathing glow cycle (the existing `0.4 + 0.2 * sin(time * 4)` pattern) that begins at peak brightness rather than at the sine wave's arbitrary phase. This "arrival pulse" marks the end of the trace.

**Intensity:** Moderate. Path trace is an analytical action -- the user is trying to understand conversation history. The sequential illumination serves comprehension by showing the direction and order of the path. It is functional delight.

**Duration:** Sweep: `(pathLength * 40) + 60` ms (adaptive). Arrival pulse: one sine cycle, ~785ms.

**Why it is tasteful:** The illumination sweep is not decoration -- it teaches. A user who has never used path trace before will immediately understand that the highlighted path is a sequence with a direction, not just a set. The stagger is fast enough that it reads as a wave, not as individual steps. It is comprehensible at a glance.

**Game reference:** FTL sector map reveal. When you unlock a new sector, connections illuminate in sequence from your current position outward, showing the topology of what was revealed. Toned down: no sector unlock fanfare, no persistent glow change -- the sweep is transient, and the resting state is the existing highlight mode appearance.

**Implementation notes:**
- New effect type: `PathSweep` in effects.ts -- `{ edgeIds: string[], stagger: 40, age, duration }` (total duration computed from path length)
- In renderSVG edge loop: if an edge is in the sweep and `age * totalDuration > edgeIndex * stagger`, boost its stroke opacity by `1.5 * (1 - fadeOut)` where fadeOut applies after the sweep passes
- Arrival pulse: reset `timeRef.current` for the breathing glow calculation to ensure it starts at peak
- Triggered in the UI store subscriber when `pathTrace` transitions from null to non-null

```
prefers-reduced-motion: Sweep skipped. All path edges illuminate simultaneously (instant).
Arrival pulse skipped.
```

---

### 7. Node Selected

**Trigger:** User clicks a node (no drag). `setSelectedNode(id)` fires. Inspector opens.

**Response: Focus Lock**
The existing system renders three selection layers: atmospheric glow (r*2.5, radial gradient), crisp ring (r+6, solid stroke), and breathing outer ring (sin-wave radius). This is already good. The addition is a **snap ring**: on the frame the selection changes, the crisp ring (layer 2) starts at r+12 and contracts to r+6 over 150ms with ease-out. This makes the selection feel like it "snapped" to the node rather than appearing from nothing.

The previously selected node (if any) gets the inverse: its crisp ring expands from r+6 to r+12 over 100ms with ease-in, fading opacity to 0 during the expansion. Deselection is faster than selection (100ms vs 150ms) because the user's attention has already moved to the new node.

**Intensity:** Subtle. The snap ring is a 6px radius contraction on a thin stroke. It is felt more than seen.

**Duration:** Selection snap 150ms. Deselection expand 100ms.

**Why it is tasteful:** Selection is the most frequent interaction in the app. An effect that is even slightly annoying at this frequency will poison the entire experience. The snap ring is below the threshold of conscious attention for most users. What they will feel is that selection is "responsive" and "precise" -- the snap contraction creates a sense of the UI acknowledging their click with physical weight.

**Game reference:** Into the Breach unit selection. The selection square snaps to the grid cell with a crisp contraction, creating a sense of precision without any particle effects or sound. Toned down: already at the Into the Breach level -- no further reduction needed.

**Implementation notes:**
- New effect type: `SelectSnap` in effects.ts -- `{ nodeId, age, duration: 0.15, expanding: boolean }`
- In renderSVG selection rendering: offset crisp ring radius by `(1 - easeOutCubic(age)) * 6` for contracting, `easeIn(age) * 6` for expanding
- Triggered when `selectedNodeId` changes (compare prev vs current in subscriber)
- Also add a `DeselectFade` for the previous node: `{ nodeId, age, duration: 0.1 }`

```
prefers-reduced-motion: Snap ring appears at final size instantly. Deselection disappears instantly.
```

---

### 8. Node Hovered

**Trigger:** Mouse enters a node's hit area (existing `setHoveredNode` flow). This happens constantly during exploration.

**Response: Material Response**
The existing system handles hover well: user nodes get brighter specular and rim light, AI nodes get a brightened outer stroke and increased tint opacity. The addition is minimal: the node's **aura radius** (the r*2 ambient circle) expands to r*2.2 over 100ms with ease-out on hover, and contracts back on un-hover over 150ms with ease-in. This 10% expansion is the "material response" -- the node breathes outward when touched.

No other effect. Hover is the highest-frequency interaction. Anything more than this 10% aura expansion would be noise.

**Intensity:** Minimal. Deliberately the quietest effect in the system. The aura expansion is 10% of an element that is already at 3-6% opacity.

**Duration:** Expand 100ms. Contract 150ms. Asymmetric timing: fast to respond, slow to release. This is the standard for hover interactions and matches the "ease-out for entrances, ease-in for exits" principle.

**Why it is tasteful:** The aura expansion creates a sense that nodes are physical objects with presence -- they displace their surroundings when you interact with them. At 10% and 3-6% opacity, it is the definition of peripheral. A user will never think "the aura expanded." They will think "these nodes feel real."

**Game reference:** Disco Elysium thought cabinet. Hovering over a thought node causes a very subtle ambient glow expansion. You never notice it consciously, but removing it makes the interface feel flat. Toned down: already at Disco Elysium's level -- this is the floor, not the ceiling.

**Implementation notes:**
- No new effect type needed. Modify the aura rendering in renderSVG to read `hoveredNodeId` and interpolate aura radius
- Use a small ref or effect-state field `hoverAura: Map<string, number>` (0-1) that ticks toward 1 when hovered, toward 0 when not, at a rate that produces 100ms/150ms transitions
- The interpolation should be smooth (not stepped), so tick-based approach in the existing rAF loop is ideal

```
prefers-reduced-motion: Aura remains at resting radius. No expansion.
```

---

### 9. Streaming Starts / Streaming Completes

**Trigger:** Streaming starts when an AI node appears with empty text. Streaming completes when the label changes from "...".

**Response: Vitality Cycle**

**On start:** The existing system adds a faction-colored streaming pulse (oscillating border, expanding halo, inner wash). This is effective. The addition is an **edge pulse**: the edge connecting the user node to the streaming AI node brightens over 200ms from its resting opacity to 1.5x, then settles into a gentle oscillation (matching the node's streaming pulse frequency, `time * 8`) at 1.0-1.2x opacity. This makes the connection between the question and the forming answer visible -- the edge is alive while the response streams.

**On complete:** The edge pulse stops (returns to resting opacity over 300ms). The aura settle from Effect #2 fires. Additionally, the node's label text (rendered in SVG) fades in from 0 opacity to its resting opacity over 200ms. During streaming, the label was "..." -- when the real label replaces it, the fade-in marks the transition from placeholder to real content.

**Intensity:** Subtle for the edge pulse (it is on an already-dim element). The label fade-in is functional -- it prevents a jarring text swap.

**Duration:** Edge pulse onset 200ms, oscillation continuous during streaming, offset 300ms. Label fade-in 200ms.

**Why it is tasteful:** Streaming is a waiting state. The edge pulse gives the user something to watch that is information-dense (the connection between question and answer is alive) rather than decorative. When streaming completes, the settle is quieter than the activity -- the absence of the pulse is itself the signal.

**Game reference:** Hades dialogue system. When a character is speaking, the connection line between portraits has a subtle pulse. When they finish, the line settles. You never notice the pulse consciously, but it communicates "active" vs "done." Toned down: already subtle -- no character portraits, no sound, just the edge opacity oscillation.

**Implementation notes:**
- New effect type: `EdgePulse` in effects.ts -- `{ edgeId: string, active: boolean, age: number }`
- In renderSVG edge loop: if edge is pulsing, multiply stroke opacity by `1.0 + 0.2 * sin(time * 8)` (matching node pulse frequency)
- Triggered by the existing streaming detection in the graph store subscriber
- Label fade: track per-node `labelAge` in effects state, tick from 0 to 1 over 0.2s when label changes from "..."

```
prefers-reduced-motion: Edge pulse uses static 1.2x opacity (no oscillation).
Label appears instantly (no fade).
```

---

### 10. Session Switched

**Trigger:** User selects a different session from the session pill. `switchSession(id)` fires. The entire graph state is replaced.

**Response: Canvas Transition**
The current graph fades to 0.3 opacity over 200ms. The canvas background (the grid) performs a subtle **focal shift**: the grid dot size reduces to 60% over 200ms, creating a brief "pulling back" sensation, then returns to 100% as the new graph loads. The new graph's nodes appear with the standard spring entrance, staggered 30ms apart (first node immediate, each subsequent 30ms later). This creates a cascade effect where the new session's topology reveals itself progressively rather than all-at-once.

The session pill itself does not animate -- it is a UI control and should feel instant and crisp. The transition is on the canvas, not the chrome.

**Intensity:** Moderate. Session switching is a significant context change. The transition needs to clearly communicate "you are now somewhere else" without being slow. The total envelope (200ms fade + staggered entrances) should complete within 600ms for a typical 10-node session.

**Duration:** Old graph fade 200ms. Grid focal shift 200ms (concurrent). Entrance stagger: 30ms * nodeCount + 700ms (spring duration). Total for 10 nodes: ~1.2s, but the user can interact after the fade completes at 200ms.

**Why it is tasteful:** Without this transition, session switching is a jarring state replacement -- the canvas teleports. The fade-and-stagger gives the switch a sense of physical continuity. The user's spatial memory is disrupted less because they watch the new space populate rather than appearing fully formed. The grid focal shift (dots shrinking and returning) is the canvas equivalent of a camera rack focus -- subtle depth cue that something changed.

**Game reference:** Animal Crossing room transitions. When you enter a new room, the old space fades briefly and the new space's elements appear with a gentle stagger. The stagger is fast enough that it reads as a reveal, not a loading sequence. Toned down: no room-entry sound, no screen wipe -- just opacity and stagger.

**Implementation notes:**
- Orchestrated at the component level, not in effects.ts (this is a state transition, not a canvas effect)
- In GraphCanvas subscriber: when `nodes` array reference changes completely (session switch), batch-add entrances with staggered `age` offsets: `entrance.age = -(index * 0.03 / entrance.duration)` (negative age = delayed start)
- Grid focal shift: transient `gridScale` multiplier in the rAF loop, animated 1.0 -> 0.6 -> 1.0 over 400ms
- Current graph fade: apply opacity to the SVG root element via GSAP `gsap.to(svgRef.current, { opacity: 0.3, duration: 0.2 })` before clearing, then `gsap.to(svgRef.current, { opacity: 1, duration: 0.15 })` after new nodes load
- GSAP usage here is justified: this is a one-shot orchestrated sequence, not a tick-based effect

```
prefers-reduced-motion: No fade, no stagger, no grid shift. Old graph disappears,
new graph appears at full opacity. Instant swap.
```

---

## Earned Escalation System

Effects scale with session depth. The effects system tracks a `sessionDepth` counter (number of nodes in the current session). Intensity multipliers apply:

| Session depth | Multiplier | Behavior |
|---------------|-----------|----------|
| 1-3 nodes | 0.7x | Quieter. First-time use. Don't overwhelm. |
| 4-10 nodes | 1.0x | Standard. User is engaged. |
| 11-20 nodes | 1.1x | Slightly warmer. Sustained exploration. |
| 21+ nodes | 1.2x | Full warmth. Deep session. The user has committed. |

The multiplier applies to: ripple maxRadius, aura expansion percentage, fork line length, and grid pulse radius. It does NOT apply to: durations (timing should be consistent), screen shake intensity (already calibrated), or streaming effects (those are functional, not celebratory).

At 21+ nodes, one additional effect unlocks: the **ambient hum**. All resting node auras gain a very slow oscillation (`0.03 + 0.01 * sin(time * 0.5)` opacity), creating a sense that the graph is alive and breathing. This is the canvas equivalent of a room that hums with activity. It is 1% opacity variation on a 3-6% base. Imperceptible individually, collectively noticeable.

---

## GSAP Integration Plan

GSAP is installed but unused. These effects are the entry points:

| Effect | GSAP role | Justification |
|--------|-----------|---------------|
| Fork line extension (#3) | `gsap.fromTo` scaleX | One-shot SVG element animation. Cleaner than manual tick math for a non-repeating effect. |
| Session transition (#10) | `gsap.to` opacity + `gsap.timeline` | Orchestrated multi-step sequence (fade, swap, stagger). GSAP timelines are purpose-built for this. |
| Clip consolidation (#5) | `gsap.to` position/radius per ring | Multiple simultaneous animations toward a shared target. GSAP handles the interpolation and cleanup. |
| Path sweep (#6) | `gsap.staggerTo` opacity per edge | Staggered sequential animation. GSAP's stagger API is exactly this use case. |

Effects that should remain tick-based (in the rAF loop via effects.ts):
- Ripples, drag trails, screen shake -- already working, high frequency, performance-sensitive
- Streaming pulse, breathing glow -- continuous oscillations tied to `timeRef.current`
- Aura expansion (hover) -- high frequency, must be smooth at 60fps
- Selection snap -- very short duration (150ms), tick-based is sufficient
- Impression ring (memory save) -- single circle, simple math

The GSAP effects should create and destroy DOM/SVG elements or modify element attributes directly, while tick-based effects render via the existing `renderEffects` string-building approach. Keep the two systems separate. GSAP handles orchestrated one-shots. The tick system handles continuous and high-frequency effects.

---

## New Effect Types Summary

Addition to `effects.ts`:

```typescript
interface GridPulse {
  cx: number;
  cy: number;
  age: number;        // 0->1
  maxAge: number;     // 0.6s
  radius: number;     // grid cells
}

interface AuraSettle {
  nodeId: string;
  age: number;        // 0->1
  duration: number;   // 0.4s
}

interface ForkLine {
  cx: number;
  cy: number;
  age: number;
  duration: number;   // 0.5s
  angle: number;      // radians, direction of fork
  length: number;     // 80px default, scaled by earned escalation
}

interface Impression {
  cx: number;
  cy: number;
  age: number;
  duration: number;   // 0.3s
  color: string;
  nodeRadius: number;
}

interface SelectSnap {
  nodeId: string;
  age: number;
  duration: number;   // 0.15s select, 0.1s deselect
  expanding: boolean; // true = deselecting (ring grows and fades)
}

interface EdgePulse {
  edgeId: string;
  active: boolean;
  age: number;        // used for onset/offset transitions
}

interface PathSweep {
  edgeIds: readonly string[];
  stagger: number;    // 40ms between edges
  age: number;
  totalDuration: number;
}
```

Extended `EffectsState`:

```typescript
interface EffectsState {
  // Existing
  ripples: Ripple[];
  entrances: Map<string, NodeEntrance>;
  streamingNodes: Set<string>;
  dragTrails: Array<{ x: number; y: number; age: number }>;
  shake: ScreenShake | null;

  // New
  gridPulse: GridPulse | null;
  auraSettles: Map<string, AuraSettle>;
  forkLines: ForkLine[];
  impressions: Impression[];
  selectSnaps: Map<string, SelectSnap>;
  edgePulses: Map<string, EdgePulse>;
  pathSweep: PathSweep | null;
  hoverAuras: Map<string, number>;  // nodeId -> interpolation 0-1
  sessionDepth: number;             // for earned escalation
}
```

---

## Effect Interaction Rules

1. **No stacking.** If a GridPulse is already active, do not create another. One at a time. Same for PathSweep and ForkLine.
2. **Interruption.** A new SelectSnap on the same node replaces the existing one (reset age to 0). This handles rapid click-click-click without effect accumulation.
3. **Priority.** Screen shake always wins. If shake is active, skip GridPulse and ForkLine rendering (they would be invisible during shake anyway).
4. **Cleanup.** All effects self-clean when `age >= 1`, matching the existing pattern. No manual disposal.
5. **Performance budget.** The effects system should add zero allocations per frame during steady state (no effects active). During effects, allocations are bounded by the number of active effects (single digits). No arrays created per tick.

---

## What This System Does Not Include

- **Sound.** Not in this spec. Sound is a separate decision with its own accessibility and preference concerns. If added later, it should be opt-in, never default.
- **Confetti or particles.** Not appropriate for a productivity tool used at a desk between spreadsheets.
- **Color changes.** No element changes hue. The palette is sacred.
- **Text animations.** Labels appear or disappear. They do not bounce, shake, or typewriter. Text is for reading.
- **Persistent decorations.** Every effect has a finite duration. Nothing lingers. The resting state of the canvas is identical whether the delight system is enabled or disabled.
- **Achievement badges or progress indicators.** This is not gamification. There is no XP bar. The earned escalation system adjusts ambient warmth, not reward signals.

---

## Testing Criteria

For each effect, verify:

1. **The 3-second test.** Show the effect to someone. If they can describe it after 3 seconds, it is too loud. They should feel it, not describe it.
2. **The 100x test.** Trigger the effect 100 times in rapid succession. If it becomes annoying at any point, reduce intensity or add a cooldown.
3. **The absence test.** Remove the effect. If the tool feels worse without it, the effect earned its place. If it feels the same, cut it.
4. **The reduced-motion test.** Enable `prefers-reduced-motion`. Every action should still feel complete and acknowledged. The tool should feel calm, not broken.
5. **The 60fps test.** With all effects active simultaneously (worst case), the rAF loop should maintain 60fps on a 2020 MacBook Air. Profile with Chrome DevTools Performance tab.
