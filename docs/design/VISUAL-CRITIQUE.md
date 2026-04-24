# Dreamcacher Visual Critique

Senior visual design review. Brutal, specific, prescriptive.

Reviewed against the stated creative direction: "Petri dish in a bio-tech lab. Nodes and wires are precise circuitry floating over an organic warm substrate." Nodes should feel "precious, like polished game elements or specimens under glass. Dimensional, not flat."

Benchmarked against: Linear, Raycast, Arc Browser, Figma's canvas, Obsidian Canvas.

---

## 1. NODES ARE FLAT WHEN THEY SHOULD BE DIMENSIONAL

**The problem.** The nodes are drawn with a single fill, a single stroke, and one tiny inner circle. That is an SVG circle with a border. It reads as a developer's debug visualization, not a "polished game element" or "specimen under glass." The design direction says dimensional; the implementation is two-dimensional. A single `fill + stroke + inner dot` is the absolute minimum representation of a node. It has no volume, no light source, no material quality.

Figma's canvas nodes have multi-layered shadows that create perceived lift. Linear's issue cards feel like they float 2-4px above the surface. Raycast's list items have a luminous inner highlight that implies curvature. These are all achieved through shadow stacks and gradient layering, not a single fill.

**Prescription for user nodes:**

Replace the current flat fill + stroke with a three-layer material stack:

```
Layer 1 — Base shadow (anchor to canvas):
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6))
          drop-shadow(0 0 12px rgba(8,7,6,0.8))

Layer 2 — Fill gradient (convex curvature, top-lit):
  <radialGradient id="node-user-fill" cx="45%" cy="35%">
    <stop offset="0%" stop-color="#2C2A26" />     /* highlight — E[6] */
    <stop offset="60%" stop-color="#1E1C19" />     /* mid — E[4] */
    <stop offset="100%" stop-color="#13120F" />    /* shadow — E[2] */
  </radialGradient>

Layer 3 — Specular highlight (glass-under-microscope):
  <radialGradient id="node-user-spec" cx="40%" cy="30%">
    <stop offset="0%" stop-color="rgba(225,225,225,0.12)" />
    <stop offset="40%" stop-color="rgba(225,225,225,0.03)" />
    <stop offset="100%" stop-color="rgba(225,225,225,0)" />
  </radialGradient>
  Applied as a second circle, r * 0.85, above the fill.

Layer 4 — Rim light (edge catch, bottom-right):
  <circle> with stroke applied as:
    stroke: linear-gradient not available in SVG, so use a second arc path
    from 120deg to 300deg with stroke #3D3A35 (E[7]), stroke-width 0.8, opacity 0.5
    — or fake it with a clipped highlight circle offset 2px down-right, fill E[7], opacity 0.2, r = node_r + 1

Layer 5 — Core dot (the "precious" center):
  Current: r=4, fill E1E1E1, opacity 0.85.
  Should be: r=3.5, with its own radial gradient:
    center: #FFFFFF opacity 1
    edge: #C8C8C8 opacity 0.6
  Plus a micro-shadow beneath it:
    circle r=4, fill black, opacity 0.15, offset y=1
```

**Prescription for AI nodes:**

AI nodes currently have `fill: E[3]` with a thin stroke. They should feel like hollow glass vessels.

```
Layer 1 — Outer ring with thickness:
  Two concentric circles:
    Outer: r, stroke E[5], stroke-width 1.8
    Inner: r-3, stroke E[5], stroke-width 0.5, opacity 0.3
  This creates the impression of a physical bezel.

Layer 2 — Fill (dark glass):
  <radialGradient id="node-ai-fill" cx="50%" cy="45%">
    <stop offset="0%" stop-color="#1A1816" stop-opacity="0.9" />   /* E[3] */
    <stop offset="80%" stop-color="#0C0B09" stop-opacity="0.95" /> /* E[1] */
  </radialGradient>

Layer 3 — Inner refraction ring:
  The current "inner ring" at r-4 is invisible. Make it meaningful:
  circle r * 0.6, stroke T.ghost (#606060), stroke-width 0.3, stroke-dasharray "1 3"
  — this suggests internal structure, like a lens element.

Layer 4 — Model color tint:
  Instead of a tiny icon at LOD 3, give the entire AI node a subtle chromatic wash:
  circle r * 0.7, fill: model.color, opacity 0.04
  This means Claude nodes have a faint warm amber glow, GPT nodes have a faint green glow.
  Visible on hover: opacity increases to 0.08.
```

**What this achieves:** Nodes go from "colored circle" to "physical object under a microscope" -- the petri dish metaphor becomes real.

---

## 2. THE GLASS EFFECTS LOOK CHEAP

**The problem.** The `glass` object in theme.ts is:
```
background: #13120FCC (E[2] at 80%)
backdrop-filter: blur(16px)
border: 1px solid E[6]
```

That is the CSS `glassmorphism` tutorial from 2021. Every AI chat app ships this exact treatment. It is not premium. It is the absence of a design decision.

Arc Browser's glass has a layered inner glow at the top edge. Linear's dropdowns have a subtle inner shadow that creates depth. Raycast has a hard 1px highlight at the top and a 1px shadow at the bottom, creating a beveled card.

**The glass has three problems:**
1. A single flat border at full opacity looks like a wireframe, not a material
2. No inner edge treatment -- premium glass has a top-edge light catch
3. The blur amount (16px) is correct but the background opacity (CC / 80%) is too transparent for warm blacks. Against E[1] canvas, the glass doesn't differentiate from the background enough.

**Prescription -- replace `glass` with a multi-layer treatment:**

```css
/* Base glass */
background: linear-gradient(
  180deg,
  rgba(26, 24, 22, 0.92) 0%,     /* E[3] at 92% */
  rgba(19, 18, 15, 0.88) 100%    /* E[2] at 88% */
);
backdrop-filter: blur(20px) saturate(1.2);
-webkit-backdrop-filter: blur(20px) saturate(1.2);

/* Border: top edge is lighter (light catch), bottom edge is darker */
border-top: 1px solid rgba(61, 58, 53, 0.6);    /* E[7] at 60% */
border-left: 1px solid rgba(44, 42, 38, 0.4);   /* E[6] at 40% */
border-right: 1px solid rgba(44, 42, 38, 0.3);  /* E[6] at 30% */
border-bottom: 1px solid rgba(19, 18, 15, 0.6);  /* E[2] at 60% */

/* Outer shadow: float above canvas */
box-shadow:
  0 1px 0 0 rgba(61, 58, 53, 0.15) inset,  /* inner top highlight */
  0 -1px 0 0 rgba(0, 0, 0, 0.2) inset,     /* inner bottom shadow */
  0 4px 16px -2px rgba(0, 0, 0, 0.5),       /* drop shadow */
  0 1px 3px 0 rgba(0, 0, 0, 0.3);           /* tight shadow */
```

**For `glassElevated` (model selector dropdown, context menu):**

Same as above, plus:
```css
box-shadow:
  0 1px 0 0 rgba(61, 58, 53, 0.2) inset,
  0 -1px 0 0 rgba(0, 0, 0, 0.25) inset,
  0 8px 32px -4px rgba(0, 0, 0, 0.6),
  0 2px 6px 0 rgba(0, 0, 0, 0.35),
  0 0 0 1px rgba(0, 0, 0, 0.15);            /* subtle outline */
```

---

## 3. EDGES ARE INVISIBLE AND LIFELESS

**The problem.** Every edge type is rendered as a dashed cubic bezier with very low opacity (reply: `#40404050`, branch: `#B0B0B040`). The dash animation exists but the edge strokes are so faint they are functionally invisible against the dark canvas. The edges look like placeholder guidelines, not the "precise circuitry" the metaphor demands.

Figma's canvas edges are thin but confident -- 1-2px solid, clear endpoint connections, visible at every zoom. Obsidian Canvas uses curved connectors with visible arrowheads and clear source/target distinction.

**Prescription:**

Reply edges (the primary conversation flow):
```
stroke: rgba(128, 128, 128, 0.25)   /* T.subtle at 25% — up from current 50 hex = 31% but against a specific alpha channel */
stroke-width: 1.5 (up from 1.3)
stroke-dasharray: none  /* SOLID. The main thread should not be dashed. Dashes imply impermanence. */
stroke-linecap: round
```

Add a subtle glow line beneath the main stroke for depth:
```
Second path, same curve, behind the main:
  stroke: rgba(128, 128, 128, 0.06)
  stroke-width: 6
  filter: blur(3px) — or just use stroke-width to simulate
```

Branch edges (alternative paths):
```
stroke: rgba(176, 176, 176, 0.3)  /* C.branch — warmer, brighter than reply */
stroke-width: 1.2
stroke-dasharray: 8 4  /* longer dashes — deliberate, not jittery */
Animated: dash-offset at 0.8x speed (slower than current, more measured)
```

Regeneration edges:
```
stroke: rgba(221, 0, 0, 0.2)   /* ACCENT at 20% */
stroke-width: 1.0
stroke-dasharray: 2 6  /* short pulses — "retrying" */
Animated: 2x speed (fast, urgent)
```

Add arrowheads. Currently there are none. Every edge just stops. Add a 4x4px arrow marker at the target end:
```svg
<marker id="arrow-reply" viewBox="0 0 6 6" refX="5" refY="3"
  markerWidth="4" markerHeight="4" orient="auto">
  <path d="M0,0 L6,3 L0,6 Z" fill="rgba(128,128,128,0.25)" />
</marker>
```

---

## 4. TYPOGRAPHY FAILS TO CREATE HIERARCHY

**The problem.** Everything is Inconsolata monospace. Everything. The TopBar is Inconsolata 10px. The Inspector labels are Inconsolata 9px. The input bar is Inconsolata 11px. The status bar is Inconsolata 9px. Node labels on canvas are Inconsolata 11px.

There is no typographic hierarchy because there is no variation in typeface, weight distribution, or scale. The size range is 8px to 13px -- a 5px spread. That is not a scale; that is noise. At those sizes, the difference between 9px and 10px is indistinguishable on most displays.

Linear uses Inter for UI and a semibold weight for emphasis, with a clear jump from 12px body to 20px headings. Raycast pairs a geometric sans with a monospace for code-specific contexts. Figma uses Inter with six distinct weight/size combinations.

Monospace everywhere makes sense for a code editor. This is not a code editor. This is a spatial thinking tool. The monospace-everywhere choice makes it look like a terminal, not a premium product.

**Prescription:**

Keep Inconsolata for data, metadata, and code-like elements (node IDs, timestamps, token counts, keyboard shortcuts). Introduce a proportional sans-serif for UI chrome and conversational content.

Recommended pairing: **Inter** for UI / **Inconsolata** for data.

Revised type scale:
```
Display (session name in pill, expanded):   Inter 14px, weight 600, letter-spacing -0.01em, color T.primary
Heading (panel titles — "Timeline", "Memories"): Inter 11px, weight 600, letter-spacing 0.06em, uppercase, color T.ghost
Body (message content in timeline/inspector): Inter 13px, weight 400, line-height 1.65, color T.secondary
Label (metadata — timestamps, model names):  Inconsolata 10px, weight 400, color T.dim
Caption (node labels on canvas):             Inconsolata 10px, weight 500, color T.tertiary
Badge (counts, status):                      Inconsolata 9px, weight 700, color T.primary
Input text:                                  Inter 13px, weight 400, color T.secondary
Input placeholder:                           Inter 13px, weight 400, color T.ghost
```

The key shift: message content and UI labels switch to Inter. Data stays Inconsolata. This creates a legible, approachable reading surface for the conversational content while preserving the technical aesthetic for metadata.

---

## 5. SPACING IS MECHANICAL, NOT INTENTIONAL

**The problem.** Padding values across all components: 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24. That is 14 distinct spacing values with no governing system. Some examples:

- Context menu item padding: `6px 9px` (why 9?)
- Inspector body padding: `12px` (fine)
- Timeline message padding: `8px 14px` (14 is not on any grid)
- Memory shelf item padding: `8px 10px` (10 is not on any grid)
- Learn overlay padding: `14px 18px` (neither is on a grid)
- Floating input padding toggles between `6px 12px` and `10px 16px`

No consistent system. Linear uses an 8px grid religiously. Raycast uses 4px increments. Arc uses 8px with 4px for tight spacing.

**Prescription -- adopt a strict 4px base grid:**

```
Spacing tokens:
  space-1:  4px   (micro — between icon and label)
  space-2:  8px   (tight — between related elements)
  space-3:  12px  (standard — component internal padding)
  space-4:  16px  (comfortable — panel padding, section gaps)
  space-5:  20px  (generous — between sections)
  space-6:  24px  (breathing — major section separation)
  space-8:  32px  (dramatic — hero/empty state spacing)
```

Every padding and gap value should map to one of these tokens. Specific corrections:

- Context menu item: `6px 9px` --> `8px 12px` (space-2 vertical, space-3 horizontal)
- Inspector header: `8px 12px` stays (already on grid)
- Timeline message: `8px 14px` --> `8px 16px` (space-2 / space-4)
- Memory shelf item: `8px 10px` --> `8px 12px`
- Learn overlay body: `14px 18px` --> `16px 20px` (space-4 / space-5)
- Session pill header: `7px 14px` --> `8px 16px`
- Top controls gap: `6` --> `8`
- Floating input: `6px 12px` / `10px 16px` --> `8px 12px` / `12px 16px`
- ToolCard header: `5px 8px` --> `8px 12px`
- Clip creator: `6px 14px` / `8px 14px` --> `8px 16px` / `12px 16px`

---

## 6. COLOR IS USED LAZILY

**The problem.** The design direction says "single accent color (red), used exclusively for attention." But the implementation leaks several chromatic colors:

- `#0066FF` (blue) on the Branch tool button
- `#8B5CF6` (purple) on the Clip tool button and throughout MemoryShelf
- `#FFCC00` (yellow) used in Learn mode and effects.ts ripple colors
- `#10A37F` (green) on OpenAI model indicators
- `#4285F4` (blue) on Google model indicators
- `#6366F1` (indigo) on Qwen model indicators
- `#D4A574` (amber) on Anthropic model indicators

The model-branded colors are defensible -- they serve identification. But `#0066FF`, `#8B5CF6`, and `#FFCC00` are gratuitous. The Branch button is blue because... branching is blue? There is no chromatic language here. These are placeholder colors from a developer who needed to distinguish three buttons.

The design direction explicitly says luminance-only hierarchy with a single red accent. This is violated throughout.

**Prescription:**

Remove all non-model chromatic colors from the UI. Restructure using the luminance hierarchy:

```
Branch actions:  T.secondary (#C8C8C8) — bright white, the most important action
Clip actions:    T.tertiary (#A8A8A8) — medium, secondary importance
Inspect actions: T.subtle (#808080) — lowest priority

Memory shelf border: E[6] (#2C2A26) — elevation-based, not purple
Memory "save" buttons: T.tertiary with E[6] border — no purple
Learn mode header: ACCENT (#DD0000) — this one is correct, it demands attention
Learn mode buttons: T.secondary with E[6] border — currently using yellow, should be neutral

Ripple effects in effects.ts:
  Current: rgba(255,204,0,0.3) — YELLOW. Why?
  Should be: rgba(225,225,225,0.15) — warm white. Ripples are spatial feedback, not alerts.
  Second ripple: rgba(225,225,225,0.06) — even subtler.

Drag trail dots:
  Current: rgba(255,204,0,...) — again yellow for no reason.
  Should be: rgba(200,200,200,...) — warm gray, same luminance family.
```

The only chromatic color in the entire interface should be:
1. `#DD0000` (ACCENT red) -- for focus, streaming, danger, attention
2. Model brand colors -- inside model selector and node interiors only
3. Nothing else.

---

## 7. MISSING VISUAL ELEMENTS

These are things that Linear, Raycast, Arc, Figma Canvas, and Obsidian Canvas all have that Dreamcacher does not:

### 7a. No canvas depth / atmosphere

The canvas is a flat `#0C0B09` fill with dot grid. There is no sense of depth, no gradient, no vignette, no atmosphere. The "petri dish" metaphor requires the canvas itself to feel like a physical surface.

**Prescription:**

Add a subtle radial gradient centered on the viewport:
```css
/* Apply to the canvas container as a pseudo-element or overlay */
background:
  radial-gradient(
    ellipse 120% 120% at 50% 50%,
    rgba(19, 18, 15, 0) 0%,          /* transparent center */
    rgba(8, 7, 6, 0.4) 70%,          /* darkening toward edges */
    rgba(8, 7, 6, 0.8) 100%          /* near-black vignette */
  ),
  #0C0B09;
```

This vignette makes the center feel illuminated (the "microscope light") and the edges fade into darkness. It transforms the canvas from a flat plane into a viewed-through-lens surface.

Additionally, the grid dots should have a density gradient: denser near the center of the viewport, fading toward edges. Currently the grid is uniform, which reads as graph paper, not a biological substrate.

### 7b. No hover micro-interactions on nodes

When you hover a node, the stroke color changes. That is it. No scale, no lift, no glow intensification. Every premium canvas app has hover state that makes the element feel reactive:

**Prescription:**

On hover, nodes should:
```
1. Scale to 1.05 (5% larger) over 150ms ease-out
2. Shadow intensifies:
   drop-shadow(0 4px 12px rgba(0,0,0,0.7))  /* from 0 2px 4px */
3. Specular highlight brightens: opacity 0.12 --> 0.20
4. Stroke brightens by one luminance level (T.subtle --> T.tertiary for AI, T.secondary --> T.primary for user)
5. Label opacity goes to 1.0 if it was lower
```

All over 150ms with `cubic-bezier(0.2, 0, 0, 1)`.

### 7c. No transition on panel open/close

The Inspector and Timeline panels use `transform: translateX` with a 0.2s/0.25s cubic-bezier. That is correct but insufficient. There is no opacity fade, no content stagger, and no backdrop change.

**Prescription:**

When a panel opens:
```
Panel container: translateX(100%) --> translateX(0), opacity 0 --> 1
  Duration: 300ms, easing: cubic-bezier(0.16, 1, 0.3, 1)

Panel header: delay 50ms, translateY(8px) --> translateY(0), opacity 0 --> 1
Panel content items: stagger 30ms each, translateY(4px) --> translateY(0), opacity 0 --> 1
  (For Timeline messages, stagger the last 5 visible messages)

Canvas: when panel opens, dim slightly:
  Apply rgba(0,0,0,0.15) overlay on the main canvas area
  Duration: 300ms
```

### 7d. No empty state design

When the canvas has zero nodes, the user sees: a dot grid and a floating input bar. There is no guidance, no visual invitation, no personality.

**Prescription:**

Empty state centered on canvas:
```
Large monogram: "DC" at 64px, weight 200 (ultra-light), color E[5], letter-spacing 8px
Below: "Start a conversation" at 13px Inter, weight 400, color T.ghost
Below that: "/" shortcut hint at 10px Inconsolata, color T.dim, with kbd styling

All elements at 60% opacity.
Fade out over 500ms when first node is created.
```

### 7e. No connection animation

When a new edge is created (user sends message, AI responds), the edge just appears. There is no draw-on animation, no signal that a connection was made.

**Prescription:**

New edges should animate their stroke-dashoffset from full-length to 0 over 400ms:
```
Initial: stroke-dasharray: [total path length], stroke-dashoffset: [total path length]
Animate to: stroke-dashoffset: 0
Duration: 400ms
Easing: cubic-bezier(0.4, 0, 0.2, 1)
```

This creates a "drawing" effect where the edge traces from source to target. Combined with the node entrance animation, it creates the feeling that the graph is growing organically.

### 7f. No focus ring on the input

The floating input has no visible focus indicator. When focused, the border changes from `E[6]40` to `E[6]80`. That is a 25% opacity increase on a dark border against a dark background -- invisible.

**Prescription:**

On focus, the input container should:
```
border-color: rgba(221, 0, 0, 0.3)   /* ACCENT at 30% — the only accent color */
box-shadow:
  0 0 0 2px rgba(221, 0, 0, 0.08),   /* subtle outer glow */
  0 0 16px -4px rgba(221, 0, 0, 0.12) /* diffuse red halo */
Transition: 200ms ease-out
```

This ties the input focus to the accent color system and makes focus state unmistakable.

### 7g. No scroll indicators or fade-outs

The Inspector, Timeline, and Memory Shelf all have `overflowY: auto` with no visual treatment at scroll boundaries. Content just clips. Premium apps fade content at the top and bottom scroll edges.

**Prescription:**

Add gradient masks at scroll boundaries:
```css
/* Apply to the scrollable container */
mask-image: linear-gradient(
  to bottom,
  transparent 0px,
  black 16px,
  black calc(100% - 16px),
  transparent 100%
);
-webkit-mask-image: /* same */;
```

This creates a 16px fade at top and bottom, making scroll feel smooth and intentional.

### 7h. No streaming indicator beyond the node

When AI is streaming, the node pulses. But the rest of the UI gives no signal. The floating input says "Thinking..." in 9px monospace. There should be a system-wide streaming state.

**Prescription:**

When streaming:
```
1. Input bar: left border animates as a thin ACCENT line, height cycling from 0% to 100%:
   border-left: 2px solid ACCENT
   Mask or clip-path animates vertically over 1.5s loop

2. Status bar: the phase dot pulses (already exists, good)

3. Session pill: the phase dot pulses in sync

4. Canvas: a very subtle, slow radial pulse from the streaming node position:
   Radial gradient overlay, 200px radius, ACCENT at 2% opacity,
   expanding and contracting over 2s: scale 0.8 <-> 1.2
```

---

## 8. THE CONTEXT MENU IGNORES THE GLASS SYSTEM

**The problem.** The context menu uses:
```
background: E[2]
border: 1px solid #363636
box-shadow: 0 8px 24px rgba(0,0,0,0.5)
```

This is a hardcoded border color (`#363636`) that does not exist in the theme system. The shadow is a single layer. The background is opaque, not glass. Every other floating element uses the `glass` object, but the context menu does not.

**Prescription:**

Apply `glassElevated` to the context menu with the improved treatment from critique #2. Additionally:

```
border-radius: 10px (up from 6px — match the floating input and session pill)
padding: 4px (fine)
min-width: 180px (up from 150px — give items breathing room)

Menu item padding: 8px 12px (up from 6px 9px — onto the grid)
Menu item border-radius: 6px (up from 4px)
Menu item font-size: 12px (up from 11px — readability at interaction speed)
Menu item gap: 8px (up from 7px — onto the grid)

Dividers: margin 4px 8px (up from 2px 5px)
Divider color: E[5] (currently E[6] — too visible, make more subtle)

Add entry animation:
  Container: scale(0.95) opacity(0) --> scale(1) opacity(1)
  Duration: 120ms, easing: cubic-bezier(0.2, 0, 0, 1)
  Transform-origin: top-left (at cursor position)

Menu items: stagger 20ms, translateY(2px) opacity(0) --> translateY(0) opacity(1)
```

---

## 9. THE STATUS BAR IS WASTED SPACE

**The problem.** The status bar is 24px of Inconsolata 9px text showing model name, phase, node count, edge count, token estimate. It looks like a code editor status bar (VS Code, Zed). This is not a code editor.

More critically: it occupies a fixed 24px at the bottom of the viewport that could be part of the canvas. On a spatial interface, every pixel of canvas is valuable.

**Prescription:**

Remove the status bar as a fixed bar. Fold its information into existing elements:

- Model name and phase: already shown in Session Pill (collapsed state shows phase dot)
- Node/edge count: move to Session Pill peek state
- Token estimate: move to Inspector panel metadata section (only relevant when inspecting)

If a persistent status indicator is truly needed, reduce it to a single floating pill in the bottom-left corner:
```
Fixed: bottom 12px, left 12px
Content: phase dot + "Idle" or "Streaming"
Glass treatment, border-radius 20px (fully rounded pill)
padding: 4px 12px
font-size: 9px Inconsolata
Opacity: 0.6 normally, 1.0 when streaming
Transition: opacity 300ms
```

This frees the full-bleed bottom edge and eliminates the "code editor chrome" feeling.

---

## 10. THE TOP BAR SHOULD NOT EXIST

**The problem.** TopBar.tsx renders a 36px opaque header bar with "DC Dreamcacher" on the left and a red dot with "Active" on the right. This component appears to be vestigial -- the SessionPill already displays "DC" with a phase dot, the model selector is in FloatingUI's TopControls, and the "Active" status is in the StatusBar.

The TopBar adds nothing. It removes 36px from the canvas height and adds a horizontal divider that breaks the floating-on-canvas aesthetic that the rest of the UI pursues.

**Prescription:**

Remove TopBar entirely. The SessionPill (centered, floating, glass-treated) already serves as the primary brand / navigation element. The 36px should be returned to the canvas.

If it is still being rendered (it is imported in page.tsx but I note it is NOT -- good, the page only uses SessionPill now), confirm it is fully dead code and delete it.

---

## 11. BORDER RADIUS INCONSISTENCY

**The problem.** Border radius values across the codebase: 3, 4, 5, 6, 8, 10, 12, 14, 16, 20. Ten distinct values. Linear uses exactly two: 6px for small elements, 12px for cards/panels. Raycast uses 8px universally with 4px for micro-elements.

**Prescription -- three radius tokens:**

```
radius-sm:  6px   (buttons, badges, inputs, menu items)
radius-md:  12px  (cards, panels, floating containers, input bars)
radius-lg:  16px  (modals, overlays, the learn overlay)
radius-pill: 9999px  (fully rounded pills, phase dots)
```

Specific corrections:
- Action buttons in Inspector: 4px --> 6px
- ToolCard: 6px stays
- Context menu: 6px --> 12px
- Context menu items: 4px --> 6px
- Session pill collapsed: 10px --> 12px
- Session pill open: 14px --> 16px
- Floating input: 10px/14px --> 12px/12px (don't change radius on focus -- it's jarring)
- Glass buttons (timeline toggle, memory toggle): 8px stays (nearest to 6px on a round element, acceptable)
- Learn overlay: 16px stays
- Shortcuts help: 14px --> 16px
- ClipCreator: 12px stays
- Memory items: 6px stays
- Search inputs: 6px stays

---

## 12. SELECTION STATE IS WEAK

**The problem.** The primary selection ring is:
```
stroke: ACCENT, stroke-width: 1, stroke-dasharray: 6, opacity: 0.5
```

A 1px dashed red ring at 50% opacity. On a dark canvas with dark nodes, this is barely perceptible. Selection is the most critical state in a spatial interface -- it tells you what you are operating on.

**Prescription:**

Replace the selection ring with a multi-layer selection indicator:
```
Layer 1 — Glow (atmospheric, behind node):
  circle r + 20, fill: radial-gradient
    center: ACCENT at 8% opacity
    edge: ACCENT at 0%
  This creates a soft red halo.

Layer 2 — Ring (crisp, structural):
  circle r + 5
  stroke: ACCENT
  stroke-width: 1.5 (up from 1)
  stroke-dasharray: none  /* SOLID for primary selection. Dashed = uncommitted. */
  opacity: 0.7 (up from 0.5)

Layer 3 — Outer breath (alive):
  circle r + 10 + 2*sin(time*3)  /* gentle breathing */
  stroke: ACCENT
  stroke-width: 0.5
  opacity: 0.15

Keep the dashed ring for MULTI-selection (secondary selected nodes) — that is correct.
```

---

## SUMMARY OF PRIORITIES

Ranked by visual impact:

1. **Node dimensionality** (critique #1) -- This is the single highest-impact change. Transforms nodes from dev debug circles to precious objects.
2. **Glass treatment** (critique #2) -- Every floating element improves simultaneously.
3. **Edge visibility and arrows** (critique #3) -- Makes the graph readable.
4. **Canvas atmosphere / vignette** (critique #7a) -- Establishes the petri dish metaphor instantly.
5. **Color discipline** (critique #6) -- Removes the "picked random colors" problem.
6. **Typography pairing** (critique #4) -- Separates data from content, creates reading hierarchy.
7. **Selection state** (critique #12) -- Critical for usability.
8. **Spacing grid** (critique #5) -- Subtle but compounds across every component.
9. **Missing hover states** (critique #7b) -- Reactivity and polish.
10. **Remove status bar / consolidate chrome** (critiques #9, #10) -- Maximize canvas.
11. **Context menu upgrade** (critique #8) -- Consistency.
12. **Border radius tokens** (critique #11) -- Consistency.
13. **Panel transitions** (critique #7c) -- Polish.
14. **Empty state** (critique #7d) -- First impression.
15. **Edge draw animation** (critique #7e) -- Delight.
16. **Scroll fades** (critique #7g) -- Polish.
17. **Focus ring** (critique #7f) -- Accessibility and polish.
18. **Streaming system indicator** (critique #7h) -- Awareness.

The first four items would transform the product from "developer prototype" to "intentional design." Items 5-8 would bring it to "polished beta." Items 9-18 would bring it to "premium product."

---

This critique does not question the architecture, the interaction model, or the feature set. Those are strong. The spatial metaphor, the branching model, the session system, the memory shelf -- all of this is well-conceived. The gap is entirely in visual execution: the current rendering makes a premium product concept look like a hackathon prototype. The fixes above are specific enough to implement directly and would close that gap.
