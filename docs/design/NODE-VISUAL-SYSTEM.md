# Dreamcatcher Node Visual System v1.0

Canonical specification. Synthesized from the Material Spheres (DESIGN-SYSTEM.md, GraphCanvas.tsx) and Observatory explorations (Pencil). This document resolves all audit conflicts and defines the single source of truth for node rendering, states, rarity, actions, and composition.

Every hex value in this document comes from the token system. No off-palette colors.

---

## TOKEN REFERENCE (for quick lookup)

```
ELEVATION:  E[0]=#080706  E[1]=#0C0B09  E[2]=#13120F  E[3]=#1A1816
            E[4]=#1E1C19  E[5]=#252320  E[6]=#2C2A26  E[7]=#3D3A35

TEXT:       T.primary=#E1E1E1  T.secondary=#C8C8C8  T.tertiary=#A8A8A8
            T.subtle=#808080   T.ghost=#606060       T.dim=#404040
            T.invisible=#2C2A26

ACCENT:     #DD0000   ACCENT_30=#DD000030   ACCENT_18=#DD000018

WARM_AMBER: #D4A574   WARM_AMBER_LIGHT=#FFF8F0   WARM_AMBER_MID=#D4C4B0

FACTION:    Claude=#D4A574  GPT=#52C41A  Gemini=#FAAD14  Qwen=#FA8C16
```

---

## 1. NODE ANATOMY -- User Node (Base / Tier 0)

### Visual Description

A solid, dimensionally-lit sphere sitting on the canvas. Five material layers simulate convex curvature under top-left lighting. A bright core dot at center reads as the "pupil" of the specimen. No rings, no orbits, no aura at Tier 0. The node is its own complete object -- clean, precious, restrained.

Radius: 24px.
Branch point variant: hexagonal path (6-sided), `stroke-linejoin: round`, same material layers.

### Layer Stack

| Layer | Element | SVG | Tokens |
|-------|---------|-----|--------|
| 1 | Drop shadow | `circle(cx:0, cy:2, r:24)` fill black, opacity 0.3 | `#000000` at 30% |
| 2 | Body fill | `circle(cx:0, cy:0, r:24)` fill `radialGradient(cx:45%, cy:35%, r:65%)` | Stop 0%: E[6] `#2C2A26`, Stop 60%: E[4] `#1E1C19`, Stop 100%: E[2] `#13120F` |
| 2b | Body stroke | On same circle as fill | Rest: T.secondary `#C8C8C8` 1.8px. Hover: T.primary `#E1E1E1` 1.8px. Selected: ACCENT `#DD0000` 2.5px |
| 3 | Specular highlight | `circle(cx:0, cy:0, r:20.4)` (r*0.85) fill `radialGradient(cx:38%, cy:28%, r:40%)` | Stop 0%: white at 25%. Stop 30%: `#E1E1E1` at 8%. Stop 100%: `#E1E1E1` at 0% |
| 4 | Rim light | `circle(cx:1, cy:2, r:24.5)` stroke E[7] `#3D3A35`, 1px, dasharray `43.2 108` | Rest opacity 0.25. Hover opacity 0.40 |
| 5a | Core dot shadow | `circle(cx:0, cy:1, r:5.5)` fill black, opacity 0.15 | `#000000` at 15% |
| 5b | Core dot | `circle(cx:0, cy:0, r:5)` fill `radialGradient(cx:50%, cy:45%, r:50%)` | Center: T.subtle `#808080` at 85% opacity. Edge: T.secondary `#C8C8C8` at 60% opacity |

### Core Dot Color Standardization (Audit Finding #1)

The core dot uses a radial gradient, NOT a flat fill. Base state center is T.subtle `#808080`. This differs from the current code which uses a warmer off-palette gradient (`#E8E4E0` -> `#C0BCB8`). The corrected values:

| State | Core Dot Center | Core Dot Edge | Notes |
|-------|----------------|---------------|-------|
| Rest | T.subtle `#808080` at 85% | T.dim `#404040` at 60% | Neutral, warm-adjacent |
| Hover | T.secondary `#C8C8C8` at 85% | T.subtle `#808080` at 60% | Brightens on approach |
| Tier 4 (Artifact) | WARM_AMBER_LIGHT `#FFF8F0` | WARM_AMBER_MID `#D4C4B0` | Earned warmth |

### What Changed from Pencil Frame

- **Removed**: Observatory's 3 concentric stroke-only rings at rest. Those rings become the RARITY TIER system (Section 4), not the base state
- **Removed**: Uniform `#3D3A35` ring color. Rarity rings use the full E[4]-E[7] range with opacity variation
- **Corrected**: Core dot center was `#E8E4E0` (off-palette) in code. Now T.subtle `#808080` at base, earning warmth through rarity
- **Kept**: All 5 material layers from DESIGN-SYSTEM.md (they are built and working in GraphCanvas.tsx)
- **Corrected**: Hover scale was 1.06x instant. Now 1.03x over 150ms per MOTION-SPEC (Audit Finding #10)

---

## 2. NODE ANATOMY -- AI Node (Base / Tier 0)

### Visual Description

A hollow glass vessel. The outer bezel is a double-ring construction suggesting a watch face or lens housing. Inside, concentric elements create depth: a dashed refraction ring, a faction-colored ring, a chromatic wash, and a pulsing core indicator. The model icon renders at LOD 2+. No orbital rings or aura at Tier 0.

Radius: 28px.
Branch point variant: hexagonal path (6-sided), same bezel treatment.

### Layer Stack

| Layer | Element | SVG | Tokens |
|-------|---------|-----|--------|
| 1a | Outer bezel fill | `circle(cx:0, cy:0, r:28)` fill `radialGradient(cx:50%, cy:45%, r:60%)` | Stop 0%: factionColor at 8%. Stop 40%: E[3] `#1A1816` at 90%. Stop 100%: E[1] `#0C0B09` at 95% |
| 1a | Outer bezel stroke | On same circle | E[5] `#252320`, 2px |
| 1b | Inner bezel | `circle(cx:0, cy:0, r:25)` stroke E[5] `#252320`, 0.5px, opacity 0.3 | Double-ring bezel |
| 2 | Refraction ring | `circle(cx:0, cy:0, r:16.8)` (r*0.6) stroke T.ghost `#606060`, 0.4px, dasharray `1.5 3`, opacity 0.4 | Lens element suggestion |
| 3 | Faction ring | `circle(cx:0, cy:0, r:12.6)` (r*0.45) stroke factionColor, 0.5px | Rest opacity 0.2. Hover opacity 0.3 |
| 4 | Faction wash | `circle(cx:0, cy:0, r:19.6)` (r*0.7) fill factionColor | Rest opacity 0.10. Hover opacity 0.16 |
| 5 | Core indicator | `circle(cx:0, cy:0, r:5.6)` (r*0.2) fill factionColor | Opacity oscillates 0.10-0.20 at 2Hz. Phase offset per node ID: `sin(time*2 + nodeId.charCodeAt(0))` |
| 6 | Model icon | SVG path, `translate(-7,-7) scale(0.58)`, fill factionColor | LOD 2: opacity `lodFade * 0.4`. LOD 3: opacity 0.6 |

### Per-Provider Gradient Definitions

Each provider gets a bespoke bezel gradient with faction color baked into the first stop:

| Provider | Stop 0% | Stop 40% | Stop 100% |
|----------|---------|----------|-----------|
| Anthropic | `rgba(212,165,116,0.08)` | E[3] at 90% | E[1] at 95% |
| OpenAI | `rgba(82,196,26,0.08)` | E[3] at 90% | E[1] at 95% |
| Google | `rgba(250,173,20,0.08)` | E[3] at 90% | E[1] at 95% |
| Fallback | E[3] at 90% | E[1] at 95% | E[1] at 95% |

### Hover Additions

On hover, AI node adds an outer stroke overlay: `circle(r:28)` stroke T.secondary `#C8C8C8`, 1.5px. This appears ON TOP of the existing bezel, brightening the edge.

### What Changed from Pencil Frame

- **No change to structure**: The 7-layer stack stays as-is from DESIGN-SYSTEM.md
- **Corrected**: No off-palette colors. All faction tints use documented hex values
- **Clarified**: Hover does NOT add concentric rings. It brightens existing surfaces

---

## 3. NODE STATES (6 states with exact visual mutations)

Six mutually exclusive primary states. Only one active at a time per node (except Rest, which composes with Rarity).

### 3.1 Rest

Standard material stack. No additions. Rarity tier overlays apply on top of rest (see Section 4).

```
User: 5-layer stack per Section 1
AI:   7-layer stack per Section 2
```

### 3.2 Hover

Transition: 150ms ease-out (DURATION.fast, EASE.smooth).

| Mutation | User Node | AI Node |
|----------|-----------|---------|
| Scale | 1.03x over 150ms | 1.03x over 150ms |
| Stroke | T.secondary -> T.primary `#E1E1E1` | Add overlay stroke T.secondary `#C8C8C8` 1.5px |
| Specular | Opacity 0.22 -> 0.35 | -- |
| Rim light | Opacity 0.25 -> 0.40 | -- |
| Core dot | Center brightens to T.secondary `#C8C8C8` | -- |
| Faction ring | -- | Opacity 0.2 -> 0.3 |
| Faction wash | -- | Opacity 0.10 -> 0.16 |

**Audit Finding #10 resolution**: Hover scale is 1.03x with 150ms transition, not the current 1.06x instant. The 1.06 was too aggressive -- the node appears to jump rather than lift.

### 3.3 Selected

Replaces hover. Three-layer selection treatment rendered OUTSIDE the node group (in world space, after all nodes render, so the halo sits behind neighboring nodes).

| Layer | Element | Value | Token |
|-------|---------|-------|-------|
| 1 | Atmospheric halo | `circle(r: r+24)` fill radialGradient | ACCENT `#DD0000` at 8% center -> transparent |
| 2 | Crisp ring | `circle(r: r+6)` stroke 1.5px, opacity 0.7 | ACCENT `#DD0000`. SOLID -- not dashed |
| 3 | Breathing ring | `circle(r: r+12 + 3*sin(t*3))` stroke 0.6px, opacity 0.15 | ACCENT `#DD0000`. 3Hz oscillation |

Node stroke overrides to ACCENT `#DD0000` at 2.5px.

**Selection suppresses rarity orbital rings** (Audit Finding #7). The ACCENT breathing ring occupies the same visual territory. Fill, core, and labels persist.

### 3.4 Active (Reply Target)

The node the user is currently replying to. A warm-white breathing ring distinct from ACCENT selection.

```
Ring:     circle(r: r+8), stroke T.secondary #C8C8C8, 0.6px
Pulse:    opacity oscillates 0.1-0.2 at 2Hz
Signal:   "This is where your next message connects"
```

Does not suppress rarity. Active and rarity compose freely.

### 3.5 Streaming (AI nodes only)

Indicates active token generation. Three elements:

| Element | SVG | Tokens |
|---------|-----|--------|
| Dashed orbit | `circle(r: r+5)` stroke factionColor, 2px, dasharray `4 4`, rotating dashoffset | factionColor. Rotation: `dashoffset = selDashRef * 2` |
| Breathing halo | `circle(r: r+12 + 5*sin(t*4))` stroke factionColor, 0.8px | Opacity: `pulse * 0.25`. 4Hz (faster than idle 2Hz to signal urgency) |
| Fill wash | `circle(r: r)` fill factionColor | Opacity: `pulse * 0.05` |

**Streaming suppresses rarity orbits** (Audit Finding #7). The streaming orbit replaces rarity orbital rings. Fill, core, and faction layers persist.

### 3.6 Dimmed (Dead-end / Abandoned Branch)

```
Opacity:  0.4 on all layers (entire node group)
Stroke:   T.dim #404040 (replaces T.secondary / T.subtle)
Rarity:   No rarity effects render when dimmed
Signal:   "This branch was abandoned"
```

### State Priority (highest wins)

```
Streaming > Selected > Hover > Active > Dimmed > Rest
```

When a streaming node is also selected, streaming orbit takes visual precedence over the ACCENT breathing ring. The ACCENT crisp ring (layer 2) still renders -- it does not conflict with the faction-colored orbit.

---

## 4. RARITY TIERS (Tier 0-4)

### Design Synthesis

The Observatory's concentric rings become the **earned progression** system. At Tier 0 a node has no external rings -- it is a clean object. As a node accumulates significance through conversation topology, it earns visual embellishments: orbital arcs, particles, auras. This is the middle ground: the Material Sphere body stays, the Observatory rings are earned, not given.

All rarity ring colors use E[4]-E[7] and T.dim-T.ghost (warm palette only). No cool greys (Audit Finding #3).

### Tier Classification

```typescript
function getNodeRarity(node: GraphNode, edges: Edge[], depth: number): 0|1|2|3|4 {
  if (node.metadata?.starred || node.metadata?.memoryId) return 4;
  if (depth > 20 || node.role === 'summary' || (node.text.length > 200 && depth > 10)) return 3;
  const childCount = edges.filter(e => e.from === node.id).length;
  if (childCount >= 3 || node.role === 'clip' || depth > 8) return 2;
  if (depth > 2 || childCount === 2) return 1;
  return 0;
}
```

### Tier 0 -- Common

```
Visual:     Base material stack only
Additional: None
Signal:     Surface-level node, early in conversation
```

### Tier 1 -- Uncommon

One thin orbital arc rotating slowly outside the node body. A single short dashed segment (~10% of circumference).

```xml
<circle cx="0" cy="0" r="${r + 6}"
  fill="none" stroke="${T.dim}" stroke-width="0.4"
  stroke-dasharray="3 ${r * 2.5}"
  stroke-dashoffset="${time * 8}"
  opacity="0.3"/>
```

| Property | Value | Token |
|----------|-------|-------|
| Radius | r + 6 (30px user, 34px AI) | -- |
| Stroke color | T.dim `#404040` | Warm palette |
| Stroke width | 0.4px | -- |
| Dash pattern | `3 ${r*2.5}` (~10% arc) | -- |
| Rotation | 8 units/sec via timeRef | -- |
| Opacity | 0.3 | -- |

### Tier 2 -- Rare

Tier 1 orbital arc PLUS 3 micro-dot particles at varying distances and speeds.

```xml
<!-- Orbital arc from Tier 1 -->
<circle ... /> <!-- same as above -->

<!-- Particles -->
<g transform="rotate(${time * 12})">
  <circle cx="${r + 10}" cy="0" r="1.0" fill="${T.ghost}" opacity="0.25"/>
</g>
<g transform="rotate(${time * -8 + 120})">
  <circle cx="${r + 14}" cy="0" r="0.7" fill="${T.dim}" opacity="0.2"/>
</g>
<g transform="rotate(${time * 15 + 240})">
  <circle cx="${r + 8}" cy="0" r="0.8" fill="${T.ghost}" opacity="0.15"/>
</g>
```

| Particle | Orbit Radius | Rotation Speed | Size | Color | Opacity |
|----------|-------------|---------------|------|-------|---------|
| 1 | r + 10 | 12 deg/sec | 1.0px | T.ghost `#606060` | 0.25 |
| 2 | r + 14 | -8 deg/sec (counter) | 0.7px | T.dim `#404040` | 0.20 |
| 3 | r + 8 | 15 deg/sec | 0.8px | T.ghost `#606060` | 0.15 |

Phase offsets (0, 120, 240 degrees) ensure particles never cluster.

### Tier 3 -- Epic

All Tier 2 elements PLUS a breathing aura ring.

```xml
<!-- Ambient aura ring -->
<circle cx="0" cy="0" r="${r * 2.2 + 3 * Math.sin(time * 1.5)}"
  fill="none" stroke="${T.invisible}" stroke-width="8"
  opacity="${0.06 + 0.03 * Math.sin(time * 1.5)}"/>

<!-- Inner glow wash -->
<circle cx="0" cy="0" r="${r * 2.5}"
  fill="url(#node-aura-epic)"/>
```

Aura gradient definition:
```xml
<radialGradient id="node-aura-epic">
  <stop offset="0%"  stop-color="${T.ghost}" stop-opacity="0.04"/>
  <stop offset="100%" stop-color="${T.ghost}" stop-opacity="0"/>
</radialGradient>
```

| Property | Value | Token |
|----------|-------|-------|
| Aura stroke | T.invisible `#2C2A26` | Barely visible haze |
| Aura width | 8px | Thick, soft |
| Pulse rate | 1.5Hz | Slow, regal |
| Radius amplitude | +/- 3px | Gentle breathing |
| Opacity range | 0.06 - 0.09 | Atmospheric, not glowing |
| Inner wash | T.ghost `#606060` at 4% -> 0% | Barely perceptible warmth |

### Tier 4 -- Artifact

Full treatment: all Tier 3 elements PLUS shifted fill gradient with warm amber undertone and overridden core dot.

**Override node fill gradient:**
```xml
<radialGradient id="node-artifact-fill" cx="45%" cy="35%" r="65%">
  <stop offset="0%"   stop-color="#33302A"/>  <!-- E[6] + amber shift -->
  <stop offset="60%"  stop-color="#221F1A"/>  <!-- E[4] + amber shift -->
  <stop offset="100%" stop-color="#161411"/>  <!-- E[2] + amber shift -->
</radialGradient>
```

**Override core dot:**
```
Center:  WARM_AMBER_LIGHT #FFF8F0
Edge:    WARM_AMBER_MID #D4C4B0
```

**Hover addition -- cinematic light leak:**
```xml
<radialGradient id="node-artifact-leak" cx="30%" cy="25%">
  <stop offset="0%"   stop-color="#D4A574" stop-opacity="0.06"/>
  <stop offset="100%" stop-color="#D4A574" stop-opacity="0"/>
</radialGradient>
<circle cx="0" cy="0" r="${r}" fill="url(#node-artifact-leak)"/>
```

**Label treatment by rarity:**

| Tier | Label Style |
|------|-------------|
| 0-1 | Plain text below node. Inconsolata 11px. User: T.tertiary `#A8A8A8`. AI: T.ghost `#606060` |
| 2 | Pill background: E[3] `#1A1816` at 70%, stroke E[5] `#252320` 0.5px, border-radius 4px |
| 3-4 | Pill + faint top-edge highlight: T.dim `#404040`, 0.3 opacity, 0.5px |

### What Changed from Pencil Frame

- **Reframed**: Observatory's 3 rest-state concentric rings are now the Tier 1-3 orbital progression, not base anatomy
- **Corrected**: Ring colors now use E[4]-E[7] / T.dim-T.ghost exclusively (warm palette). No `#2a2a2a` or other cool greys
- **Adopted**: Observatory's center dot as the core identity element, but using the T.subtle `#808080` base with earned warmth at Tier 4
- **Kept**: DESIGN-SYSTEM.md's 5-tier classification function unchanged
- **Kept**: All ambient animation frequencies from the documented motion system

---

## 5. ACTION SYSTEM (Cardinal Points + Radial Menu)

### Design Model

Two tiers of node actions, not competitors (Audit Finding #4). Cardinals are the quick-access layer; the Radial Menu is the full-action layer. They share spatial language and animate as a continuous system.

### Tier 1: Cardinal Points (Hover)

Four action affordances at the cardinal axes, appearing 200ms after hover begins. These are the most frequent actions for the hovered node type.

**Trigger**: Hover dwell > 200ms
**Exit**: Cursor leaves node + cardinal zone (r + 28px radius)
**Transition**: Each point scales from 0 + opacity 0 to 1 + opacity 1. 120ms, EASE.snap. Stagger 30ms per point (N, E, S, W order).

#### Layout

```
           [N]
            |
     [W] --NODE-- [E]
            |
           [S]
```

Each cardinal is a 20px diameter circle positioned at r + 16px from node center.

| Position | Offset | User Node Actions | AI Node Actions |
|----------|--------|-------------------|-----------------|
| North | (0, -(r+16)) | Reply | Regenerate |
| East | (r+16, 0) | Branch | Branch |
| South | (0, r+16) | Inspect | Learn |
| West | (-(r+16), 0) | Clip | Save Memory |

#### Cardinal Point Visual

```
Background:  E[4] #1E1C19
Border:      1px solid E[6] #2C2A26
Icon:        12x12 stroke, T.ghost #606060
Hover:       Background E[5] #252320, border E[7] #3D3A35, icon T.secondary #C8C8C8
Radius:      R.pill (full circle)
Hit target:  28px (expanded from visual 20px)
```

### Tier 2: Radial Menu (Right-Click)

Full action palette. 6 items arranged in a ring. Opens at cursor position when right-clicking a node.

**Trigger**: Right-click on node, OR long-press (500ms) for touch
**Animation**: If Cardinals are already visible, they animate outward from r+16 to the radial ring radius (r+40) while the remaining 2 items fade in at their positions. Total transition: 200ms. If Cardinals are not visible, all 6 items scale in from center with 30ms stagger.

#### Layout

Six items at 60-degree intervals, r + 40px from node center:

```
      [Reply/Regen]
   [Clip]        [Branch]
      NODE
   [Memory]      [Learn]
      [Inspect]
```

#### Radial Item Visual

```
Background:  Glass elevated treatment
Shape:       32px circle with icon + 8px below label
Icon:        14x14 stroke, T.ghost #606060
Label:       Inconsolata 9px, T.dim #404040
Hover:       Background rgba(61,58,53,0.38), icon T.secondary #C8C8C8, label T.subtle #808080
Hit target:  44px minimum
```

#### Items by Node Type

| Slot | User Node | AI Node |
|------|-----------|---------|
| 0deg (top) | Reply | Regenerate |
| 60deg | Branch | Branch |
| 120deg | Inspect | Learn |
| 180deg | Copy text | Copy text |
| 240deg | Show paths | Save Memory |
| 300deg | Clip | Inspect |

### What Changed from Pencil Frame

- **New system**: Cardinals and Radial Menu did not exist in the Pencil frame or in current code (which uses a standard context menu). This replaces the ContextMenu for node actions while the ContextMenu persists for canvas-level right-click
- **Unified**: Cardinals and Radial share spatial positions -- the N/E/S/W cardinals animate into their radial slots, maintaining spatial memory

---

## 6. SELECTION ANIMATION (Lock-On as Transition)

### Design Decision

Lock-On is a TRANSITION ANIMATION, not a persistent visual state (Audit Finding #5). The reticle/bracket elements from the Observatory exploration play during the 400ms transition from unselected to selected, then dissolve into the standard 3-layer selection treatment.

### Stage Breakdown

| Stage | Duration | What Happens | Visual |
|-------|----------|-------------|--------|
| 1 | 0-100ms | Ring contracts | A single ring at r+24 contracts to r+6 (ACCENT `#DD0000`, 0.8px, opacity 0.4). This is the inverse of a ripple -- tightening inward suggests precision |
| 2 | 100-250ms | Crisp ring solidifies | The contracting ring reaches r+6, thickens from 0.8px to 1.5px, opacity ramps from 0.4 to 0.7. The node stroke transitions to ACCENT 2.5px |
| 3 | 250-400ms | Breathing ring emerges | A second ring fades in at r+12 with opacity 0 -> 0.15 and begins its 3Hz oscillation. The halo gradient fades in from 0% to 8% opacity |
| 4 | 400ms+ | Steady state | Standard 3-layer selection treatment (Section 3.3). No reticle. No brackets. No cardinal ticks |

### Easing

Stages 1-2: EASE.snap `cubic-bezier(0.16, 1, 0.3, 1)` -- fast start, decisive arrival.
Stage 3: EASE.smooth `cubic-bezier(0.4, 0, 0.2, 1)` -- gentle emergence of the breathing ring.

### Deselection

Reverse is faster: 200ms total. Breathing ring fades first (0-80ms), crisp ring dissolves (80-160ms), halo fades (80-200ms). No expansion -- the rings simply fade.

### Inspector Panel Connection

At 400ms (when lock-on completes), the Inspector panel slides in from the right. This is Stage 4 -- the persistent result of selection.

### What Changed from Pencil Frame

- **Removed**: Persistent reticle rings, cardinal tick marks, rotating scan arcs from the Observatory exploration. These were visually rich but created noise at rest
- **Adopted**: The inward-contracting ring from the Observatory selected state as the Stage 1 transition animation
- **Clarified**: Lock-On is 400ms of motion, then gone. The steady state is the documented 3-layer treatment from DESIGN-SYSTEM.md

---

## 7. HOVER CARD (LOD-Conditional)

### Visibility Rules (Audit Finding #6)

| LOD | Scale | Hover Card |
|-----|-------|------------|
| 0 | < 25% | Never shown |
| 1 | 25-50% | Shown after 300ms hover dwell |
| 2 | 50-75% | Shown after 300ms hover dwell |
| 3 | > 75% | Never shown (labels are fully readable, card is redundant) |

At LOD 3 the node's own label, badge, and model icon provide sufficient information. The hover card would be visual clutter.

### Content

```
[Faction icon 14x14]  [Role label]  [Model name]
---
[First 80 chars of node text...]
---
[depth badge]  [child count]  [age timestamp]
```

### Visual Treatment

Glass treatment with faction color accent:

```
Background:   Glass standard (linear-gradient(180deg, rgba(26,24,22,0.92), rgba(19,18,15,0.88)))
Backdrop:     blur(12px)
Border-top:   1px solid rgba(factionR, factionG, factionB, 0.3)  -- faction color
Border-sides: Glass standard (E[6] at 30-40%)
Border-bottom: Glass standard (E[2] at 60%)
Shadow:       Glass shadow stack
Radius:       R.md (10px)
Max width:    280px
Padding:      8px 12px
```

**Text styling:**
- Role label: Inconsolata 10px/600, T.tertiary `#A8A8A8`
- Model name: Inconsolata 10px/400, T.dim `#404040`
- Content preview: Inter 12px/400, T.secondary `#C8C8C8`, lineHeight 1.5
- Metadata: Inconsolata 9px/400, T.dim `#404040`

**Entry**: opacity 0 + translateY(4px) -> opacity 1 + translateY(0). 150ms, EASE.snap. Delay: 300ms hover dwell.
**Exit**: opacity 1 -> opacity 0. 100ms, EASE.smooth. No positional animation on exit.

**Position**: Anchored to node. Offset: 8px below node bottom edge. Centered horizontally. Flips above node if near bottom viewport edge.

### What Changed from Pencil Frame

- **New**: Hover card did not exist in either source. This is a new specification per audit requirements
- **LOD-gated**: Disappears at high zoom where node metadata is already readable

---

## 8. EDGE LABELS (4 variants)

### Placement (Audit Finding #9)

All edge labels placed at Bezier t=0.5 (the visual midpoint of the cubic curve). This is computed per frame from the control points, not from the straight-line midpoint.

```typescript
function bezierMidpoint(x0: number, y0: number, cx0: number, cy0: number, cx1: number, cy1: number, x1: number, y1: number) {
  const t = 0.5;
  const mt = 1 - t;
  return {
    x: mt*mt*mt*x0 + 3*mt*mt*t*cx0 + 3*mt*t*t*cx1 + t*t*t*x1,
    y: mt*mt*mt*y0 + 3*mt*mt*t*cy0 + 3*mt*t*t*cy1 + t*t*t*y1,
  };
}
```

### Visibility

- **LOD 2+ only**: Labels are invisible at LOD 0-1 (too small to read)
- **Suppressed during physics settling**: When the simulation is still stabilizing (first 2 seconds after graph mutation), labels are hidden to avoid jittering text
- **Fade in**: opacity 0 -> 1 over 200ms when conditions are met

### 4 Variants

| Variant | Applies To | Text | Color | Background |
|---------|-----------|------|-------|------------|
| Type label | `branch`, `regeneration` | "branch" / "regen" | T.dim `#404040` | none |
| Thinking indicator | AI edges during streaming | "thinking..." | T.dim `#404040` | none |
| Token count | AI edges after completion | "142 tokens" | T.dim `#404040` | none |
| Age label | All edges at LOD 3 | "2m ago" | T.invisible `#2C2A26` | none |

### Text Style

```
Font:     Inconsolata 9px / 400
Color:    T.dim #404040
Align:    text-anchor middle
Offset:   4px above the curve midpoint (nudged up to avoid overlapping the edge stroke)
```

### What Changed from Pencil Frame

- **Corrected**: Label color standardized to T.dim `#404040` (warm palette). Previous explorations used off-palette greys
- **Added**: Physics settling suppression rule. Labels are hidden during the first 2s of simulation activity to prevent visual noise from repositioning text
- **Added**: LOD gating at LOD 2+ only

---

## 9. EDGE PHYSICS (Cubic Beziers)

### Curve Type

All edges render as cubic Bezier curves. NOT catenary curves. The control points are computed from the straight-line distance between nodes.

```typescript
const dx = b.x - a.x;
const dy = b.y - a.y;
const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
const ux = dx / d;
const uy = dy / d;
const x0 = a.x + ux * (a.r + 2);
const y0 = a.y + uy * (a.r + 2);
const x1 = b.x - ux * (b.r + 2);
const y1 = b.y - uy * (b.r + 2);
const mid = d * 0.35;

const curve = `M ${x0},${y0} C ${a.x + ux*mid},${a.y + uy*mid} ${b.x - ux*mid},${b.y - uy*mid} ${x1},${y1}`;
```

The `0.35` factor places control points at 35% of the inter-node distance, creating a gentle S-curve that feels organic without appearing droopy.

### Edge Type Rendering

| Type | Stroke | Width | Dash | Speed | Tokens |
|------|--------|-------|------|-------|--------|
| `reply` | `rgba(140,140,140,0.30)` | 1.5px | `6 4` | 0.8x | -- |
| `branch` | `rgba(176,176,176,0.30)` | 1.5px | `6 4` | 0.8x | -- |
| `regeneration` | `rgba(221,0,0,0.20)` | 1.5px | `6 4` | 0.8x | ACCENT at 20% |
| `summarizes` | T.invisible `#2C2A26` | 1.0px | `6 4` | 0.8x | -- |
| `clips_to` | C.memory `#A0A0A0` at 30% | 1.0px | `6 4` | 0.8x | -- |
| `references` | T.ghost `#606060` at 25% | 1.0px | `6 4` | 0.8x | -- |

### Dash Animation

```typescript
dashOffset -= dt * 30 * edgeStyle.speed;
```

All dashed edges scroll continuously, indicating flow direction (parent to child). Speed correlates with semantic urgency.

### Draw-On Animation (New Edges)

When a new edge is created, it traces from source to target over 400ms using progressive stroke-dasharray reveal:

```typescript
const EDGE_DRAW_DURATION = 400; // ms
const drawProgress = Math.min(elapsed / EDGE_DRAW_DURATION, 1);
if (drawProgress < 1) {
  const drawn = pathLen * drawProgress;
  dashAttr = `stroke-dasharray="${drawn} ${pathLen - drawn}"`;
}
```

### Depth-Based Taper (not yet implemented)

```typescript
const edgeWidth = Math.max(0.5, 1.5 - depth * 0.08);
```

Root edges are thickest. Each depth level loses 0.08px. This creates a visual trunk-to-branch hierarchy.

### What Changed from Pencil Frame

- **Confirmed**: Cubic Beziers stay. No catenary physics
- **No changes to rendering**: Current edge system is correct and consistent with DESIGN-SYSTEM.md

---

## 10. CONTENT PREVIEW (Semantic Zoom at 3 LOD Levels)

### LOD System

Four levels with 5% crossfade zones. Content progressively reveals as the user zooms in.

```typescript
const LOD_THRESHOLDS = [0.25, 0.50, 0.75] as const;
const LOD_FADE_ZONE = 0.05;
```

### LOD 0 (scale < 25%) -- Topology

```
Nodes:   Filled circles only (no labels, no badges, no icons)
Edges:   Thin strokes, no labels
Purpose: See the shape of the conversation graph
```

Node rendering: full material stack (gradients visible) but no text overlays. The shapes and colors differentiate user/AI/branch at a glance.

### LOD 1 (25-50%) -- Shape Recognition

```
Nodes:   Material stack + shape differentiation (circle vs hexagon vs diamond)
Edges:   Standard strokes + dash animation
Labels:  Hidden
Badges:  Hidden
Icons:   Hidden
```

Users can distinguish node types by shape and color. AI nodes' faction tint is perceivable. Branch points show their hexagonal form.

### LOD 2 (50-75%) -- Labels + Badges

```
Nodes:   Full material stack
Labels:  Truncated to 14 chars + ".." if longer. Inconsolata 11px
Badges:  Branch count badge visible
Icons:   Model icon at opacity lodFade * 0.4 (14x14)
Edges:   Standard strokes + edge labels (type labels only)
```

Crossfade: Labels and badges fade in using `lodFade` (0 at 45% scale, 1 at 55% scale). This prevents jarring pop-in at the threshold.

### LOD 3 (> 75%) -- Full Detail

```
Nodes:   Full material stack
Labels:  Full text (no truncation). Inconsolata 11px
Badges:  Branch count badge at full opacity
Icons:   Model icon at opacity 0.6 (16x16)
Edges:   All edge labels visible (type + token count + age at LOD 3)
Hover:   Hover card is DISABLED at this LOD (info already visible)
```

### Crossfade Implementation

Elements that appear at a LOD threshold use `lodFade` as their opacity multiplier during the transition zone:

```typescript
// In the render loop:
const { level: lod, fadeIn: lodFade } = getLOD(scale);
// For elements that appear at LOD 2:
const labelOpacity = lod === 2 ? lodFade : (lod >= 3 ? 1 : 0);
```

### What Changed from Pencil Frame

- **Corrected**: Hover card now LOD-gated (cut at LOD 3). Previously unspecified
- **No structural changes**: The 4-level LOD system with crossfade zones matches DESIGN-SYSTEM.md exactly

---

## 11. STATE COMPOSITION TABLE

The definitive conflict resolution matrix. When two visual states overlap, this table defines the outcome.

### Primary Composition Rules (Audit Finding #7)

| Active States | Result |
|--------------|--------|
| Rest + Tier 0 | Base material stack only |
| Rest + Tier 1-4 | Base stack + rarity overlays (orbits, particles, aura) |
| Hover + Tier 1-4 | Hover mutations (stroke, specular, scale) + rarity overlays |
| Selected + Tier 0-4 | **Selection suppresses rarity orbits/particles**. Fill + core persist. ACCENT layers replace orbital space |
| Selected + Hover | Selected wins. No hover mutations (user has committed to this node) |
| Streaming + Tier 0-4 | **Streaming suppresses rarity orbits/particles**. Faction streaming effects replace orbital space. Fill + core + faction layers persist |
| Streaming + Selected | Streaming orbit visible + ACCENT crisp ring visible. Breathing ring hidden (replaced by streaming halo). Halo uses faction color not ACCENT |
| Active + Tier 1-4 | Both compose freely. Active reply ring and rarity orbits occupy different radii |
| Dimmed + anything | Dimming overrides all. Opacity 0.4, simplified stroke, no rarity, no selection, no streaming effects |
| Hover + Active | Both compose. Hover brightens surfaces, active ring stays |

### Full Matrix

```
             | Rest | Hover | Selected | Streaming | Active | Dimmed
-------------|------|-------|----------|-----------|--------|-------
Tier 0       | base | +hover| sel      | stream    | +active| dim
Tier 1       | +orb | +orb  | -orb+sel | -orb+str  | +orb   | dim
Tier 2       | +orb+p| +orb+p| -orb-p+sel| -orb-p+str| +orb+p| dim
Tier 3       | +orb+p+a| +orb+p+a| -orb-p+sel+a| -orb-p+str| +orb+p+a| dim
Tier 4       | +all+amber| +all+amber| -orb-p+sel+a+amber| -orb-p+str+amber| +all+amber| dim
```

Legend: `orb`=orbital arc, `p`=particles, `a`=aura, `sel`=3-layer selection, `str`=streaming effects, `dim`=dimmed treatment, `amber`=artifact warm shift

### Key Insight

**Rarity aura (Tier 3-4) persists during selection.** Only the orbits and particles are suppressed (they share the r+6 to r+14 space with selection rings). The aura (r*2.2) is far enough outside to coexist with the ACCENT halo (r+24). This means an Epic or Artifact node still communicates its significance when selected.

### Layer Order (render sequence, bottom to top)

```
1. Rarity aura (Tier 3+) — largest radius, behind everything
2. Selection halo (r+24) — behind crisp ring
3. Rarity particles (Tier 2+) — behind node body (SUPPRESSED when selected/streaming)
4. Rarity orbital arc (Tier 1+) — behind node body (SUPPRESSED when selected/streaming)
5. Selection crisp ring (r+6) — behind node body
6. Selection breathing ring / Streaming halo (r+12) — behind node body
7. Streaming orbit (r+5) — closest to node body
8. Node body (fill, stroke, specular, rim light)
9. Node core dot
10. Active reply ring (r+8) — in front of body, behind labels
11. Label + badge + model icon
12. Cardinal points / Radial menu (on hover/right-click)
13. Hover card (anchored below node)
```

---

## IMPLEMENTATION NOTES

### Code Changes Required

**GraphCanvas.tsx**:
1. Fix hover scale: `1.06` -> `1.03`, add 150ms CSS transition via SVG `style` attribute
2. Fix core dot gradient: replace `#E8E4E0`/`#C0BCB8` with T.subtle/T.dim tokens
3. Add rarity tier computation in render loop (call `getNodeRarity`)
4. Add rarity visual layers conditionally
5. Move selection rendering to after all nodes (already partially done -- confirm render order)

**theme.ts**:
1. Export `WARM_AMBER`, `WARM_AMBER_LIGHT`, `WARM_AMBER_MID` tokens
2. Export `getNodeRarity` function or move to a separate `lib/rarity.ts`

**New files**:
1. `lib/rarity.ts` -- rarity classification + tier visual generators
2. `lib/cardinal-points.ts` -- action system geometry and rendering
3. `lib/hover-card.ts` -- LOD-conditional hover card rendering

### Performance Budget

All rarity effects are static SVG with `timeRef`-driven transforms. No per-frame allocations. At 100 nodes with mixed rarity tiers, the additional SVG elements are:
- Tier 1: +1 circle per node
- Tier 2: +4 elements per node (1 circle + 3 particles)
- Tier 3: +6 elements per node (all above + 2 aura elements)
- Tier 4: +7 elements per node (all above + gradient swap)

Worst case (100 Tier 4 nodes): +700 SVG elements. Still within the single-innerHTML performance envelope given they are simple circles with no filters.

---

*This document supersedes conflicting specifications in DESIGN-SYSTEM.md Section 5, DESIGN-SPEC.md Section 2, and the Pencil exploration frames. When any spec conflicts with this document, this document wins.*
