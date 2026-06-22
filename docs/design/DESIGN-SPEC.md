# Dreamcatcher Design Specification

Concrete, implementation-ready design spec for every surface in Dreamcatcher.
Written for a world-class frontend engineer to build from without ambiguity.

---

## Design Philosophy

Dreamcatcher is a spatial conversation interface. The aesthetic is **observatory dark** -- the feeling of peering into a warm, living system through precision glass instruments. Not cold-blue developer dark mode. Not flat matte black. Warm, dimensional, alive.

**Reference products and what we take from each:**
- **Linear**: Their text hierarchy is peerless -- three luminance levels, no decorative color in body text, generous line-height. We adopt their approach to making monochrome feel premium through spacing alone.
- **Raycast**: Their floating panels feel like physical objects because of directional borders (top brighter than bottom) and tight drop shadows. We adopt their glass treatment as our panel baseline.
- **Warp**: Their terminal input bar proves that monospace can feel luxurious when you give it room to breathe. We adopt their input field proportions.
- **Vercel**: Their status indicators prove that a single accent color used with extreme restraint creates stronger brand recognition than a full palette. We adopt their single-accent discipline (DD0000 red, used only for active/attention states).

**Why warm blacks**: Cool-blue dark modes (GitHub, VS Code defaults) feel clinical. Warm undertones (#0C0B09 instead of #0A0A0F) create an organic, inhabited feeling -- like polished walnut rather than brushed steel. This is the Bumba brand position: technology with soul.

---

## Foundation: Typography

### Font Stack

**Primary**: `'Inconsolata', monospace`
- Already loaded via Google Fonts. Inconsolata is the right call -- it has more personality than IBM Plex Mono and more legibility than Fira Code, with the warm humanist details that match the palette.

**WHY monospace everywhere**: In a node-graph conversation tool, monospace creates a visual rhythm that makes scanning across nodes natural. Every character occupies the same width, so labels at different zoom levels stay predictable. Linear uses monospace for their issue IDs for the same reason -- it creates a cadence.

### Type Scale (4px grid aligned)

All sizes chosen so that `font-size * line-height` lands on a 4px increment.

| Token | Size | Weight | Line-Height | Letter-Spacing | Color | Usage |
|-------|------|--------|-------------|----------------|-------|-------|
| `type-display` | 14px | 600 | 20px (1.43) | 0 | T.primary #E1E1E1 | Floating input text (focused), Learn overlay titles |
| `type-body` | 13px | 400 | 20px (1.54) | 0 | T.secondary #C8C8C8 | Floating input text (unfocused), timeline message text |
| `type-body-small` | 12px | 400 | 20px (1.67) | 0 | T.secondary #C8C8C8 | Inspector body text, context menu items, canvas tools labels |
| `type-label` | 11px | 500 | 16px (1.45) | 0 | T.tertiary #A8A8A8 | Session pill names, timeline role labels, dropdown items |
| `type-caption` | 10px | 400 | 16px (1.6) | 0 | T.subtle #808080 | Metadata values, timestamps, secondary info |
| `type-micro` | 9px | 600 | 12px (1.33) | 0.8px | T.ghost #606060 | Section headers (uppercased), keyboard shortcuts |
| `type-nano` | 8px | 600 | 12px (1.5) | 0.5px | T.dim #404040 | Tool call labels, badge counts, tertiary metadata |

### Section Headers

All section headers use the `type-micro` token with `text-transform: uppercase`. This is a deliberate Raycast pattern -- uppercase micro-text section headers create clear hierarchy without taking visual space from content. The 0.8px letter-spacing prevents the uppercase characters from feeling cramped at 9px.

**WHY these specific sizes**: The jump from 9 to 14 across seven steps creates a 1.07x average ratio -- tighter than a traditional 1.125 minor-second scale. This is intentional for a tool-dense UI. Wide type scales waste space in sidebars and floating panels. The tight scale means every size is meaningfully different without any size feeling oversized for its context.

---

## Foundation: Color

### Elevation Stack

Eight warm-black stops creating physical depth through luminance alone. Each step adds approximately 6-8 lightness points, weighted toward the dark end (more steps in the 0-15% range where the eye is most sensitive to change).

```
E[0]: #080706  -- Void. Title bar, status bar, inspector background. Deepest layer.
E[1]: #0C0B09  -- Canvas background. The "ground plane" of the entire app.
E[2]: #13120F  -- Recessed surfaces. Inactive tabs, code blocks inside panels.
E[3]: #1A1816  -- Panel fills. Glass gradient dark stop. Active line background.
E[4]: #1E1C19  -- Input field backgrounds. Surface-level containers.
E[5]: #252320  -- Subtle borders, grid dots, dividers between sections.
E[6]: #2C2A26  -- Visible borders, elevated surface edges, active tab backgrounds.
E[7]: #3D3A35  -- Hover states, highest elevation. The "shelf" that UI sits on.
```

**WHY eight stops instead of four**: Four stops (as in most design systems) creates a "poster" feel -- flat layers stacked like construction paper. Eight stops with tight spacing lets us build surfaces that feel like they have continuous depth, the way real glass transitions from dark at the edges to light at the center. The gradient in the glass treatment (`E[3] -> E[2]`) spans only two stops, which reads as subtle curvature rather than a color change.

### Text Hierarchy

Pure achromatic. No tinted text. Importance = brightness.

```
T.primary:   #E1E1E1  -- Headings, active labels, selected items. ~88% luminance.
T.secondary: #C8C8C8  -- Body text, input text. ~78% luminance.
T.tertiary:  #A8A8A8  -- Secondary labels, metadata values. ~66% luminance.
T.subtle:    #808080  -- Operators, low-importance items. ~50% luminance.
T.ghost:     #606060  -- Comments, section headers, inactive icons. ~38% luminance.
T.dim:       #404040  -- Barely visible hints, disabled text. ~25% luminance.
T.invisible: #2C2A26  -- Border-level. Only visible against E[0]-E[1] backgrounds.
```

**WHY no chromatic text**: In a product where nodes carry faction colors (amber, green, yellow, orange), chromatic body text would compete. Linear proved that monochrome text hierarchy -- where the only variable is brightness -- creates the cleanest reading experience. Color is reserved for meaning (faction identity, accent attention).

### Accent

```
ACCENT:    #DD0000  -- Pure attention. Selection, streaming, active states.
ACCENT_30: #DD000030  -- Text selection background, soft focus rings.
ACCENT_18: #DD000018  -- Very subtle hover backgrounds on accent-related items.
```

One color. Used with extreme restraint. If more than 3 elements on screen are red simultaneously, something is wrong.

**WHY pure red and not warm red**: #DD0000 is deliberately cool-shifted relative to the warm palette. This creates maximum contrast against the amber/brown environment. A warm red (#CC3300) would blend into the elevation stack. The cool red pops because it is the only non-warm color in the entire system. Vercel uses a similar strategy -- their blue accent against warm grays is arresting because it breaks the temperature.

### Faction Colors (Model Providers)

```
Anthropic: #D4A574  -- Warm amber. Leather, whiskey, aged paper.
OpenAI:    #52C41A  -- Vital green. Growth, operation, active systems.
Google:    #FAAD14  -- Signal yellow. Attention, discovery, illumination.
Qwen:      #FA8C16  -- Deep orange. Heat, forge, transformation.
```

Used exclusively inside AI node materials (subtle gradient tints, core indicators, streaming halos) and in the model selector. Never used for UI chrome or text.

---

## Foundation: Spacing

### 4px Grid

Every margin, padding, gap, and dimension is a multiple of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `sp-1` | 4px | Minimum gap. Icon-to-text in tight layouts. |
| `sp-2` | 8px | Standard small gap. Between items in a row. |
| `sp-3` | 12px | Panel padding (horizontal). Section spacing. |
| `sp-4` | 16px | Panel padding (generous). Input bar padding (focused). |
| `sp-5` | 20px | Modal padding. Major section gaps. |
| `sp-6` | 24px | Large gaps between major sections. |
| `sp-8` | 32px | Maximum breathing room. Canvas edge clearance. |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `r-sm` | 4px | Buttons, badges, kbd elements, action buttons |
| `r-md` | 6px | Input fields, tool cards, menu items, memory cards |
| `r-lg` | 8px | Glass buttons (top controls), model selector trigger |
| `r-xl` | 10px | Session pill (collapsed), canvas tools pill, floating bars |
| `r-2xl` | 12px | Floating input bar, context menu, clip creator, path trace |
| `r-3xl` | 14px | Session pill (open), shortcuts modal, learn overlay |
| `r-4xl` | 16px | Learn overlay panel |

**WHY the graduated radius**: Small interactive elements (buttons, inputs) use tight radii (4-6px) because they need to feel crisp and clickable -- rounded corners at small sizes look soft and toy-like. Larger floating panels use generous radii (12-16px) because they are ambient surfaces that should feel like floating glass, not rigid windows. This graduated approach is what separates Raycast (which does it) from most Electron apps (which use a single radius everywhere).

---

## Foundation: Shadows and Borders

### Glass Treatment (Standard)

The defining visual of Dreamcatcher's floating UI. Every panel that floats above the canvas uses this treatment.

```css
background: linear-gradient(180deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%);
backdrop-filter: blur(20px) saturate(1.2);
border-top:    1px solid rgba(61,58,53,0.6);    /* E[7] at 60% -- light catch */
border-left:   1px solid rgba(44,42,38,0.4);    /* E[6] at 40% */
border-right:  1px solid rgba(44,42,38,0.3);    /* E[6] at 30% */
border-bottom: 1px solid rgba(19,18,15,0.6);    /* E[2] at 60% -- shadow edge */
box-shadow:
  0 1px 0 0 rgba(61,58,53,0.15) inset,          /* inner top highlight */
  0 -1px 0 0 rgba(0,0,0,0.2) inset,             /* inner bottom shadow */
  0 4px 16px -2px rgba(0,0,0,0.5),              /* primary drop shadow */
  0 1px 3px 0 rgba(0,0,0,0.3);                  /* tight contact shadow */
```

**WHY four different border opacities**: A real glass object lit from above has a bright top edge (light catch), medium side edges, and a dark bottom edge (self-shadow). Four different border opacities simulate this directional lighting. If all borders were the same opacity, the panel would look flat. Raycast's floating panels use this exact technique -- different opacity per side -- and it is the single biggest contributor to their "physical" feel.

**WHY two inset shadows**: The inset top highlight and inset bottom shadow create the illusion of glass thickness. Without them, the panel reads as a flat card with a drop shadow. With them, it reads as a slab of frosted glass with light refracting through its edges.

### Glass Treatment (Elevated)

For context menus and elements that float above other floating elements.

```css
background: linear-gradient(180deg, rgba(30,28,25,0.94) 0%, rgba(22,20,18,0.91) 100%);
backdrop-filter: blur(24px) saturate(1.3);
border-top:    1px solid rgba(61,58,53,0.7);
border-left:   1px solid rgba(44,42,38,0.5);
border-right:  1px solid rgba(44,42,38,0.4);
border-bottom: 1px solid rgba(19,18,15,0.7);
box-shadow:
  0 1px 0 0 rgba(61,58,53,0.2) inset,
  0 -1px 0 0 rgba(0,0,0,0.25) inset,
  0 8px 32px -4px rgba(0,0,0,0.6),              /* deeper shadow */
  0 2px 6px 0 rgba(0,0,0,0.35),
  0 0 0 1px rgba(0,0,0,0.15);                   /* subtle outline for separation */
```

Elevated glass is 2% more opaque, has 4px more blur, and throws a deeper shadow. The extra `0 0 0 1px` outline shadow provides crisp separation from whatever surface is behind it.

### Solid Panel Treatment

For full-height panels (Inspector, Timeline, Status Bar) that are not floating but rather docked to an edge.

```css
background: #080706;                            /* E[0] -- deepest */
border-left: 1px solid #1E1C19;                 /* E[4] -- subtle separator */
```

No blur, no gradient, no shadow. Docked panels are part of the frame, not floating objects. Their visual simplicity makes the glass floating elements feel special by contrast.

---

## Component Specifications

---

### 1. Canvas (GraphCanvas)

The canvas is the ground plane. Everything floats above it.

| Property | Value | Rationale |
|----------|-------|-----------|
| Background | `#0C0B09` (E[1]) | Warm black. Not pure black (#000) which feels dead, not blue-black which feels cold. |
| Grid dots | `#252320` (E[5]) | Exactly 3 elevation steps above background. Visible enough to provide spatial reference, invisible enough to not compete with nodes. |
| Grid spacing | 20px (world units) | At 1x zoom, 20px between dots. Dense enough for spatial orientation, sparse enough to not create moire patterns on retina displays. |
| Grid dot radius | `max(0.6, 0.8 * scale)` | Dots scale with zoom but have a minimum size so they don't disappear at low zoom. |
| Grid fade threshold | `gap < 6px` screen space | When zoomed out so far that dots would be <6px apart, hide the grid entirely. Prevents visual noise. |

**Canvas has no noise, no vignette.** The warm black and dot grid are the entire treatment. This restraint is what makes the nodes feel precious -- they are the only dimensional objects on a flat, calm field. Adding noise or vignette would make the canvas compete for attention.

---

### 2. Nodes (SVG, rendered imperatively)

Nodes are the most visually important elements in Dreamcatcher. They must look like precious physical specimens under a microscope -- dimensional, material, alive.

#### User Nodes (circles)

| Layer | What | Value | Purpose |
|-------|------|-------|---------|
| Radius | Base | 24px | Large enough to feel substantial at default zoom. Picked so that at LOD 2 (50% zoom), nodes are still 12px -- large enough to distinguish shape. |
| 1 | Drop shadow | `circle(cx:0, cy:2, r:24)` fill `black` opacity `0.3` | 2px downward offset creates grounded-on-surface feeling. Not a CSS shadow -- a literal SVG circle behind the node. More controllable, cheaper to render at 60fps. |
| 2 | Body fill | `radialGradient(cx:45%, cy:35%, r:65%)`: E[6] -> E[4] -> E[2] | Off-center hotspot (45%,35%) simulates top-left lighting. Three stops create convex curvature -- bright center fading to dark edges like a polished sphere. |
| 2 | Body stroke | `T.secondary` (#C8C8C8), 1.8px | Crisp edge definition. Selected: ACCENT, 2.5px. Hovered: T.primary, 1.8px. |
| 3 | Specular highlight | `radialGradient(cx:38%, cy:28%, r:40%)`: white at 25% -> transparent | Tight hotspot offset up-left. This is the "shine" that makes the node look polished. Hover raises opacity from 0.22 to 0.35 (surface "catches more light" when you approach). |
| 4 | Rim light | Arc stroke at `(cx:1, cy:2, r:r+0.5)`, E[7], 1px, dasharray `r*1.8 r*4.5` | Partial-arc rim light on the bottom-right. Simulates environmental light wrapping around the sphere. The dash array ensures only ~30% of the circumference is lit. |
| 5 | Core dot shadow | `circle(cx:0, cy:1, r:5.5)` fill `black` opacity `0.15` | Grounds the core dot on the node surface. |
| 5 | Core dot | `circle(cx:0, cy:0, r:5)` fill `radialGradient(white -> #C8C8C8 at 60%)` | The "pupil" of the node. Bright white center fading to warm gray. This is the detail people notice first. |

**WHY so many layers**: Each layer adds 1ms to render per 100 nodes. At Dreamcatcher's typical scale (10-50 nodes), the cost is negligible. The visual payoff is that nodes look like real objects rather than colored circles. This is the single biggest differentiator from every other graph visualization tool, which renders flat circles with flat fills.

#### User Branch-Point Nodes (hexagons)

Same material treatment as circles but using a hexagonal path. The shape change alone signals "this node has multiple children." Hex shape uses `stroke-linejoin: round` to soften the vertices.

#### AI Nodes (circles)

| Layer | What | Value | Purpose |
|-------|------|-------|---------|
| Radius | Base | 28px | 4px larger than user nodes. AI responses contain more content, and the larger radius creates a visual hierarchy where AI nodes anchor conversations and user nodes are the connective tissue. |
| 1 | Outer bezel | `circle(r:28)` fill `radialGradient(faction-tint at 8% -> E[3] at 90% -> E[1] at 95%)`, stroke E[5] 2px | The faction color appears as an 8% tint at the center of the gradient -- barely visible but enough to create a warm/cool/yellow shift that identifies the model at a glance. |
| 1 | Inner bezel | `circle(r:25)` stroke E[5] 0.5px, opacity 0.3 | Double-ring bezel (like a watch face). The inner ring is subtler, creating the illusion of a stepped edge. |
| 2 | Refraction ring | `circle(r:r*0.6)` stroke T.ghost 0.4px, dasharray `1.5 3`, opacity 0.4 | Dashed inner ring suggesting a lens element. This is what makes AI nodes look like glass instruments rather than empty circles. |
| 3 | Faction ring | `circle(r:r*0.45)` stroke `factionColor` 0.5px, opacity 0.2 (hover: 0.3) | The clearest faction identifier below the icon. A thin colored ring halfway between edge and center. |
| 4 | Faction wash | `circle(r:r*0.7)` fill `factionColor`, opacity 0.10 (hover: 0.16) | Subtle chromatic fill. At 10% opacity, the amber/green/yellow/orange reads as a mood rather than a color. Hover intensifies to 16% -- a "warming" effect. |
| 5 | Core indicator | `circle(r:r*0.2)` fill `factionColor`, opacity oscillating 0.10-0.20 | Pulsing core. The oscillation (2Hz, sinusoidal) gives AI nodes a living quality. Each node's phase is offset by its ID, so cores pulse out of sync -- a field of breathing organisms, not synchronized LEDs. |
| Icon | Model icon | SVG path at `translate(-7,-7) scale(0.58)`, fill `factionColor`, opacity 0.4-0.6 | Visible at LOD 2+. The icon is the definitive model identifier. At LOD 2, it fades in (opacity tracks the crossfade zone). |

#### AI Streaming State

When an AI node is actively receiving tokens:

| Element | Value | Purpose |
|---------|-------|---------|
| Dashed orbit | `circle(r:r+5)`, stroke `factionColor`, 1.5px, dasharray `5 5`, rotating via dashoffset | Spinning dashes around the node perimeter. Uses faction color, not accent red -- the model is working, not the system raising attention. |
| Breathing halo | `circle(r:r+12 + 5*sin(t*4))`, stroke `factionColor` 0.8px, opacity `pulse * 0.25` | Expanding/contracting halo. The 4Hz frequency is deliberately faster than the idle core pulse (2Hz) to signal active processing. |
| Fill wash | `circle(r:r)`, fill `factionColor`, opacity `pulse * 0.05` | The entire node tints slightly during streaming. Very subtle but it makes the node feel "full" of activity. |

#### Node Labels (LOD-gated)

| LOD | What Shows | Font | Opacity |
|-----|-----------|------|---------|
| 0 (< 25% zoom) | Nothing. Dots and lines only. | - | - |
| 1 (25-50%) | Shape distinguishable. No text. | - | - |
| 2 (50-75%) | Truncated label (14 chars + ..), branch badge | 12px / 600 / Inconsolata | Crossfade 0-1 across 5% zone |
| 3 (> 75%) | Full label, model icons, all metadata | 12px / 600 / Inconsolata | 1.0 |

Label position: centered below node, `y = r + 18`. Color: `T.tertiary` for user, `T.ghost` for AI.

**WHY LOD crossfade zones**: Hard LOD transitions (text pops in at exactly 50% zoom) feel jarring -- you notice the threshold. A 5% crossfade zone (labels fade in from 45% to 55%) makes the transition perceptual rather than binary. Linear uses a similar approach for their board view card detail levels.

#### Branch Badge

```
circle(cx: r+5, cy: -r+5, r:8), fill E[6], stroke T.subtle 0.5px
text: child count, 10px/700, fill T.primary
```

Positioned at top-right of node. Appears at LOD 2+. The badge is the only element that overlaps the node boundary, which makes it noticeable without being decorative.

#### Selection Treatment

Selected node receives a three-layer treatment:

| Layer | What | Value |
|-------|------|-------|
| 1 | Atmospheric halo | `circle(r: r+24)`, fill `radialGradient(ACCENT at 8% -> transparent)` | Soft red glow. Large radius creates atmosphere, low opacity prevents it from dominating. |
| 2 | Crisp ring | `circle(r: r+6)`, stroke ACCENT 1.5px, opacity 0.7 | SOLID, not dashed. A dashed selection ring looks indecisive. Solid = committed selection. |
| 3 | Breathing ring | `circle(r: r+12 + 3*sin(t*3))`, stroke ACCENT 0.6px, opacity 0.15 | Gentle expansion/contraction at 3Hz. Signals "this is alive and selected" without being distracting. The low opacity (0.15) makes it feel like heat shimmer, not a pulsing alert. |

**WHY solid inner ring + breathing outer**: The solid ring provides the definitive "this is selected" signal. The breathing ring adds life. If both were solid, it would feel rigid. If both were breathing, it would feel uncertain. The combination of committed + alive is the goal.

---

### 3. Edges

| Type | Stroke | Width | Dash | Animation | Marker |
|------|--------|-------|------|-----------|--------|
| `reply` | `rgba(140,140,140,0.30)` | 2.0px | Solid | None | Arrow (reply) |
| `branch` | `rgba(176,176,176,0.30)` | 1.5px | `12 6` | Scrolling at 0.8x | Arrow (branch) |
| `regeneration` | `rgba(221,0,0,0.20)` | 1.2px | `2 6` | Scrolling at 2.0x | Arrow (regen) |
| `summarizes` | `T.invisible` | 0.8px | `1 4` | Scrolling at 0.5x | None |
| `clips_to` | `C.memory at 30%` | 1.0px | `8 4` | Scrolling at 0.6x | None |
| `references` | `T.ghost at 25%` | 0.8px | `6 2 2 2` | Scrolling at 0.4x | None |

All edges use cubic Bezier curves (`C` command) with control points at 35% of the distance along the line. This creates a gentle S-curve that feels organic rather than the rigid straight lines of most graph tools.

Reply edges additionally have a glow underlayer: same path, `rgba(140,140,140,0.10)` at 10px width. This soft spread behind the primary thread line makes it visually dominant without being heavy.

**WHY dashes animate**: Animated dashes on branch/regen edges create a "flow" direction that communicates parent-child relationships even when arrow markers are too small to see at low zoom. The speed correlates with semantic urgency -- regeneration flows fastest (the user is actively waiting), summarizes flows slowest (archival relationship).

---

### 4. Floating Input Bar

The primary interaction surface. Must feel like a command palette: powerful, focused, ready.

#### Dimensions

| State | Width | Padding | Border Radius |
|-------|-------|---------|---------------|
| Unfocused | 420px | 10px 16px | 12px |
| Focused / has text | 560px | 12px 20px | 12px |

Position: bottom-center, 20px from bottom edge. Horizontally centered via `left: 50%; transform: translateX(-50%)`.

Width transition: `all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`. This is an extreme ease-out (the panel snaps to its new size and then eases into position). It feels responsive and physical rather than the mushy default ease-in-out.

#### Surface Treatment

Uses standard glass treatment with focus enhancement:

**Unfocused**: Standard glass.

**Focused**:
```css
border-top-color: rgba(221,0,0,0.25);
border-left-color: rgba(221,0,0,0.12);
border-right-color: rgba(221,0,0,0.12);
border-bottom-color: rgba(221,0,0,0.08);
box-shadow:
  0 0 0 2px rgba(221,0,0,0.06),
  0 0 16px -4px rgba(221,0,0,0.10),
  0 4px 16px -2px rgba(0,0,0,0.5),
  0 1px 3px 0 rgba(0,0,0,0.3);
```

The focus state replaces the warm-neutral directional borders with ACCENT-tinted directional borders. The top border gets the most red (0.25), sides get less (0.12), bottom gets least (0.08) -- maintaining the directional lighting model but with color. The outer `0 0 0 2px` ring at 6% opacity creates a soft, non-harsh focus indicator. This is how Raycast handles focus -- a colored glow rather than a hard outline.

#### Inner Layout

```
[model-icon 18x18] [BRANCH label?] [input field flex-1] [enter indicator]
gap: 12px
```

| Element | Style |
|---------|-------|
| Model icon | SVG 18x18, fill `factionColor`, opacity 0.8. Provides at-a-glance model identification. |
| BRANCH indicator | 10px/600, color C.branch, letter-spacing 0.5px. Only shows when branching from a node that already has children. |
| Input field | `type-body` unfocused (13px), `type-display` focused (14px). Color T.secondary. Transition: `font-size 0.2s`. |
| Placeholder | "Ask anything..." (default), "Branch from this point..." (branching), "Thinking..." (streaming). Color: T.subtle for default, T.dim for streaming. |
| Enter indicator | 11px Inconsolata. Shows `\u21b5` (return symbol) normally, `...` in ACCENT color when streaming. Transition: `color 0.2s`. |

---

### 5. Session Pill (Dynamic Island pattern)

Top-center. Three states: collapsed, peek, open.

#### Dimensions

| State | Width | Max Height | Border Radius | Transition |
|-------|-------|------------|---------------|------------|
| Collapsed | 160px | 32px | 10px | `all 0.3s cubic-bezier(0.16, 1, 0.3, 1)` |
| Peek | 280px | 80px | 10px | Same |
| Open | 340px | 400px | 14px | Same |

Position: `top: 12px, left: 50%, transform: translateX(-50%)`, z-index 80.

#### Collapsed State

```
[DC label] [phase dot 5x5] [session name] [node count]
padding: 7px 14px
```

| Element | Style |
|---------|-------|
| DC | 10px/700, letter-spacing 1.5px, color T.subtle. The product monogram. |
| Phase dot | 5px circle. Color: ACCENT (streaming), T.primary (waiting), T.dim (idle), T.ghost (stale). Transition: `background 0.3s`. |
| Session name | `type-label` (11px/500), color T.tertiary. Ellipsis overflow. |
| Node count | 9px, color T.dim. Right-aligned. |

#### Peek State (600ms hover delay)

Collapsed header + up to 3 sessions listed below.

Session items:
```
[phase dot 4x4] [session name]
padding: 3px 4px
font: 10px, color T.dim (inactive) / T.secondary (active)
```

#### Open State (click toggle)

Full session manager. Collapsed header + divider + New Session + session list.

**New Session button**:
```
[plus icon 12x12] "New Session"
padding: 8px 14px
font: 11px, color ACCENT
hover: background E[7] at 60%
```

**Session list items**:
```
[phase dot 5x5] [session name]
[date, padding-left: 11px]
font: 11px, color T.primary (active) / T.tertiary (inactive)
active background: E[7] at 60%
padding: 8px 14px
```

Delete button: 8x8 X icon, color T.dim, appears on right.

Double-click on session name to rename (inline input, transparent background, 11px, T.secondary).

---

### 6. Top Controls (Model Selector + Timeline Toggle)

Position: `top: 12px, right: 12px`. Flex row, gap 6px.

#### Timeline Toggle Button

```
glass treatment, border-radius 8px, padding 8px 12px
icon: 14x14 stroke icon, color T.ghost
cursor: pointer
```

#### Model Selector

**Trigger**:
```
glass treatment, border-radius 8px, padding 8px 16px
[model-icon 18x18 fill factionColor] [model name 13px T.tertiary] [chevron 8x5 T.ghost]
gap: 8px
```

**Dropdown**:
```
glass treatment, border-radius 8px, padding 4px
position: absolute, top: 100%, right: 0, margin-top: 4px
min-width: 200px, z-index: 100
```

**Dropdown items**:
```
[model-icon 16x16] [name 13px] [provider 10px T.dim, right-aligned]
padding: 10px 14px, border-radius: 6px, gap: 8px
hover: background E[7] at 60%
selected: T.primary text, E[7] at 60% background
```

---

### 7. Canvas Tools (Floating Toolbar)

Appears when a node is selected. Centered bottom, 80px above the input bar.

```
glass treatment, border-radius 10px, padding 4px
position: bottom 80px, left 50%, translateX(-50%)
```

**Tool buttons**:
```
[icon 16x16 stroke] [label 12px/500]
padding: 8px 14px, border-radius: 6px, gap: 8px
border: none, background: transparent
hover: background E[7] at 60%
```

Colors per tool: Branch = T.secondary, Clip = T.tertiary, Inspect = T.subtle.

---

### 8. Inspector Panel

Fixed right sidebar. Slides in/out.

| Property | Value |
|----------|-------|
| Position | fixed, right: 0, top: 36px, bottom: 32px |
| Width | 280px |
| Background | E[0] (#080706) |
| Border-left | 1px solid E[4] |
| z-index | 60 |
| Transform | `translateX(0)` open, `translateX(100%)` closed |
| Transition | `transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)` |

#### Header

```
padding: 8px 12px
border-bottom: 1px solid E[4]
```

| Element | Style |
|---------|-------|
| Section title | `type-micro` uppercase. "YOUR MESSAGE" (user, T.tertiary) or "AI RESPONSE" (ai, T.subtle) |
| Close button | 20x20 hit area, 11x11 X icon, color T.ghost, border-radius 3px |

#### Body

```
padding: 12px
font: type-body-small (12px/1.65 line-height)
color: T.secondary
overflow-y: auto
```

**Content section**:
```
Label: type-micro, margin-bottom: 6px
Body: pre-wrap, word-break: break-word
margin-bottom: 14px
```

**Details section**:
```
Label: type-micro
Values: 10px, color T.ghost, line-height 1.7
Emphasized values: T.tertiary
```

**Actions section**:
```
Label: type-micro
Button row: flex, gap 5px, wrap, margin-top 6px
```

#### Action Buttons

```
font: 10px/500
padding: 4px 9px
border-radius: 4px
border: 1px solid E[6]
background: E[4]
color: T.subtle
cursor: pointer
```

Branch button override: `border-color: C.branch at 50%, color: C.branch`.

Hover: `background: E[5]`, `border-color: E[7]`. Transition: `all 0.15s`.

---

### 9. Timeline View

Full-height right panel. Slides in/out.

| Property | Value |
|----------|-------|
| Position | fixed, right: 0, top: 0, bottom: 0 |
| Width | 400px |
| Background | E[0] |
| Border-left | 1px solid E[4] |
| z-index | 70 |
| Transition | `transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)` |

#### Header

```
padding: 10px 14px
border-bottom: 1px solid E[4]
```

"TIMELINE" label: `type-micro`, color T.ghost.
Message count: 9px, T.dim.
Close button: 10x10 X, T.ghost.

#### Message Items

```
padding: 8px 14px
cursor: pointer
border-left: 2px solid transparent (inactive) / 2px solid ACCENT (active)
background: transparent (inactive) / E[3] at 50% (active)
hover: E[2] background
transition: background 0.15s
```

**Message header row**:
```
[role dot 6x6] [role label 9px/600 T.ghost uppercase] [model icon 8x8?] [model name 8px T.dim] [timestamp 8px T.dim, right-aligned]
gap: 6px
margin-bottom: 4px
```

Role dot color: T.tertiary (user) / T.ghost (AI).

**Message body**: `type-label` (11px), line-height 1.6, color T.secondary, pre-wrap.

**Thinking steps** (collapsible `<details>`):
```
summary: 9px, color C.thinking (#909090), cursor pointer
steps: 9px, T.ghost, margin-bottom 3px
step label: C.thinking, font-weight 600
margin-top: 6px
```

**Inherited indicator**: 8px, T.dim, italic, margin-top 4px.

---

### 10. Context Menu

Right-click popup on nodes. Uses elevated glass treatment.

| Property | Value |
|----------|-------|
| Position | fixed at cursor (x, y) |
| Min-width | 180px |
| Border-radius | 12px |
| Padding | 4px |
| z-index | 200 |

#### Menu Items

```
padding: 8px 12px
border-radius: 6px
font: type-body-small (12px)
gap: 8px (icon to label)
cursor: pointer
hover: background E[6]
```

**Icon column**: 12x12, stroke 1.5px.

**Color logic**:
- Accent items (Branch, Show paths, Learn, Save memory): text and icon use their semantic color (C.branch, T.primary, C.learn, C.memory)
- Standard items (Regenerate, Inspect, Copy): text T.secondary, icon T.ghost

**Dividers**: 1px height, background E[5], margin `4px 8px`.

---

### 11. Clip Creator

Floating pill above multi-selected nodes.

| Property | Value |
|----------|-------|
| Position | fixed, bottom: 120px, centered |
| Border-radius | 12px |
| z-index | 80 |

#### Default State (not naming)

```
glass treatment
padding: 6px 14px
gap: 10px
```

```
[node count 11px T.tertiary] [Clip button] [Clear button]
```

**Clip button**:
```
padding: 4px 10px, border-radius: 6px
border: 1px solid C.memory at 40%
background: C.memory at 10%
color: C.memory
font: 10px/600
icon: 10x10 dashed rect
```

**Clear button**:
```
padding: 4px 8px, border-radius: 6px
border: 1px solid E[6]
background: E[4]
color: T.dim
font: 10px
```

#### Naming State

```
padding: 8px 14px
[node count] [name input 140px] [Save button]
```

Name input: background E[4], border 1px solid E[6], border-radius 6px, padding 4px 8px, font `type-label`.

Save button: same styling as Clip button.

---

### 12. Path Trace Bar

Floating navigation bar during path trace mode.

```
glass treatment, border-radius: 12px, padding: 8px 16px
position: fixed, bottom: 20px, centered
z-index: 90
gap: 12px
```

```
[step counter] [prev btn] [node label] [next btn] [divider] [exit btn]
```

| Element | Style |
|---------|-------|
| Step counter | 10px/700, color ACCENT. Format: "3 / 12" |
| Prev/Next buttons | 12x12 chevron, stroke 1.5px. Disabled: T.dim. Enabled: T.secondary. Padding: 4px. |
| Node label | 11px T.secondary, max-width 200px, ellipsis. Role prefix: 9px, T.tertiary (user) / T.ghost (AI), margin-right 4px. |
| Divider | 1px wide, 16px tall, background E[6] |
| Exit button | 10x10 X icon + "ESC" text 9px, color T.ghost, gap 4px |

---

### 13. Branch Preview Popover

Appears after 500ms hover on a branch-point node.

```
glass treatment, border-radius: 10px, padding: 6px
position: fixed, above cursor (transform translateX(-50%) translateY(-100%))
min-width: 240px, max-width: 320px
z-index: 100
```

**Header**: `type-micro` "N BRANCHES", padding 4px 8px 6px.

**Branch items**:
```
padding: 6px 8px, border-radius: 6px
hover: background E[7] at 60%
cursor: pointer, margin-bottom: 2px
```

Label: 11px T.secondary, ellipsis.
Meta row: 9px T.dim, gap 8px. "[count] nodes", "[time] ago", "stale" (if applicable, T.ghost).

---

### 14. Memory Shelf

Left sidebar panel with glass treatment.

#### Toggle Button

```
position: fixed, left: 12px, top: 56px, z-index: 55
glass treatment, border-radius: 8px, padding: 6px 10px
icon: 12x12 stroke, color C.thinking (if memories exist) / T.ghost (empty)
count: 10px/600, color: same as icon
gap: 6px
```

#### Panel

```
position: fixed, left: 0, top: 0, bottom: 0
width: 280px
glass treatment (border-right instead of all four sides)
border-right: 1px solid rgba(255,255,255,0.06)
z-index: 55
transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)
```

**Header**: padding 12px 14px, "MEMORIES" in `type-micro` color C.thinking, close button.

**Search input**: padding 6px 10px container, input: background E[4], border 1px solid E[6], border-radius 6px, padding 5px 8px, 10px font.

**Memory cards**:
```
padding: 8px 10px, border-radius: 6px, margin-bottom: 4px
background: rgba(255,255,255,0.02)
border: 1px solid E[6] at 40%
hover: border-color E[7]
```

Name: 11px/500 T.secondary.
Content preview: 10px T.subtle, line-height 1.5, max-height 45px, overflow hidden.
Meta row: 9px T.dim, gap 8px. Type badge, date, tags (C.thinking color).
Spawn button (for clips): 8px/600, C.memory, border 1px solid C.memory at 40%, background C.memory at 10%.

**Clip thumbnail**: 240x36 SVG, border-radius 4px, background E[3]. Nodes: 2px circles fill E[5]. Edges: 0.5px lines stroke E[7].

**Footer**: padding 8px 14px, 9px T.dim, centered. "[N] memories saved".

---

### 15. Learn Overlay

Full-screen modal for educational content.

**Backdrop**: `rgba(0,0,0,0.5)`. The 50% opacity lets the graph show through, maintaining spatial context.

**Panel**:
```
glass treatment, border-radius: 16px
width: 90%, max-width: 640px, max-height: 80vh
flex column
```

**Header**: padding 14px 18px, border-bottom 1px solid rgba(255,255,255,0.06).

"LEARN MODE": 10px/600, letter-spacing 1px, uppercase, color ACCENT.
Node preview: 11px T.subtle, truncated 60 chars.
Close: 14x14 X icon, T.ghost.

**Mode buttons** (initial state, 2x2 grid):
```
padding: 16px 18px container
gap: 8px, flex-wrap
each button: glass treatment, border-radius 8px, padding 10px 14px
flex: 1 1 calc(50% - 4px), min-width: 180px
icon: 14px/700 ACCENT
label: 12px T.secondary
hover: border-color rgba(221,0,0,0.3)
```

**Content area**: padding 14px 18px, overflow-y auto.

User messages: 10px/600, uppercase, letter-spacing 0.5px, color ACCENT.
Assistant messages: 12px, line-height 1.7, T.secondary, pre-wrap.

**Follow-up input**:
```
padding: 10px 18px, border-top 1px solid rgba(255,255,255,0.06)
input: flex 1, background rgba(255,255,255,0.04), border 1px solid rgba(255,255,255,0.08)
       border-radius 6px, padding 6px 10px, 11px T.secondary
Ask button: padding 6px 12px, border-radius 6px
            border 1px solid rgba(221,0,0,0.2), background rgba(221,0,0,0.05)
            color ACCENT, 10px/600
```

---

### 16. Keyboard Shortcuts Modal

**Backdrop**: `rgba(0,0,0,0.4)`.

**Panel**:
```
glass treatment, border-radius: 14px, padding: 20px 24px
max-width: 360px, width: 90%
```

**Header**: "KEYBOARD SHORTCUTS" `type-micro` T.ghost, close button, margin-bottom 16px.

**Category labels**: `type-nano` (8px/600), letter-spacing 1px, uppercase, T.dim, margin-bottom 6px.

**Shortcut rows**:
```
flex, justify-between, align-center, padding 3px 0
description: 10px T.subtle
kbd: 9px T.tertiary, background E[4], border 1px solid E[6], border-radius 4px, padding 2px 6px
```

Category spacing: margin-bottom 12px.

---

### 17. Status Bar

Fixed bottom bar. The quietest element in the UI.

| Property | Value |
|----------|-------|
| Position | fixed, bottom: 0, left: 0, right: 0 |
| Height | 24px |
| Background | E[0] |
| Border-top | 1px solid E[4] |
| z-index | 40 |
| Font | 9px Inconsolata, color T.dim |
| Padding | 0 12px |

**Left section**: model icon (9x9, faction color) + model name + pipe separator (E[6]) + phase dot (4x4) + phase label (colored per phase).

**Right section**: node count + pipe + edge count + pipe + token estimate.

Pipe separators: `|` character in E[6] color, serving as low-contrast dividers.

**WHY 24px height**: The status bar must be present (for information density) but invisible (not competing with content). 24px is the minimum height that allows 9px text with padding. VS Code's status bar is 22px, Linear's is 24px. Going smaller risks the text being unreadable; going larger wastes vertical space that belongs to the canvas.

---

### 18. Tool Cards (Expandable)

Inside Inspector and Timeline, showing tool call details.

**Collapsed**:
```
background: E[3]
border: 1px solid E[6]
border-radius: 6px
```

Header button (full width):
```
padding: 5px 8px, gap: 6px
[terminal icon 10x10, stroke, category-colored] [tool name 10px/600, category-colored] [duration 8px T.dim] [chevron 8x8 T.dim, rotates on expand]
```

Tool category colors (all from luminance hierarchy, no chromatic):
- file ops: T.tertiary
- search ops: T.subtle
- exec ops: T.secondary
- other: T.ghost

**Expanded** (below header):
```
padding: 4px 8px 8px
border-top: 1px solid E[5]
```

Section labels: `type-nano` uppercase, margin-bottom 2px.

Code blocks:
```
font: 9px, line-height 1.5, color T.subtle
background: E[2], border-radius: 4px, padding: 4px
max-height: 100px, overflow: auto
pre-wrap, word-break: break-word
```

Chevron transition: `transform 0.15s`.

---

## Transitions and Animations

### Timing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `ease-snap` | `cubic-bezier(0.16, 1, 0.3, 1)` | Primary ease. Extreme ease-out that feels snappy and physical. Used for panel slides, input expansion, pill state changes. |
| `ease-default` | `0.2s` duration | Standard transition time for color changes, opacity, border-color. |
| `ease-fast` | `0.15s` duration | Hover backgrounds, chevron rotations. |

### Spring Entrance (Nodes)

New nodes enter with a spring-overshoot animation:
```
scale: 0 -> 1.15 -> 1.0 over 0.7s
easing: custom spring (peaks at 115%, settles to 100%)
```

Accompanied by a subtle screen shake: 0.35s duration, 3px intensity, decaying via `1 - age`. The shake uses high-frequency sinusoidal offsets (`sin(t*47)`, `sin(t*73)`) to feel organic rather than mechanical.

### Ripple Effect

On node click/creation:
```
Ring 1: 0-120px radius over 0.8s, easeOutCubic, stroke 2.5px -> 0px
Ring 2: 0-192px radius over 1.2s, easeOutCubic, stroke 2.5px -> 0px, 6% opacity
```

Double ring creates a richer wave pattern than a single expanding circle.

### Drag Trail

While dragging a node:
```
Trail dots: last 20 positions
Each dot: 5px radius, fading to 0 over ~0.55s
Inner dot: 2.5px at 60% opacity (bright core)
Outer dot: 5px at 20% opacity (soft glow)
```

### Perpetual Animations

| Element | Frequency | Purpose |
|---------|-----------|---------|
| Edge dash scroll | `offset -= dt * 30` | Direction-of-flow indication |
| AI core pulse | `0.15 + 0.05 * sin(t*2)` | "Alive" signal, phase-offset per node |
| Streaming orbit | `dashoffset = selDash * 3` | Active processing indicator |
| Streaming halo | `r + 12 + 5*sin(t*4)` | Breathing during active streaming |
| Selection breath | `r + 12 + 3*sin(t*3)` | Gentle life signal on selected node |

---

## Hover and Focus States

### Global Hover Pattern

Interactive elements on hover:
```
background: E[7] at 60% (rgba(61,58,53,0.38))
transition: background 0.15s
```

This is the universal hover signal. The warm gray tint at 60% opacity is visible enough to confirm interactivity but subtle enough to not flash.

### Node Hover

| Node Type | Hover Effect |
|-----------|-------------|
| User | Stroke brightens to T.primary. Specular opacity rises 0.22 -> 0.35. Rim light opacity rises 0.25 -> 0.40. |
| AI | Outer stroke appears at T.secondary / 1.5px. Faction ring opacity rises 0.2 -> 0.3. Faction wash opacity rises 0.10 -> 0.16. |

These changes simulate the node "responding" to proximity -- surfaces catch more light, colors warm. No scale change, no bounce. Restraint.

### Focus Ring (Inputs)

Inputs use the ACCENT focus treatment described in the Floating Input section. When focused:
- Border colors shift from warm-neutral to ACCENT-tinted (maintaining directional model)
- Outer ring: `0 0 0 2px rgba(221,0,0,0.06)`
- No default browser outline (`outline: none`)

---

## Responsive Behavior

Dreamcatcher is a desktop-first canvas application. No mobile layout.

| Viewport | Behavior |
|----------|----------|
| > 1280px | Full layout. All panels at specified widths. |
| 1024-1280px | Timeline shrinks to 340px. Inspector shrinks to 240px. |
| < 1024px | Not supported. Show a centered message: "Dreamcatcher requires a desktop viewport." |

---

## Implementation Notes

### Performance

- All canvas nodes and edges are rendered as a single `innerHTML` assignment per frame, not individual React components. This is critical -- React reconciliation at 60fps across 100+ SVG elements would be catastrophic.
- Glass `backdrop-filter: blur()` is GPU-composited. The blur radius (20-24px) is within the performant range for modern GPUs. Do not exceed 32px.
- Node entrance springs and effects are tick-based (not CSS animations) because they need to compose with the imperative render loop.

### 4px Grid Enforcement

Every spacing value in this spec is divisible by 4. When implementing, if a value "looks wrong," adjust by +/- 2px but stay on the grid. Breaking the grid creates subpixel rendering issues on non-retina displays and makes vertical rhythm inconsistent.

### Color Application

Never mix hex and rgba for the same color within a component. The elevation stack is hex (E[0]-E[7]), the text hierarchy is hex (T.*), and opacity variants are always rgba. This prevents the common bug where `#3D3A35` and `rgba(61,58,53,1.0)` render slightly differently due to color space conversion.

### Z-Index Stack

```
Canvas grid:     0
Canvas SVG:     10
Status bar:     40
Floating UI:    50
Memory shelf:   55
Inspector:      60
Timeline:       70
Session pill:   80
Clip creator:   80
Path trace:     90
Branch preview: 100
Context menu:  200
Learn overlay: 200
Shortcuts:     300
```

Deliberately sparse numbering (gaps of 10-100) so that new layers can be inserted without renumbering the entire stack.
