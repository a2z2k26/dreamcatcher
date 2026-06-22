# Dreamcatcher Design System v2.0

The definitive design reference for Dreamcatcher -- a spatial conversation interface where AI conversations become navigable, branchable, persistent graphs rendered as nodes on a dark canvas. Every token, every value, every use case. If an engineer reads this, they build every visual surface without asking a single question.

---

## 1. Philosophy

### What This Is

Dreamcatcher is an observatory. The user peers into a warm, living system through precision glass instruments. The aesthetic is **futuristic mythic technology** -- discovered artifacts from an advanced civilization, not flat UI circles. Concentric ring systems, circuit-board precision, material elevation through luminance and glow.

### Design Principles

**Warm over cold.** Every surface carries amber/brown undertones. No blue, no purple, no green in the core palette. Coolness comes only from achromatic greys. The single exception is faction colors on AI nodes -- and even those skew warm (amber, green-yellow, orange).

**Luminance is hierarchy.** Importance = brightness. Text color is never chromatic. Surfaces separate through luminance alone. Color is earned, not casual -- reserved for meaning (faction identity, accent attention, rarity signals).

**Restraint is luxury.** One accent color (DD0000). Used with extreme restraint. If more than 3 elements on screen are red simultaneously, something is wrong. The warm-only palette is deliberate: temperature contrast makes the red accent pop because it is the only cool-shifted color in the system.

**Nodes are precious specimens.** Multi-layer material treatments simulate physical depth -- radial gradients, specular highlights, rim lights, core dots. Every node looks like a polished jewel under a microscope, not a colored circle on a canvas.

**Motion is purposeful.** Every animation communicates state, hierarchy, or intent. Nothing moves for decoration. Ambient animations (orbit rings, breathing auras) signal node significance. Transient animations (ripples, draw-on) confirm user actions.

### Reference Products

| Product | What We Take |
|---------|-------------|
| Linear | Text hierarchy: three luminance levels, no decorative color in body text, generous line-height |
| Raycast | Floating panel physicality: directional borders (top brighter than bottom), tight drop shadows |
| Warp | Input field proportions: monospace can feel luxurious with room to breathe |
| Vercel | Single-accent discipline: one color used with extreme restraint creates stronger recognition than a full palette |

---

## 2. Color Tokens

### 2.1 Elevation Stack (Base Layers)

Eight warm-black stops creating physical depth through luminance. Each step adds approximately 6-8 lightness points, weighted toward the dark end where the eye is most sensitive to change.

```
Token   Hex       Luminance  Usage
------  --------  ---------  ------------------------------------------
E[0]    #080706   ~2%        Void. Title bar, status bar, deepest layer.
E[1]    #0C0B09   ~3%        Canvas background. The ground plane.
E[2]    #13120F   ~5%        Recessed surfaces. Inactive tabs, code blocks.
E[3]    #1A1816   ~7%        Panel fills. Glass gradient dark stop.
E[4]    #1E1C19   ~9%        Input field backgrounds. Surface containers.
E[5]    #252320   ~11%       Subtle borders, grid dots, dividers.
E[6]    #2C2A26   ~14%       Visible borders, elevated surface edges.
E[7]    #3D3A35   ~19%       Hover states, highest elevation.
```

**TypeScript export:**
```typescript
export const E = {
  0: '#080706',
  1: '#0C0B09',
  2: '#13120F',
  3: '#1A1816',
  4: '#1E1C19',
  5: '#252320',
  6: '#2C2A26',
  7: '#3D3A35',
} as const;
```

**CSS custom properties:**
```css
:root {
  --e-0: #080706;
  --e-1: #0C0B09;
  --e-2: #13120F;
  --e-3: #1A1816;
  --e-4: #1E1C19;
  --e-5: #252320;
  --e-6: #2C2A26;
  --e-7: #3D3A35;
}
```

**Why warm blacks:** Cool-blue dark modes (#0A0A0F) feel clinical. Warm undertones (#0C0B09) create an organic, inhabited feeling -- polished walnut rather than brushed steel.

**Why eight stops:** Four stops create a "poster" feel -- flat layers. Eight stops with tight spacing build surfaces with continuous depth. The glass gradient (`E[3] -> E[2]`) spans only two stops, reading as subtle curvature rather than a color change.

### 2.2 Text Hierarchy

Pure achromatic. No tinted text. Importance = brightness.

```
Token        Hex       Luminance  Usage
-----------  --------  ---------  ------------------------------------------
T.primary    #E1E1E1   ~88%       Headings, active labels, selected items.
T.secondary  #C8C8C8   ~78%       Body text, input text.
T.tertiary   #A8A8A8   ~66%       Secondary labels, metadata values.
T.subtle     #808080   ~50%       Operators, low-importance items.
T.ghost      #606060   ~38%       Comments, section headers, inactive icons.
T.dim        #404040   ~25%       Barely visible hints, disabled text.
T.invisible  #2C2A26   ~14%       Border-level. Only visible against E[0]-E[1].
```

**TypeScript export:**
```typescript
export const T = {
  primary:   '#E1E1E1',
  secondary: '#C8C8C8',
  tertiary:  '#A8A8A8',
  subtle:    '#808080',
  ghost:     '#606060',
  dim:       '#404040',
  invisible: '#2C2A26',
} as const;
```

**CSS custom properties:**
```css
:root {
  --t-primary:   #E1E1E1;
  --t-secondary: #C8C8C8;
  --t-tertiary:  #A8A8A8;
  --t-subtle:    #808080;
  --t-ghost:     #606060;
  --t-dim:       #404040;
  --t-invisible: #2C2A26;
}
```

**Contrast ratios against E[1] (#0C0B09):**

| Token | Ratio | WCAG AA (4.5:1) | WCAG AA Large (3:1) |
|-------|-------|-----------------|---------------------|
| T.primary | 14.2:1 | Pass | Pass |
| T.secondary | 11.1:1 | Pass | Pass |
| T.tertiary | 7.6:1 | Pass | Pass |
| T.subtle | 4.4:1 | Fail (marginal) | Pass |
| T.ghost | 2.7:1 | Fail | Fail (marginal) |
| T.dim | 1.6:1 | Fail | Fail |

T.subtle and below are decorative/non-essential text only. All readable body text uses T.tertiary or brighter.

### 2.3 Accent Palette

#### Primary Accent -- Red (#DD0000)

```
Token       Hex/Value            Usage
----------  -------------------  ------------------------------------------
ACCENT      #DD0000              Selection, streaming, active states.
ACCENT_30   #DD000030 (19%)      Text selection background, soft focus rings.
ACCENT_50   #DD000050 (31%)      Stronger highlights.
ACCENT_18   #DD000018 (9%)       Very subtle hover backgrounds.
```

One color. Extreme restraint. Cool-shifted relative to the warm palette for maximum contrast -- #DD0000 pops because it is the only non-warm color in the system.

#### Warm Accent Range -- Yellow/Gold/Amber

Used exclusively for rarity system (Artifact tier) and memory save celebrations. NOT a general-purpose accent.

```
Token                Hex       Context
-------------------  --------  ------------------------------------------
WARM_AMBER           #D4A574   Artifact node material tint, memory flash.
WARM_AMBER_LIGHT     #FFF8F0   Artifact core dot center.
WARM_AMBER_MID       #D4C4B0   Artifact core dot edge.
```

#### Semantic Colors

```typescript
export const C = {
  active:   '#DD0000',   // cursor, focus, attention (= ACCENT)
  branch:   '#B0B0B0',   // branches -- warm white, NOT blue
  thinking: '#909090',   // reasoning -- medium gray
  fresh:    '#E8E8E8',   // new/unread -- brightest
  memory:   '#A0A0A0',   // memory/save -- warm gray
  learn:    '#D0D0D0',   // learn mode -- near-white
} as const;
```

**No blue, no purple, no green in the UI.** The palette is deliberately warm-only. Coolness comes only from achromatic greys.

### 2.4 State Colors

All interactive states use transparent overlays so they compose on any surface.

```typescript
export const interactive = {
  // Neutral states (non-accent components)
  hover:     'rgba(255,255,255,0.06)',   // 6% white overlay
  active:    'rgba(255,255,255,0.08)',   // 8% white overlay
  selected:  'rgba(255,255,255,0.10)',   // 10% white overlay
  disabled:  'rgba(0,0,0,0.15)',         // 15% black overlay (dims surface)

  // Accent states (primary/accent components)
  accentHover:  '#DD000018',   // 9% accent
  accentActive: '#DD000028',   // 16% accent

  // Opacity modifiers
  disabledOpacity: 0.38,
  hoverOpacity:    0.08,
  pressedOpacity:  0.12,
} as const;
```

**Hover pattern across all UI:** `background: rgba(61,58,53,0.38)` (E[7] at 60%), `transition: background 150ms ease-out`. This is the universal hover signal.

**Disabled pattern:** Reduce content opacity to 0.38. Add 15% black overlay on surface. No cursor interaction.

### 2.5 Faction Colors (Model Providers)

Each AI model provider has a registered warm color. Used exclusively inside AI node materials and model selector. Never used for UI chrome or body text.

```
Provider    Hex       Character
----------  --------  ------------------------------------------
Anthropic   #D4A574   Warm amber. Leather, whiskey, aged paper.
OpenAI      #52C41A   Vital green. Growth, operation, active.
Google      #FAAD14   Signal yellow. Attention, discovery.
Qwen        #FA8C16   Deep orange. Heat, forge, transformation.
```

**TypeScript export:**
```typescript
export const MODELS: readonly ModelInfo[] = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet', provider: 'Anthropic', color: '#D4A574' },
  { id: 'openai/gpt-4o',            name: 'GPT-4o',        provider: 'OpenAI',    color: '#52C41A' },
  { id: 'google/gemini-2.0-flash',  name: 'Gemini Flash',  provider: 'Google',    color: '#FAAD14' },
  { id: 'qwen/qwen3-30b-a3b',       name: 'Qwen3 30B',    provider: 'Qwen',      color: '#FA8C16' },
] as const;
```

**Where faction colors appear:**
- AI node inner chromatic wash (10% idle, 16% hover)
- AI node faction ring (0.2 opacity idle, 0.3 hover)
- AI node core indicator (oscillating 0.10-0.20)
- Streaming halo and orbit (faction color replaces ACCENT during stream)
- Model selector icon and dropdown
- Timeline role indicator for AI messages
- Inspector header accent for AI nodes

**Where faction colors NEVER appear:**
- Body text
- UI chrome (borders, backgrounds, shadows)
- User nodes
- Canvas background or grid

---

## 3. Elevation System

### 3.1 Level Definitions (L0-L7)

Each elevation level defines a complete material treatment: background, border, shadow, glow, and use case.

#### L0 -- Void
```
Background:   E[0] #080706
Border:       none
Shadow:       none
Glow:         none
Use cases:    Title bar, status bar, inspector background (docked panels)
```

#### L1 -- Ground Plane
```
Background:   E[1] #0C0B09
Border:       none
Shadow:       none
Glow:         none
Use cases:    Canvas background. The substrate everything sits on.
```

#### L2 -- Recessed
```
Background:   E[2] #13120F
Border:       1px solid E[4] (subtle separator)
Shadow:       none
Glow:         none
Use cases:    Inactive tabs, code blocks inside panels, inset areas.
```

#### L3 -- Panel Base
```
Background:   E[3] #1A1816
Border:       1px solid E[5]
Shadow:       0 1px 2px rgba(0,0,0,0.4)
Glow:         none
Use cases:    Glass gradient dark stop, active line background.
```

#### L4 -- Surface
```
Background:   E[4] #1E1C19
Border:       1px solid E[6]
Shadow:       0 2px 8px -1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)
Glow:         none
Use cases:    Input field backgrounds, surface-level containers, action buttons.
```

#### L5 -- Elevated
```
Background:   E[5] #252320
Border:       1px solid E[6]
Shadow:       0 2px 8px -1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)
Glow:         0 1px 0 0 rgba(61,58,53,0.15) inset (subtle inner top highlight)
Use cases:    Hover state backgrounds, subtle borders, grid dots.
```

#### L6 -- Floating (Glass Standard)
```
Background:   linear-gradient(180deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%)
Border:       Directional (see Glass Treatment below)
Shadow:       Full glass shadow stack (see 3.2)
Glow:         Inner top highlight + inner bottom shadow
Use cases:    Floating input, canvas tools, memory shelf toggle, session pill.
```

#### L7 -- Floating Elevated (Glass Elevated)
```
Background:   linear-gradient(180deg, rgba(30,28,25,0.94) 0%, rgba(22,20,18,0.91) 100%)
Border:       Directional, 10% more opaque than L6
Shadow:       Deeper glass shadow stack (see 3.2)
Glow:         Stronger inner highlights
Use cases:    Context menu, branch preview, model selector dropdown.
```

### 3.2 Shadow Tokens

```typescript
export const shadow = {
  // Drop shadows (external depth)
  sm: '0 1px 2px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.25)',
  md: '0 2px 8px -1px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
  lg: '0 4px 16px -2px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
  xl: '0 8px 32px -4px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.35)',

  // Inset shadows (glass thickness)
  insetHighlight: '0 1px 0 0 rgba(61,58,53,0.35) inset',
  insetShadow:    '0 -1px 0 0 rgba(0,0,0,0.15) inset',
  insetBoth:      '0 1px 0 0 rgba(61,58,53,0.35) inset, 0 -1px 0 0 rgba(0,0,0,0.15) inset',

  // Glow shadows (selection, focus, streaming)
  accentGlow:   '0 0 20px -4px rgba(221,0,0,0.19)',
  accentHalo:   '0 0 40px -8px rgba(221,0,0,0.13)',
  warmAmbient:  '0 0 60px -12px rgba(212,165,116,0.06)',

  // Composite stacks
  glass: [
    '0 1px 0 0 rgba(61,58,53,0.35) inset',
    '0 -1px 0 0 rgba(0,0,0,0.15) inset',
    '0 0 0 0.5px rgba(61,58,53,0.25)',
    '0 8px 24px -4px rgba(0,0,0,0.7)',
    '0 2px 8px -1px rgba(0,0,0,0.4)',
    '0 24px 48px -12px rgba(0,0,0,0.35)',
  ].join(', '),

  glassElevated: [
    '0 1px 0 0 rgba(61,58,53,0.2) inset',
    '0 -1px 0 0 rgba(0,0,0,0.25) inset',
    '0 8px 32px -4px rgba(0,0,0,0.6)',
    '0 2px 6px 0 rgba(0,0,0,0.35)',
    '0 0 0 1px rgba(0,0,0,0.15)',
  ].join(', '),
} as const;
```

### 3.3 Glow Tokens

Glow is reserved for high-significance states: selection, streaming, rarity auras.

```
Context               Color                    Radius   Opacity   Pulse
--------------------  -----------------------  -------  --------  -----------
Selection halo        ACCENT #DD0000           r+24     8%        none
Selection ring        ACCENT #DD0000           r+6      70%       none (solid)
Selection breath      ACCENT #DD0000           r+12     15%       3 Hz, +/-3px
Streaming halo        Faction color            r+12     25%       4 Hz, +/-5px
Streaming orbit       Faction color            r+5      varies    rotating dash
Epic aura             T.invisible #2C2A26      r*2.2    6-9%      1.5 Hz, +/-3px
Artifact aura         Full stack above         varies   varies    compound
Memory save flash     #D4A574 amber            r*1.5    8%->0     500ms fade
```

### 3.4 Border Tokens

Borders are separated from text tokens. Three tiers plus a focus ring.

```typescript
export const border = {
  subtle:    '#252320',      // E[5] -- dividers, faint separators
  default:   '#2C2A26',      // E[6] -- structural borders, input outlines
  strong:    '#3D3A35',      // E[7] -- emphasized, active outlines
  focus:     '#DD000050',    // ACCENT at 31% -- focus rings
  focusRing: '0 0 0 2px rgba(221,0,0,0.06), 0 0 12px -2px rgba(221,0,0,0.06)',
} as const;
```

**Glass panel directional borders (standard):**
```css
border-top:    1px solid rgba(61,58,53,0.8);   /* E[7] at 80% -- light catch */
border-left:   1px solid rgba(44,42,38,0.4);   /* E[6] at 40% */
border-right:  1px solid rgba(44,42,38,0.3);   /* E[6] at 30% */
border-bottom: 1px solid rgba(19,18,15,0.6);   /* E[2] at 60% -- shadow edge */
```

**Why four different border opacities:** A real glass object lit from above has a bright top edge (light catch), medium side edges, and a dark bottom edge (self-shadow). This directional lighting is the single biggest contributor to the "physical" feel.

**Glass panel directional borders (elevated):**
```css
border-top:    1px solid rgba(61,58,53,0.7);
border-left:   1px solid rgba(44,42,38,0.5);
border-right:  1px solid rgba(44,42,38,0.4);
border-bottom: 1px solid rgba(19,18,15,0.7);
```

---

## 4. Typography

### 4.1 Type Scale

Two typefaces. Inter (sans-serif) for reading and UI chrome. Inconsolata (monospace) for data and metadata.

**Font loading (layout.tsx):**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inconsolata:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

**Font family tokens:**
```typescript
export const FF = {
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'Inconsolata', monospace",
} as const;
```

**Type scale tokens (all sizes 4px-grid aligned: `size * line-height` lands on a 4px increment):**

| Token | Size | Weight | Line-Height | Letter-Spacing | Color | Face | Usage |
|-------|------|--------|-------------|----------------|-------|------|-------|
| `FS.display` | 20px | 600 | 28px (1.4) | 0 | T.primary | Inter | Empty state headings, session names expanded |
| `FS.title` | 16px | 600 | 24px (1.5) | 0 | T.primary | Inter | Panel headers, mode indicators |
| `FS.body` | 13px | 400 | 20px (1.54) | 0 | T.secondary | Inter | Body text, inputs, list items -- the default |
| `FS.label` | 11px | 500 | 16px (1.45) | 0 | T.tertiary | Inter | Session pill names, dropdown items |
| `FS.caption` | 10px | 400 | 16px (1.6) | 0 | T.subtle | Inconsolata | Timestamps, metadata, token counts |

**TypeScript export:**
```typescript
export const FS = {
  caption:  10,
  label:    11,
  body:     13,
  title:    16,
  display:  20,
} as const;
```

**Section headers** use a special treatment:
```
Font:            Inter
Size:            10px
Weight:          600
Letter-spacing:  0.08em
Transform:       uppercase
Color:           T.ghost
```
This creates structural hierarchy without taking visual space from content.

**Minimum text size:** 10px. No text anywhere in the application goes below 10px. The eleven instances of 8-9px text from the original implementation have been swept.

### 4.2 Type x Elevation Matrix

How text interacts with its background surface.

| Surface | Background | Primary Text | Secondary Text | Metadata | Section Headers |
|---------|-----------|-------------|----------------|----------|-----------------|
| E[0] (void) | #080706 | T.primary #E1E1E1 | T.secondary #C8C8C8 | T.ghost #606060 | T.ghost uppercase |
| E[1] (canvas) | #0C0B09 | T.primary | T.secondary | T.subtle #808080 | T.ghost uppercase |
| E[3-4] (panels) | #1A1816-#1E1C19 | T.primary | T.secondary | T.subtle | T.ghost uppercase |
| Glass (floating) | translucent | T.primary | T.secondary | T.subtle | T.ghost uppercase |
| Glass elevated | translucent | T.primary | T.secondary | T.subtle | T.ghost uppercase |

**Where Inter is used:**
- Panel headers ("Timeline", "Inspector", "Memories")
- Message content (Timeline, Inspector body)
- Floating input text and placeholder
- Learn overlay educational content
- Session pill session names
- Button labels
- Empty state text

**Where Inconsolata is used:**
- Node labels on canvas
- Timestamps everywhere
- Node IDs in Inspector
- Token counts in StatusBar
- Keyboard shortcut badges
- Model names in StatusBar and model selector
- Code/JSON content in ToolCard pre blocks
- Branch count badges

---

## 5. Node Materials

### 5.1 Base Node Anatomy

All nodes are SVG, rendered imperatively in the rAF loop (not React components). Materials are multi-layered.

**User node radius:** 24px
**AI node radius:** 28px (4px larger -- AI responses contain more content, creating visual hierarchy)
**Pin radius:** 6px

#### User Node Material Stack (5 layers)

| Layer | Element | Implementation | Purpose |
|-------|---------|---------------|---------|
| 1 | Drop shadow | `circle(cx:0, cy:2, r:24)` fill black, opacity 0.3 | 2px downward offset. Grounds node on surface. |
| 2 | Body fill | `radialGradient(cx:45%, cy:35%, r:65%)`: E[6] -> E[4] -> E[2] | Off-center hotspot simulates top-left lighting. Three stops create convex curvature. |
| 2 | Body stroke | T.secondary (#C8C8C8), 1.8px | Crisp edge. Selected: ACCENT 2.5px. Hovered: T.primary 1.8px. |
| 3 | Specular highlight | `radialGradient(cx:38%, cy:28%, r:40%)`: white@25% -> transparent | Tight hotspot. The "shine" that makes the node polished. Hover: opacity 0.22 -> 0.35. |
| 4 | Rim light | Arc stroke at (cx:1, cy:2, r:r+0.5), E[7], 1px, dasharray `r*1.8 r*4.5` | Bottom-right partial arc. ~30% circumference lit. |
| 5a | Core dot shadow | `circle(cx:0, cy:1, r:5.5)` fill black, opacity 0.15 | Grounds core dot on surface. |
| 5b | Core dot | `circle(cx:0, cy:0, r:5)` fill `radialGradient(white -> #C8C8C8 at 60%)` | The "pupil." Bright white center fading to warm gray. |

**SVG gradient definition for user node fill:**
```xml
<radialGradient id="node-user-fill" cx="45%" cy="35%" r="65%">
  <stop offset="0%"   stop-color="#2C2A26"/>  <!-- E[6] -->
  <stop offset="60%"  stop-color="#1E1C19"/>  <!-- E[4] -->
  <stop offset="100%" stop-color="#13120F"/>  <!-- E[2] -->
</radialGradient>
```

**SVG gradient definition for user node specular:**
```xml
<radialGradient id="node-user-specular" cx="38%" cy="28%" r="40%">
  <stop offset="0%"   stop-color="white" stop-opacity="0.25"/>
  <stop offset="100%" stop-color="white" stop-opacity="0"/>
</radialGradient>
```

#### AI Node Material Stack (7 layers)

| Layer | Element | Implementation | Purpose |
|-------|---------|---------------|---------|
| 1 | Outer bezel | `circle(r:28)` radialGradient(faction@8% -> E[3]@90% -> E[1]@95%), stroke E[5] 2px | Faction tint at center. Glass vessel appearance. |
| 1b | Inner bezel | `circle(r:25)` stroke E[5] 0.5px, opacity 0.3 | Double-ring bezel like a watch face. |
| 2 | Refraction ring | `circle(r:r*0.6)` stroke T.ghost 0.4px, dasharray `1.5 3`, opacity 0.4 | Dashed inner ring suggesting a lens element. |
| 3 | Faction ring | `circle(r:r*0.45)` stroke factionColor 0.5px, opacity 0.2 (hover: 0.3) | Clearest faction identifier below the icon. |
| 4 | Faction wash | `circle(r:r*0.7)` fill factionColor, opacity 0.10 (hover: 0.16) | Subtle chromatic fill. Reads as mood, not color. |
| 5 | Core indicator | `circle(r:r*0.2)` fill factionColor, opacity oscillating 0.10-0.20 at 2Hz | Pulsing core. Phase-offset per node ID -- field of breathing organisms. |
| 6 | Model icon | SVG path, translate(-7,-7) scale(0.58), fill factionColor, opacity 0.4-0.6 | Visible at LOD 2+. Definitive model identifier. |

**SVG gradient definition for AI outer bezel (example: Anthropic):**
```xml
<radialGradient id="node-ai-bezel-anthropic" cx="50%" cy="45%">
  <stop offset="0%"   stop-color="#D4A574" stop-opacity="0.08"/>
  <stop offset="90%"  stop-color="#1A1816" stop-opacity="1"/>
  <stop offset="95%"  stop-color="#0C0B09" stop-opacity="1"/>
</radialGradient>
```

#### User Branch-Point Nodes (Hexagons)

Same 5-layer material treatment but using a hexagonal path instead of a circle. `stroke-linejoin: round` softens vertices. The shape change alone signals "this node has multiple children."

### 5.2 Node Type Variants

| Node Type | Shape | Fill | Stroke | Special Treatment |
|-----------|-------|------|--------|-------------------|
| User message | Circle, 24r | Radial gradient (convex) | T.secondary 1.8px | 5-layer material stack |
| AI response | Circle, 28r | Glass vessel (faction tint) | E[5] 2px | 7-layer material stack |
| AI w/ thinking | Circle, 28r, double ring | Same as AI + inner ring | Same + inner bezel 0.5px | Visible inner ring signals reasoning |
| Branch point (user) | Hexagon, 24r | Same as user node | Same | Tick marks where branches exit |
| Clip (imported) | Rounded rectangle | E[3] fill, dashed | T.ghost 1px, dash `4 3` | Different shape = different origin |
| Summary | Diamond (rotated square) | E[4] fill | T.dim 1px | Meta-content, compressed branch |

### 5.3 Rarity Tiers

RPG-inspired visual treatment that encodes conversation topology. Each tier adds layers to the node material.

#### Tier Classification Function

```typescript
function getNodeRarity(
  node: GraphNode,
  edges: Edge[],
  depth: number
): 0 | 1 | 2 | 3 | 4 {
  // Tier 4: explicit user action (star, pin, memory-save)
  if (node.metadata?.starred || node.metadata?.memoryId) return 4;

  // Tier 3: deep context or summary nodes
  if (depth > 20 || node.role === 'summary' ||
      (node.text.length > 200 && depth > 10)) return 3;

  // Tier 2: significant branch points or clips
  const childCount = edges.filter(e => e.from === node.id).length;
  if (childCount >= 3 || node.role === 'clip' || depth > 8) return 2;

  // Tier 1: moderate depth or minor branch
  if (depth > 2 || childCount === 2) return 1;

  // Tier 0: surface-level
  return 0;
}
```

#### Tier 0 -- Common (depth 0-2, leaf nodes)

Current treatment. No additions.
```
Material:    Standard 5-layer (user) or 7-layer (AI)
Additional:  None
```

#### Tier 1 -- Uncommon (depth 3-8, or branch points with 2 children)

Add a single thin orbit ring -- a short dashed arc rotating slowly.

```xml
<circle cx="0" cy="0" r="${r + 6}" fill="none"
  stroke="${T.dim}" stroke-width="0.4"
  stroke-dasharray="3 ${r * 2.5}"
  stroke-dashoffset="${time * 8}"
  opacity="0.3"/>
```

```
Rotation speed:  8 units/sec (driven by timeRef)
Dash pattern:    Single short arc (~10% circumference)
Opacity:         0.3
Signal:          "This node has accumulated context"
```

#### Tier 2 -- Rare (depth 9-20, or 3+ children, or clips)

Add orbit ring (Tier 1) + 3-5 micro-dot particles at varying distances.

```xml
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

```
Rotation speeds:  12, -8, 15 deg/sec (varied, not uniform)
Particle sizes:   0.7-1.0px radius
Orbit radii:      r+8 to r+14 (staggered)
Signal:           "This node holds significance"
```

#### Tier 3 -- Epic (depth 21+, or summary nodes, or 50+ tokens dense)

Add all Tier 2 layers + breathing aura.

```xml
<!-- Ambient aura ring -->
<circle cx="0" cy="0" r="${r * 2.2 + 3 * Math.sin(time * 1.5)}"
  fill="none" stroke="${T.invisible}" stroke-width="8"
  opacity="${0.06 + 0.03 * Math.sin(time * 1.5)}"/>

<!-- Inner glow wash -->
<circle cx="0" cy="0" r="${r * 2.5}"
  fill="url(#node-aura-epic)"/>
```

```xml
<radialGradient id="node-aura-epic">
  <stop offset="0%"  stop-color="${T.ghost}" stop-opacity="0.04"/>
  <stop offset="100%" stop-color="${T.ghost}" stop-opacity="0"/>
</radialGradient>
```

```
Pulse rate:     1.5 Hz (slow, regal)
Amplitude:      opacity 0.06-0.09, radius +/-3px
Signal:         "This node carries weight"
```

#### Tier 4 -- Artifact (starred/pinned/memory-saved nodes)

Full treatment: orbit + particles + aura + shifted fill gradient with warm amber undertone.

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
Center:  #FFF8F0 (warm white, not pure white)
Edge:    #D4C4B0 (warm gray, not neutral gray)
```

**Additional on hover -- cinematic light leak:**
```xml
<radialGradient id="node-artifact-leak" cx="30%" cy="25%">
  <stop offset="0%"   stop-color="#D4A574" stop-opacity="0.06"/>
  <stop offset="100%" stop-color="#D4A574" stop-opacity="0"/>
</radialGradient>
<circle cx="0" cy="0" r="${r}" fill="url(#node-artifact-leak)"/>
```

```
Signal:  "This was deemed precious by the user"
```

**Label treatment by rarity:**
- Tier 0-1: Plain text below node. Inconsolata 10px, T.tertiary (user) / T.ghost (AI).
- Tier 2: Add pill background behind label. E[3] at 70%, E[5] stroke 0.5px, border-radius 4px.
- Tier 3-4: Pill + faint top-edge highlight line (T.dim, 0.3 opacity, 0.5px).

### 5.4 State Treatments

#### Rest State
Standard material stack per node type and rarity tier. No additional effects.

#### Hover State
| Node Type | Hover Change |
|-----------|-------------|
| User | Stroke brightens T.secondary -> T.primary. Specular opacity 0.22 -> 0.35. Rim light opacity 0.25 -> 0.40. |
| AI | Outer stroke appears T.secondary / 1.5px. Faction ring opacity 0.2 -> 0.3. Faction wash opacity 0.10 -> 0.16. |

No scale change. No bounce. Surfaces "catch more light" on approach.

#### Selected State (3-layer treatment)

| Layer | Element | Value |
|-------|---------|-------|
| 1 | Atmospheric halo | `circle(r: r+24)`, fill `radialGradient(ACCENT at 8% -> transparent)` |
| 2 | Crisp ring | `circle(r: r+6)`, stroke ACCENT 1.5px, opacity 0.7. SOLID, not dashed. |
| 3 | Breathing ring | `circle(r: r+12 + 3*sin(t*3))`, stroke ACCENT 0.6px, opacity 0.15 |

#### Active State (reply target)
A dedicated warm-white breathing ring (NOT red) on the node the user is replying to:
```
Ring:     r+8, stroke T.secondary, 0.6px
Pulse:    opacity oscillates 0.1-0.2 at 2Hz
Signal:   "This is where your next message connects"
```

#### Streaming State (AI nodes only)

| Element | Value |
|---------|-------|
| Dashed orbit | `circle(r:r+5)`, stroke factionColor, 1.5px, dasharray `5 5`, rotating |
| Breathing halo | `circle(r:r+12 + 5*sin(t*4))`, stroke factionColor 0.8px, opacity pulse*0.25 |
| Fill wash | `circle(r:r)`, fill factionColor, opacity pulse*0.05 |

4Hz frequency is deliberately faster than idle core pulse (2Hz) to signal active processing.

#### Dimmed State (dead-end / abandoned branches)
```
Opacity:   0.4 on all layers
Stroke:    T.dim (replaces T.secondary / T.subtle)
No rarity effects render when dimmed
```

#### Temporal Luminance
Nodes fade with age within a conversation. Most recent at full opacity, each predecessor at 0.97x, floor at 0.80. Creates depth-of-time as a visual recency signal.

---

## 6. Edge / Connection System

### 6.1 Edge Types

| Type | Stroke Color | Width | Dash Pattern | Animation Speed | Arrow |
|------|-------------|-------|-------------|-----------------|-------|
| `reply` | rgba(140,140,140,0.30) | 1.5px | solid/`6 4` | 0.8x | none |
| `branch` | rgba(176,176,176,0.30) | 1.5px | `12 6` | 0.8x | none |
| `regeneration` | rgba(221,0,0,0.20) | 1.2px | `2 6` | 2.0x | none |
| `summarizes` | T.invisible | 0.8px | `1 4` | 0.5x | none |
| `clips_to` | C.memory at 30% | 1.0px | `8 4` | 0.6x | none |
| `references` | T.ghost at 25% | 0.8px | `6 2 2 2` | 0.4x | none |

**TypeScript export:**
```typescript
const EDGE_RENDER: Record<EdgeType, EdgeStyle> = {
  reply:        { stroke: 'rgba(140,140,140,0.30)', dash: '6 4',     width: 1.5, speed: 0.8 },
  branch:       { stroke: 'rgba(176,176,176,0.30)', dash: '12 6',    width: 1.5, speed: 0.8 },
  regeneration: { stroke: 'rgba(221,0,0,0.20)',     dash: '2 6',     width: 1.2, speed: 2.0 },
  summarizes:   { stroke: T.invisible,              dash: '1 4',     width: 0.8, speed: 0.5 },
  clips_to:     { stroke: `${C.memory}30`,          dash: '8 4',     width: 1.0, speed: 0.6 },
  references:   { stroke: `${T.ghost}25`,           dash: '6 2 2 2', width: 1.0, speed: 0.4 },
};
```

### 6.2 Edge Materials

**Curve type:** All edges use cubic Bezier curves (`C` command) with control points at 35% distance. Creates gentle S-curves that feel organic.

**Reply edge glow underlayer:**
```
Same path as primary edge
Stroke:  rgba(140,140,140,0.10)
Width:   10px
Purpose: Soft spread behind primary thread line. Visually dominant without heavy.
```

**Depth-based taper:**
```typescript
const edgeWidth = Math.max(0.5, 1.5 - depth * 0.08);
```
Root edge is thickest. Each subsequent depth loses 0.08px. The conversation trunk is thick; branches thin out.

**AI-bound edge faction tint:**
When an edge leads TO an AI node, its stroke picks up 5% of the model color blended with base gray. Creates subtle rivers of warmth (Anthropic) vs coolness (OpenAI) through the graph.

### 6.3 Flow Animation

**Dash scroll (all dashed edges):**
```typescript
dashOffset -= dt * 30 * edgeStyle.speed;
```
Direction-of-flow indication. Speed correlates with semantic urgency: regeneration flows fastest (user actively waiting), summarizes flows slowest (archival).

**Energy pulse (reply edges only):**
A traveling bright dot moving from parent to child over 2 seconds on loop.

```typescript
function edgePulse(x0: number, y0: number, x1: number, y1: number, time: number) {
  const t = (time * 0.5) % 1;
  const px = x0 + (x1 - x0) * t;
  const py = y0 + (y1 - y0) * t;
  const opacity = Math.sin(t * Math.PI) * 0.15;
  return { px, py, opacity };
}
```
```xml
<circle cx="${px}" cy="${py}" r="2" fill="${T.ghost}" opacity="${opacity}"/>
<circle cx="${px}" cy="${py}" r="4" fill="${T.dim}" opacity="${opacity * 0.3}"/>
```
Outer circle = glow, inner = bright core. Subtle (0.15 peak opacity) but transforms static connections into visible energy flow.

**Edge draw-on animation (new edges):**
When a new edge is created, it traces from source to target over 400ms using stroke-dasharray/dashoffset animation.

```typescript
// Track new edges in effects system
interface EdgeEntrance {
  edgeId: string;
  age: number;         // 0 -> 1
  duration: number;    // 0.4 seconds
  pathLength: number;
}

// During render, for edges with active entrance:
const drawLength = pathLength * easeOutCubic(entrance.age);
// stroke-dasharray="${drawLength} ${pathLength}"
```

Sequence: node pops in (spring overshoot) -> edge draws toward it (smooth ease) -> settling. The heartbeat of the graph.

---

## 7. Canvas

### 7.1 Background Treatment

```
Background:     E[1] #0C0B09
Treatment:      Flat warm black. No noise. No vignette.
Rationale:      Restraint makes nodes precious -- they are the only
                dimensional objects on a flat, calm field.
```

Andrew's explicit decision: no canvas noise, no vignette overlay. The warm black and dot grid are the entire treatment.

### 7.2 Grid System

| Property | Value | Rationale |
|----------|-------|-----------|
| Dot color | E[5] #252320 | 3 elevation steps above background. Visible but not competing. |
| Dot spacing | 20px (world units) | Dense enough for spatial reference, sparse enough for no moire. |
| Dot radius | `max(0.6, 0.8 * scale)` | Scales with zoom, minimum size prevents disappearance. |
| Fade threshold | `gap < 6px` screen space | When dots would be < 6px apart, hide grid entirely. Prevents visual noise. |

**Grid rendering (Canvas 2D, not SVG):**
```typescript
// In the grid canvas layer
ctx.fillStyle = GRID_COLOR; // E[5]
for (let x = startX; x < endX; x += gap) {
  for (let y = startY; y < endY; y += gap) {
    const screenR = Math.max(0.6, 0.8 * scale);
    ctx.beginPath();
    ctx.arc(x, y, screenR, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

### 7.3 Atmosphere

**Ambient particle system (optional, Phase 3):**
15-25 extremely slow-moving particles on the canvas layer. Environmental, not connected to nodes. Dust motes in a beam of light.

```typescript
interface AmbientParticle {
  x: number;           // world coordinates
  y: number;
  vx: number;          // velocity: -0.3 to 0.3 px/sec
  vy: number;
  r: number;           // radius: 0.5 to 2.0px
  opacity: number;     // 0.02 to 0.06
  phase: number;       // for individual oscillation
}
```

```
Count:       20
Movement:    Brownian drift, 0.3 px/sec max velocity
Oscillation: Gentle opacity wave via sin(time * 0.8 + phase)
Fill:        T.dim (#404040)
Performance: 20 SVG circles with no filters. Negligible cost.
Purpose:     Confirms the surface is alive even when no interaction occurs.
```

---

## 8. Component Surfaces

### 8.1 Panels

#### Glass Treatment (Standard) -- used by floating panels

```typescript
export const glass = {
  background: 'linear-gradient(180deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderTop: '1px solid rgba(61,58,53,0.8)',
  borderLeft: '1px solid rgba(44,42,38,0.4)',
  borderRight: '1px solid rgba(44,42,38,0.3)',
  borderBottom: '1px solid rgba(19,18,15,0.6)',
  boxShadow: [
    '0 1px 0 0 rgba(61,58,53,0.35) inset',
    '0 -1px 0 0 rgba(0,0,0,0.15) inset',
    '0 0 0 0.5px rgba(61,58,53,0.25)',
    '0 8px 24px -4px rgba(0,0,0,0.7)',
    '0 2px 8px -1px rgba(0,0,0,0.4)',
    '0 24px 48px -12px rgba(0,0,0,0.35)',
  ].join(', '),
} as const;
```

**Why two inset shadows:** Inner top highlight + inner bottom shadow create glass thickness. Without them, panels read as flat cards with drop shadows. With them, panels read as slabs of frosted glass.

#### Glass Treatment (Elevated) -- context menus, dropdowns

```typescript
export const glassElevated = {
  background: 'linear-gradient(180deg, rgba(30,28,25,0.94) 0%, rgba(22,20,18,0.91) 100%)',
  backdropFilter: 'blur(24px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
  borderTop: '1px solid rgba(61,58,53,0.7)',
  borderLeft: '1px solid rgba(44,42,38,0.5)',
  borderRight: '1px solid rgba(44,42,38,0.4)',
  borderBottom: '1px solid rgba(19,18,15,0.7)',
  boxShadow: [
    '0 1px 0 0 rgba(61,58,53,0.2) inset',
    '0 -1px 0 0 rgba(0,0,0,0.25) inset',
    '0 8px 32px -4px rgba(0,0,0,0.6)',
    '0 2px 6px 0 rgba(0,0,0,0.35)',
    '0 0 0 1px rgba(0,0,0,0.15)',
  ].join(', '),
} as const;
```

2% more opaque, 4px more blur, deeper shadow, extra 1px outline for separation.

#### Solid Panel Treatment -- docked panels (Inspector, Timeline when using opaque mode)

```css
background: #080706;          /* E[0] */
border-left: 1px solid #1E1C19; /* E[4] */
```

No blur, no gradient, no shadow. Docked panels are frame, not floating objects.

#### Inspector Panel

| Property | Value |
|----------|-------|
| Position | fixed, right: 0, top: 36px, bottom: 32px |
| Width | 320px |
| Background | Glass treatment |
| Border-left | Directional glass border |
| z-index | 60 |
| Transition | `transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)` |

**Header:** Inter 11px semibold, padding 8px 12px, border-bottom 1px solid E[4]. Section title uppercase.
**Body:** Inter 13px, lineHeight 1.7, padding 12px, scroll-fade mask.
**Section labels:** Inter 10px semibold, uppercase, letter-spacing 0.06em, color T.ghost.
**Metadata:** Inconsolata 11px, key-value pairs with dot separators.
**Action buttons:** 44px min-height, R.sm radius, padding S[2]/S[3].
**Entry animation:** translateX(100%) + opacity(0) -> translateX(0) + opacity(1), 300ms, EASE.snap. Content items stagger 30ms.

#### Timeline Panel

| Property | Value |
|----------|-------|
| Position | fixed, right: 0, top: 0, bottom: 0 |
| Width | 440px |
| Background | Glass treatment |
| z-index | 70 |
| Transition | `transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)` |

**Message content:** Inter 13px, lineHeight 1.7.
**Role indicator:** 20px avatar circle. User: warm-white fill. AI: faction color fill + provider icon.
**Active message:** Left border 3px, ACCENT at 60%.
**Timestamps:** Inconsolata 10px, right-aligned.

#### Memory Shelf

| Property | Value |
|----------|-------|
| Position | fixed, left: 0, top: 0, bottom: 0 |
| Width | 320px |
| Background | Glass treatment (border-right instead of border-left) |
| z-index | 55 |

**Memory cards:** padding 8px 10px, border-radius R.sm, background rgba(255,255,255,0.02), border 1px solid E[6] at 40%. Hover: scale(1.01) + shadow intensification, 150ms.
**Spawn button:** 44px min-height, faction color of original model.
**Toggle button:** glass treatment, position fixed left: 12px top: 56px.

### 8.2 Floating Elements

#### Floating Input Bar

The primary interaction surface. Command palette feel.

| State | Width | Padding | Radius |
|-------|-------|---------|--------|
| Unfocused | 420px | 10px 16px | 12px (R.md) |
| Focused | 560px | 12px 20px | 12px (R.md) |

Position: bottom-center, 20px from bottom. `left: 50%; transform: translateX(-50%)`.
Width transition: `all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`.

**Unfocused surface:** Standard glass treatment.

**Focused surface:**
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

**Inner layout:**
```
[model-icon 18x18] [BRANCH label?] [input field flex-1] [enter indicator]
gap: 12px
```

| Element | Style |
|---------|-------|
| Model icon | SVG 18x18, fill factionColor, opacity 0.8 |
| BRANCH indicator | Inconsolata 10px/600, C.branch, letter-spacing 0.5px |
| Input text | Inter 13px unfocused, 14px focused, color T.secondary |
| Placeholder | "Ask anything..." (default), "Branch from this point..." (branching) |
| Enter indicator | Inconsolata 11px, return symbol, ACCENT color when streaming |

#### Session Pill (Dynamic Island)

Position: top-center, top: 12px, z-index 80.

| State | Width | Max Height | Radius | Transition |
|-------|-------|-----------|--------|------------|
| Collapsed | 160px | 32px | R.md (10px) | `all 0.3s EASE.snap` |
| Peek | 280px | 80px | R.md | Same |
| Open | 340px | 400px | R.lg (14px) | Same |

**Collapsed:** DC monogram (Inconsolata 10px/700, T.subtle) + phase dot 5x5 + session name (Inter 11px/500, T.tertiary) + node count (Inconsolata 9px, T.dim).

**Phase dot colors:**
- ACCENT: streaming
- T.primary: waiting
- T.dim: idle
- T.ghost: stale

#### Context Menu

Glass elevated treatment. Position: fixed at cursor. border-radius 12px, padding 4px, z-index 200.

**Menu items:** padding 8px 12px, border-radius R.sm, Inter 12px, gap 8px icon-to-label. Hover: background E[6].
**Hit targets:** 44px height minimum.
**Dividers:** 1px height, background E[5], margin 4px 8px.
**Entry animation:** scale(0.95) + opacity(0) -> scale(1) + opacity(1), 120ms, EASE.snap. Transform-origin at cursor. Items stagger 20ms each.

#### Canvas Tools (Floating Toolbar)

Glass treatment, border-radius R.md, padding 4px. Position: bottom 80px, centered. z-index 50.

**Tool buttons:** [icon 16x16 stroke] [label Inter 12px/500], padding 8px 14px, border-radius R.sm, gap 8px. Hover: background rgba(61,58,53,0.38).
**Entry:** scale(0.85) + opacity(0) -> scale(1) + opacity(1), 200ms, EASE.snap. Buttons stagger 40ms.
**Exit:** scale(1) + opacity(1) -> scale(0.9) + opacity(0), 150ms, EASE.smooth.

#### Branch Preview Popover

Glass treatment, border-radius R.md, padding 6px. Min-width 240px, max-width 320px. z-index 100. Appears after 500ms hover on branch-point node.

**Header:** Section header style ("N BRANCHES"), padding 4px 8px 6px.
**Branch items:** padding 6px 8px, radius R.sm. Label: Inter 11px T.secondary. Meta: Inconsolata 9px T.dim.

#### Path Trace Bar

Glass treatment, border-radius 12px, padding 8px 16px. Fixed bottom: 20px centered, z-index 90.

```
[step counter] [prev btn] [node label] [next btn] [divider] [exit btn]
gap: 12px
```

Step counter: Inconsolata 10px/700, ACCENT. Prev/Next: 12x12 chevron. Node label: Inter 11px T.secondary.

### 8.3 Controls

#### Buttons (Action)

Standard action buttons used in Inspector, Memory Shelf, and modals.

```
Font:        Inter 10px/500
Padding:     4px 9px (compact) | 8px 14px (standard)
Radius:      R.sm (6px)
Border:      1px solid E[6]
Background:  E[4]
Color:       T.subtle
Hit target:  44px minimum height
Hover:       background E[5], border-color E[7]
Transition:  all 150ms ease-out
```

**Branch button override:** `border-color: C.branch at 50%, color: C.branch, border-left: 3px solid C.branch at 30%`.
**Accent button override:** `border: 1px solid rgba(221,0,0,0.2), background: rgba(221,0,0,0.05), color: ACCENT`.

#### Toggles (Glass Pill)

Used for panel toggle buttons (Memory Shelf, Timeline).

```
Treatment:   Glass, border-radius R.lg (8px)
Padding:     6px 10px | 8px 12px
Icon:        12x12 stroke, color T.ghost (inactive) / C.thinking (has content)
Count badge: Inconsolata 10px/600, same color as icon
Gap:         6px
```

#### Dropdowns (Model Selector)

**Trigger:**
```
Treatment:   Glass, border-radius R.lg (8px)
Padding:     8px 16px
Content:     [model-icon 18x18] [name Inter 13px T.tertiary] [chevron 8x5 T.ghost]
Gap:         8px
```

**Dropdown panel:**
```
Treatment:   Glass, border-radius R.lg (8px)
Padding:     4px
Position:    absolute, top: 100%, right: 0, margin-top: 4px
Min-width:   200px
z-index:     Z.popover (100)
```

**Dropdown items:**
```
Content:     [icon 16x16] [name Inter 13px] [provider Inconsolata 10px T.dim right-aligned]
Padding:     10px 14px
Radius:      R.sm (6px)
Gap:         8px
Hover:       background rgba(61,58,53,0.38)
Selected:    T.primary text, E[7] at 60% background
```

#### Keyboard Shortcut Badge

```
Font:        Inconsolata 9px/700
Color:       T.tertiary
Background:  E[4]
Border:      1px solid E[6]
Radius:      4px
Padding:     2px 6px
```

---

## 9. Motion System

### 9.1 Timing Tokens

```typescript
export const DURATION = {
  instant:  100,   // hover state changes, tooltip appearance
  fast:     150,   // micro-interactions, button transitions
  normal:   250,   // panel slides, transforms
  slow:     400,   // overlay fades, major transitions
} as const;
```

**Timing taxonomy:**

| Category | Duration | Examples |
|----------|----------|---------|
| INSTANT (0-100ms) | 0-100ms | Hover stroke color, cursor style, tooltip |
| RESPONSIVE (100-200ms) | 100-200ms | Button state, panel slide, node scale on hover (150ms), context menu appear (120ms) |
| PURPOSEFUL (300-500ms) | 300-500ms | Node entrance (700ms with overshoot), edge draw-on (400ms), selection ring, content stagger (30ms/item) |
| AMBIENT (1000ms+) | continuous | Particle orbits, breathing auras (1.5Hz), streaming pulse (8Hz), edge energy pulses (2s loop) |

### 9.2 Spring Configurations

#### Easing Functions

```typescript
export const EASE = {
  snap:   'cubic-bezier(0.16, 1, 0.3, 1)',     // primary -- spring-loaded, fast start gentle settle
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // material standard
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // playful overshoot
} as const;
```

#### CSS Transition Helper

```typescript
export function transition(
  property: string,
  duration: keyof typeof DURATION = 'normal',
  ease: keyof typeof EASE = 'snap'
): string {
  return `${property} ${DURATION[duration]}ms ${EASE[ease]}`;
}

// Usage:
// transition('background', 'fast', 'smooth')
// -> "background 150ms cubic-bezier(0.4, 0, 0.2, 1)"
```

#### Spring Ease (Canvas Animations)

For node entrances and other tick-based animations in the rAF loop:

```typescript
export function springEase(t: number): number {
  if (t >= 1) return 1;
  if (t === 0) return 0;
  const c4 = (2 * Math.PI) / 2.8;
  return Math.pow(2, -8 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
```

Peaks at ~1.15 (15% overshoot) before settling to 1.0. Duration: 0.7 seconds.

### 9.3 Ambient Animations

All ambient animations are driven by `timeRef` in the rAF loop. All use sinusoidal oscillation.

| Element | Frequency | Amplitude | Phase | Purpose |
|---------|-----------|-----------|-------|---------|
| Tier 1 orbit ring | 8 units/sec | continuous rotation | -- | Context accumulation signal |
| Tier 2 particles | 12, -8, 15 deg/sec | continuous rotation | staggered 120deg | Significance signal |
| Tier 3 breathing aura | 1.5 Hz | opacity 0.06-0.09, radius +/-3px | -- | Weight/importance signal |
| AI core pulse | 2 Hz | opacity 0.10-0.20 | offset by node ID | Living quality. Out-of-sync. |
| Selection breathing ring | 3 Hz | radius +/-3px, opacity 0.15 | -- | Alive + selected |
| Streaming orbit | rotating dashoffset | continuous | -- | Active processing |
| Streaming halo | 4 Hz | radius +/-5px, opacity up to 0.25 | -- | Urgency (faster than idle) |
| Edge dash scroll | 30 * speed * dt | continuous offset | -- | Flow direction |
| Edge energy pulse | 0.5 Hz (2s loop) | position along path, opacity 0-0.15 | -- | Energy flow visualization |
| Ambient particles | 0.8 Hz opacity | 0.02-0.06 | per-particle phase | Canvas aliveness |

**Reduced motion:** All ambient animations wrapped in `@media (prefers-reduced-motion: no-preference)`. Users preferring reduced motion see instant state changes.

---

## 10. Iconography

All icons are inline SVG. Stroke-based at 1.5px weight for consistency.

**Standard sizes:**
- 8x8: Tiny indicators (chevrons in status bar)
- 10x10: Tool card icons, close buttons in compact contexts
- 12x12: Context menu icons, panel toggle icons
- 14x14: Top control icons (timeline toggle)
- 16x16: Canvas tool icons, dropdown item icons
- 18x18: Model icons in input bar and model selector

**Model provider icons:**
Each model has an SVG path stored in the model registry. Rendered at the standard sizes above, fill set to the faction color.

```typescript
// Example: Anthropic icon path
icon: 'M9 3L3 15h4l1.5-3h7L17 15h4L15 3H9zm3 2.5L14.5 11h-5L12 5.5z'
```

**Icon color rules:**
- Default state: T.ghost (#606060)
- Hover state: T.secondary (#C8C8C8)
- Active/selected: T.primary (#E1E1E1)
- Accent context: ACCENT (#DD0000)
- Semantic context: Use the semantic color (C.branch, C.memory, etc.)
- Model icons: faction color at specified opacity

**No icon library dependency.** All icons are custom SVG paths defined inline or in a local icon module.

---

## 11. Implementation Notes

### CSS Custom Properties

The full token system should be available as CSS custom properties for Tailwind and raw CSS consumption.

```css
:root {
  /* Elevation */
  --e-0: #080706;
  --e-1: #0C0B09;
  --e-2: #13120F;
  --e-3: #1A1816;
  --e-4: #1E1C19;
  --e-5: #252320;
  --e-6: #2C2A26;
  --e-7: #3D3A35;

  /* Text */
  --t-primary:   #E1E1E1;
  --t-secondary: #C8C8C8;
  --t-tertiary:  #A8A8A8;
  --t-subtle:    #808080;
  --t-ghost:     #606060;
  --t-dim:       #404040;
  --t-invisible: #2C2A26;

  /* Accent */
  --accent:    #DD0000;
  --accent-30: #DD000030;
  --accent-50: #DD000050;
  --accent-18: #DD000018;

  /* Semantic */
  --c-active:   var(--accent);
  --c-branch:   #B0B0B0;
  --c-thinking: #909090;
  --c-fresh:    #E8E8E8;
  --c-memory:   #A0A0A0;
  --c-learn:    #D0D0D0;

  /* Spacing */
  --sp-1:  4px;
  --sp-2:  8px;
  --sp-3:  12px;
  --sp-4:  16px;
  --sp-5:  20px;
  --sp-6:  24px;
  --sp-7:  32px;

  /* Radius */
  --r-sm:   6px;
  --r-md:   10px;
  --r-lg:   14px;
  --r-xl:   18px;
  --r-pill: 9999px;

  /* Type */
  --fs-caption: 10px;
  --fs-label:   11px;
  --fs-body:    13px;
  --fs-title:   16px;
  --fs-display: 20px;

  /* Fonts */
  --ff-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --ff-mono: 'Inconsolata', monospace;

  /* Background & foreground */
  --background: var(--e-1);
  --foreground: var(--t-primary);
}
```

### Tailwind Integration

All design tokens map to Tailwind utilities via the CSS custom properties above and Tailwind v4's `@theme` directive.

```css
@theme {
  --color-e-0: var(--e-0);
  --color-e-1: var(--e-1);
  /* ... */
  --color-t-primary: var(--t-primary);
  /* ... */
  --color-accent: var(--accent);
  /* ... */
  --spacing-1: var(--sp-1);
  --spacing-2: var(--sp-2);
  /* ... */
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  /* ... */
}
```

### TypeScript Theme Module (theme.ts)

The canonical source of truth. All tokens exported as typed constants.

```typescript
// Current exports (implemented):
export const E = { ... } as const;        // Elevation stack
export const T = { ... } as const;        // Text hierarchy
export const ACCENT = '#DD0000';           // Primary accent
export const ACCENT_30 = '#DD000030';
export const ACCENT_50 = '#DD000050';
export const ACCENT_18 = '#DD000018';
export const C = { ... } as const;        // Semantic colors
export const S = { ... } as const;        // Spacing scale
export const R = { ... } as const;        // Border radius
export const FS = { ... } as const;       // Font sizes
export const FF = { ... } as const;       // Font families
export const Z = { ... } as const;        // Z-index stack
export const DURATION = { ... } as const; // Timing tokens
export const EASE = { ... } as const;     // Easing tokens
export const O = { ... } as const;        // Opacity scale
export const glass = { ... } as const;    // Glass treatment
export const glassElevated = { ... };     // Elevated glass

// Helper exports:
export function transition(property, duration, ease): string;
export function lighten(hex, factor): string;
export function darken(hex, factor): string;
```

### Spacing Scale

```typescript
export const S = {
  1:  4,    // micro -- icon-to-label gap
  2:  8,    // compact -- button padding, small gaps
  3:  12,   // default -- input padding, list gaps
  4:  16,   // comfortable -- panel padding, section gaps
  5:  20,   // relaxed -- card padding
  6:  24,   // spacious -- panel headers
  7:  32,   // generous -- modal padding
} as const;
```

Every margin, padding, gap, and dimension is a multiple of 4px. No exceptions. Breaking the grid creates subpixel rendering issues on non-retina displays.

### Border Radius Scale

```typescript
export const R = {
  sm:   6,     // buttons, badges, inputs, menu items
  md:   10,    // dropdowns, toolbars, floating input, session pill collapsed
  lg:   14,    // floating panels, session pill open
  xl:   18,    // modals, overlays
  pill: 9999,  // status dots, pills
} as const;
```

Small interactive elements (buttons, inputs) use tight radii (6px) -- crisp and clickable. Larger floating panels use generous radii (14-18px) -- ambient glass surfaces.

### Opacity Scale

```typescript
export const O = {
  invisible: 0.04,
  ghost:     0.08,
  dim:       0.15,
  subtle:    0.3,
  medium:    0.5,
  solid:     0.7,
  visible:   0.85,
  full:      1.0,
} as const;
```

### Z-Index Stack

```typescript
export const Z = {
  canvas:       0,
  statusBar:   40,
  floatingUI:  50,
  memoryShelf: 55,
  inspector:   60,
  timeline:    70,
  pill:        80,
  pathTrace:   90,
  popover:    100,
  contextMenu: 200,
  overlay:     300,
} as const;
```

Deliberately sparse numbering (gaps of 10-100) for insertions without renumbering.

### LOD System

Four levels with 5% crossfade zones around each threshold to prevent jarring pop-in.

| LOD | Scale | What Renders |
|-----|-------|-------------|
| 0 | < 25% | Dots and lines only. Topology. |
| 1 | 25-50% | Shapes distinguishable. User/AI/clip/summary. |
| 2 | 50-75% | Truncated labels (14 chars), badges, streaming indicators. |
| 3 | > 75% | Full labels, model icons (14x14 at LOD2, 16x16 at LOD3), all metadata. |

```typescript
const LOD_THRESHOLDS = [0.25, 0.50, 0.75] as const;
const LOD_FADE_ZONE = 0.05;

function getLOD(scale: number): { level: number; fadeIn: number } {
  for (let i = LOD_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = LOD_THRESHOLDS[i];
    if (scale >= t + LOD_FADE_ZONE) return { level: i + 1, fadeIn: 1 };
    if (scale >= t - LOD_FADE_ZONE) {
      const progress = (scale - (t - LOD_FADE_ZONE)) / (2 * LOD_FADE_ZONE);
      return { level: i + 1, fadeIn: progress };
    }
  }
  return { level: 0, fadeIn: 1 };
}
```

### Performance Rules

1. All canvas nodes and edges render via a single `innerHTML` assignment per frame. Not individual React components. React reconciliation at 60fps across 100+ SVG elements would be catastrophic.
2. Glass `backdrop-filter: blur()` is GPU-composited. Keep radius at 12-24px. Do not exceed 32px.
3. Node entrance springs and effects are tick-based (not CSS animations) because they compose with the imperative render loop.
4. Rarity tier effects: no new per-frame allocations. All visuals are static SVG with timeRef-driven transforms.
5. Ambient particles: 20 SVG circles with no filters, updated per frame. Negligible cost.

### Color Application Rules

1. Never mix hex and rgba for the same color within a component. Elevation stack = hex. Text hierarchy = hex. Opacity variants = rgba.
2. Never concatenate hex + alpha strings (e.g., `${E[7]}80`). Use rgba() or the O scale with opacity property.
3. All faction colors are applied via SVG fill/stroke with explicit opacity attributes, never via hex-alpha.

### Responsive Behavior

Desktop-first canvas application. No mobile layout.

| Viewport | Behavior |
|----------|----------|
| > 1280px | Full layout. All panels at specified widths. |
| 1024-1280px | Timeline 340px. Inspector 280px. |
| < 1024px | Not supported. Centered message: "Dreamcatcher requires a desktop viewport." |

### Hit Target Minimum

All interactive elements: 44x44px minimum touch/click target. Currently violated by and requiring fixes in: CanvasTools buttons, model dropdown items, SessionPill delete button, MemoryShelf spawn button, PathTrace navigation arrows.

### Scroll Fade Masks

Applied to all scrollable containers via CSS mask-image:

```css
.scroll-fade {
  mask-image: linear-gradient(
    to bottom,
    transparent 0px,
    black 16px,
    black calc(100% - 16px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0px,
    black 16px,
    black calc(100% - 16px),
    transparent 100%
  );
}
```

Applied to: Inspector body, Timeline message list, Memory Shelf list, LearnOverlay content, SessionPill session list.

---

## Appendix A: Complete Token Quick Reference

### Colors at a Glance

```
ELEVATION       E[0]=#080706  E[1]=#0C0B09  E[2]=#13120F  E[3]=#1A1816
                E[4]=#1E1C19  E[5]=#252320  E[6]=#2C2A26  E[7]=#3D3A35

TEXT            T.primary=#E1E1E1  T.secondary=#C8C8C8  T.tertiary=#A8A8A8
                T.subtle=#808080   T.ghost=#606060       T.dim=#404040
                T.invisible=#2C2A26

ACCENT          #DD0000 (30%=#DD000030, 50%=#DD000050, 18%=#DD000018)

SEMANTIC        active=#DD0000  branch=#B0B0B0  thinking=#909090
                fresh=#E8E8E8   memory=#A0A0A0  learn=#D0D0D0

FACTIONS        Anthropic=#D4A574  OpenAI=#52C41A  Google=#FAAD14  Qwen=#FA8C16
```

### Spacing at a Glance

```
S[1]=4  S[2]=8  S[3]=12  S[4]=16  S[5]=20  S[6]=24  S[7]=32
```

### Radius at a Glance

```
R.sm=6  R.md=10  R.lg=14  R.xl=18  R.pill=9999
```

### Type at a Glance

```
FS.caption=10  FS.label=11  FS.body=13  FS.title=16  FS.display=20
FF.sans='Inter'  FF.mono='Inconsolata'
```

### Timing at a Glance

```
DURATION:  instant=100ms  fast=150ms  normal=250ms  slow=400ms
EASE:      snap=cubic-bezier(0.16,1,0.3,1)  smooth=cubic-bezier(0.4,0,0.2,1)  bounce=cubic-bezier(0.34,1.56,0.64,1)
```

### Z-Index at a Glance

```
canvas=0  statusBar=40  floatingUI=50  memoryShelf=55  inspector=60
timeline=70  pill=80  pathTrace=90  popover=100  contextMenu=200  overlay=300
```

---

## Appendix B: Node Rendering Reference (SVG)

Complete SVG output for a Tier 0 user node at rest, for reference:

```xml
<!-- Layer 1: Drop shadow -->
<circle cx="${x}" cy="${y + 2}" r="24" fill="black" opacity="0.3"/>

<!-- Layer 2: Body -->
<circle cx="${x}" cy="${y}" r="24"
  fill="url(#node-user-fill)"
  stroke="#C8C8C8" stroke-width="1.8"/>

<!-- Layer 3: Specular highlight -->
<circle cx="${x}" cy="${y}" r="24"
  fill="url(#node-user-specular)" opacity="0.22"/>

<!-- Layer 4: Rim light -->
<circle cx="${x + 1}" cy="${y + 2}" r="24.5"
  fill="none" stroke="#3D3A35" stroke-width="1"
  stroke-dasharray="43.2 108" opacity="0.25"/>

<!-- Layer 5: Core dot shadow -->
<circle cx="${x}" cy="${y + 1}" r="5.5" fill="black" opacity="0.15"/>

<!-- Layer 5: Core dot -->
<circle cx="${x}" cy="${y}" r="5"
  fill="url(#node-core-dot)"/>
```

**SVG defs block (defined once):**
```xml
<defs>
  <radialGradient id="node-user-fill" cx="45%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#2C2A26"/>
    <stop offset="60%" stop-color="#1E1C19"/>
    <stop offset="100%" stop-color="#13120F"/>
  </radialGradient>

  <radialGradient id="node-user-specular" cx="38%" cy="28%" r="40%">
    <stop offset="0%" stop-color="white" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="white" stop-opacity="0"/>
  </radialGradient>

  <radialGradient id="node-core-dot" cx="40%" cy="35%">
    <stop offset="0%" stop-color="white"/>
    <stop offset="60%" stop-color="#C8C8C8"/>
  </radialGradient>
</defs>
```

---

## Appendix C: Glass Treatment Reference (CSS)

Complete CSS for a glass floating panel:

```css
.glass-panel {
  background: linear-gradient(180deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(61,58,53,0.8);
  border-left: 1px solid rgba(44,42,38,0.4);
  border-right: 1px solid rgba(44,42,38,0.3);
  border-bottom: 1px solid rgba(19,18,15,0.6);
  box-shadow:
    0 1px 0 0 rgba(61,58,53,0.35) inset,
    0 -1px 0 0 rgba(0,0,0,0.15) inset,
    0 0 0 0.5px rgba(61,58,53,0.25),
    0 8px 24px -4px rgba(0,0,0,0.7),
    0 2px 8px -1px rgba(0,0,0,0.4),
    0 24px 48px -12px rgba(0,0,0,0.35);
}

.glass-panel-elevated {
  background: linear-gradient(180deg, rgba(30,28,25,0.94) 0%, rgba(22,20,18,0.91) 100%);
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border-top: 1px solid rgba(61,58,53,0.7);
  border-left: 1px solid rgba(44,42,38,0.5);
  border-right: 1px solid rgba(44,42,38,0.4);
  border-bottom: 1px solid rgba(19,18,15,0.7);
  box-shadow:
    0 1px 0 0 rgba(61,58,53,0.2) inset,
    0 -1px 0 0 rgba(0,0,0,0.25) inset,
    0 8px 32px -4px rgba(0,0,0,0.6),
    0 2px 6px 0 rgba(0,0,0,0.35),
    0 0 0 1px rgba(0,0,0,0.15);
}
```

---

## Appendix D: Effect System Reference (TypeScript)

Key effect functions from `effects.ts`:

```typescript
// Ripple on node interaction
addRipple(fx, x, y, color?: string, maxRadius?: number)
// Default: warm-white rgba(225,225,225,0.15), 120px
// Second ring auto-added: 1.6x radius, 0.06 opacity, 1.2s

// Node entrance (spring animation)
addEntrance(fx, nodeId)
// Duration: 0.7s, spring overshoot to 115%
// Accompanied by screen shake: 0.35s, 3px intensity

// Streaming state
setStreaming(fx, nodeId, streaming: boolean)
// Activates pulsing orbit + breathing halo in faction color

// Drag trail
addDragTrail(fx, x, y)
// Last 20 positions, dual-dot rendering (core + glow), 0.55s fadeout

// Per-frame tick
tickEffects(fx, dt)
// Advances all effect ages, cleans up expired effects

// Entrance scale query
getEntranceScale(fx, nodeId): number
// Returns 0->1.15->1.0 via springEase over 0.7s

// Streaming pulse query
getStreamingPulse(fx, nodeId, time): number | null
// Returns 0.3-1.0 oscillating at 8Hz

// Screen shake query
getShakeOffset(fx, time): { x, y }
// High-frequency sinusoidal, decaying from intensity to 0
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-03-24 | Initial spec. Unit-inspired monochrome. |
| v1.5 | 2026-03-25 | Bumba-Dark palette. Glass treatment. Material nodes. Token system (Phase 1). |
| v2.0 | 2026-03-25 | Full design system formalization. Rarity system. Faction refinement. Complete component specs. Motion tokens. This document. |
