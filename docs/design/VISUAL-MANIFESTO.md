# Dreamcatcher Visual Manifesto
## From polished prototype to collectible artifact

The previous audit brought the nodes from flat circles to dimensional objects. The glass went from CSS tutorial to multi-layer treatment. The canvas gained atmosphere. Good. But "good" is where most products stop and never become memorable.

What follows is the next elevation: taking every visual surface and treating it with the obsession of a game studio building rare item cards, the precision of a Swiss watchmaker finishing a movement nobody will ever see, and the atmosphere of a Ridley Scott establishing shot. The goal is not "looks nice." The goal is that when someone sees Dreamcatcher for the first time, they pause. They lean in. They feel like they discovered something that was built by people who care more than they should.

---

## I. NODE RARITY SYSTEM — Specimens, Not Circles

The current nodes have radial gradients, specular highlights, rim lights. They are physical. But they are all the same physical. Every user node looks identical to every other user node. Every AI node is the same glass vessel. This is a missed opportunity.

Conversations have structure. Some nodes are first messages. Some are deep in a 40-message thread. Some are branch points that spawned three competing explorations. Some are dead ends that went nowhere. Some contain moments of breakthrough. The visual system should encode this.

### Rarity Tiers

Borrow the RPG loot taxonomy — not the names (no "Legendary" labels cluttering the UI), but the visual language. Each tier adds a layer to the node material.

**Tier 0 — Common (depth 0-2, leaf nodes)**

The current treatment. Radial gradient fill, specular highlight, rim light, core dot. No additional layers. These are the workhorse nodes: opening messages, simple replies, orphans.

```
Material: existing node-user-fill gradient
Stroke: T.secondary (#C8C8C8), 1.5px
Core dot: white gradient, 3.5r
No additional effects
```

**Tier 1 — Uncommon (depth 3-8, or branch points with 2 children)**

Add a subtle animated ring. Not a full aura — a single thin orbit line that rotates slowly around the node. Think satellite orbit, not glow. This signals "this node has accumulated context."

```
Additional layer — Orbit ring:
  <circle cx="0" cy="0" r="${r + 6}" fill="none"
    stroke="${T.dim}" stroke-width="0.4"
    stroke-dasharray="3 ${r * 2.5}"
    stroke-dashoffset="${time * 8}"
    opacity="0.3"/>

Animation: stroke-dashoffset driven by timeRef at 8 units/sec
The dash pattern creates a single short arc that orbits continuously
```

**Tier 2 — Rare (depth 9-20, or branch points with 3+ children, or clips)**

Add a faint particle field — 3-5 micro-dots orbiting at varying distances. These are SVG circles on a rotating group. The effect is minimal at rest but unmistakable: this node is alive, it holds significance.

```
Additional layers — Particle orbit:
  <g transform="rotate(${time * 12})">
    <circle cx="${r + 10}" cy="0" r="1" fill="${T.ghost}" opacity="0.25"/>
  </g>
  <g transform="rotate(${time * -8 + 120})">
    <circle cx="${r + 14}" cy="0" r="0.7" fill="${T.dim}" opacity="0.2"/>
  </g>
  <g transform="rotate(${time * 15 + 240})">
    <circle cx="${r + 8}" cy="0" r="0.8" fill="${T.ghost}" opacity="0.15"/>
  </g>

Rotation speeds: 12, -8, 15 deg/sec (varied, not uniform)
Particle sizes: 0.7-1.0 px radius (micro, not distracting)
Orbit radii: r+8 to r+14 (staggered distances)
```

**Tier 3 — Epic (depth 21+, or summary nodes, or nodes with 50+ tokens of dense content)**

Add a breathing aura — a soft radial glow that slowly pulses in luminance. This is not the selection glow (that is red). This is an ambient warm-white halo that says "this node carries weight."

```
Additional layer — Ambient aura:
  <circle cx="0" cy="0" r="${r * 2.2 + 3 * Math.sin(time * 1.5)}"
    fill="none" stroke="${T.invisible}" stroke-width="8"
    opacity="${0.06 + 0.03 * Math.sin(time * 1.5)}"/>

  // Inner glow wash
  <radialGradient id="node-aura-epic">
    <stop offset="0%" stop-color="${T.ghost}" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="${T.ghost}" stop-opacity="0"/>
  </radialGradient>
  <circle cx="0" cy="0" r="${r * 2.5}" fill="url(#node-aura-epic)"/>

Pulse rate: 1.5 Hz (slow, regal, not anxious)
Amplitude: opacity 0.06 to 0.09, radius +/- 3px
```

**Tier 4 — Artifact (nodes explicitly starred/pinned by user, or memory-saved nodes)**

The full treatment. Orbit ring + particle field + aura + a unique material: the fill gradient shifts from the warm-black palette to include a barely-perceptible warm amber undertone. Not orange. Not gold. The faintest suggestion of heat.

```
Override node-user-fill gradient for Artifact tier:
  <radialGradient id="node-artifact-fill" cx="45%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#33302A"/>      // E[6] + amber shift
    <stop offset="60%" stop-color="#221F1A"/>      // E[4] + amber shift
    <stop offset="100%" stop-color="#161411"/>      // E[2] + amber shift
  </radialGradient>

Core dot override:
  Center: #FFF8F0 (warm white, not pure white)
  Edge: #D4C4B0 (warm gray, not neutral gray)

Additional — Cinematic light leak (on hover only):
  <radialGradient id="node-artifact-leak" cx="30%" cy="25%">
    <stop offset="0%" stop-color="#D4A574" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#D4A574" stop-opacity="0"/>
  </radialGradient>
  <circle cx="0" cy="0" r="${r}" fill="url(#node-artifact-leak)"/>
```

### Rarity Calculation

```typescript
function getNodeRarity(node: GraphNode, edges: Edge[], depth: number): 0 | 1 | 2 | 3 | 4 {
  // Tier 4: explicit user action (star, pin, memory-save)
  if (node.metadata.starred || node.metadata.memoryId) return 4;

  // Tier 3: deep context or summary nodes
  if (depth > 20 || node.role === 'summary' || (node.text.length > 200 && depth > 10)) return 3;

  // Tier 2: significant branch points or clips
  const childCount = edges.filter(e => e.from === node.id).length;
  if (childCount >= 3 || node.role === 'clip' || depth > 8) return 2;

  // Tier 1: moderate depth or minor branch
  if (depth > 2 || childCount === 2) return 1;

  // Tier 0: surface-level
  return 0;
}
```

### Why This Works

RPG rarity systems work because they create a Pavlovian response: the player learns to associate visual richness with value. Over time, just glimpsing a Tier 3 node at the edge of the canvas creates anticipation. The user starts to *feel* the topology of their conversation through visual density alone. Deep threads shimmer. Branch points orbit. Starred nodes glow warm. The canvas becomes a heat map of significance without a single explicit data visualization.

---

## II. COLOR DEPTH — The Chromatic Layer Beneath Luminance

The current palette is correct: warm blacks (E[0]-E[7]), luminance hierarchy (T), single red accent. This is the right foundation. But "luminance only" does not mean "no color." It means color is earned, not casual.

### Model Provider Auras — Chromatic DNA

Each AI model provider has a registered color in models.ts. Currently these appear as a faint 4% opacity wash inside the AI node. This is too subtle to register. But making it louder would violate the luminance-first principle.

The solution: chromatic color appears in the *liminal spaces* — the edges, the auras, the transitions — never on the primary surfaces.

**AI Node Edge Glow (on hover)**:
```
When an AI node is hovered, the outer edge emits a 1px glow in the model's color at 15% opacity.
This replaces the current stroke brightening.

<circle cx="0" cy="0" r="${r + 1}" fill="none"
  stroke="${modelColor}" stroke-width="2"
  opacity="0.15"
  filter="url(#model-glow)"/>

<filter id="model-glow">
  <feGaussianBlur stdDeviation="2" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

**Edge Tint for AI Responses**:
```
When an edge leads TO an AI node, its stroke picks up 5% of the model color:
  Reply edge to Claude node: rgba(212, 165, 116, 0.05) blended with base gray
  Reply edge to GPT node: rgba(16, 163, 127, 0.05) blended with base gray

This is almost invisible in isolation but when you have a mixed-model conversation,
the edge colors create a subtle river of warmth (Anthropic) vs coolness (OpenAI)
flowing through the graph. You feel it before you see it.
```

**Streaming Signature**:
```
When an AI node is streaming, the pulsing ring uses the model's color instead of ACCENT red.
Only during streaming — after completion, the node returns to neutral.

Streaming Claude: warm amber pulse (#D4A574 at 40% opacity, cycling)
Streaming GPT: teal pulse (#10A37F at 40%)
Streaming Gemini: blue pulse (#4285F4 at 40%)

This creates immediate provider recognition during the active wait.
After streaming completes, the pulse fades over 800ms and the red accent
reclaims its exclusivity.
```

### Depth-Based Canvas Tinting

As the user zooms in past LOD 3 (scale > 0.75), the canvas background shifts imperceptibly warmer. The vignette's center becomes fractionally less black:

```
At scale 1.0:  canvas center rgba(14, 13, 11, 1)    // 2 units warmer than E[1]
At scale 2.0+: canvas center rgba(16, 14, 11, 1)    // 4 units warmer

The shift is 2-4 values in the red channel over a 4x zoom range.
Nobody will consciously notice. Everyone will feel "closer."
```

This leverages the proven cinematic technique of warming color temperature as the camera pushes in — it creates psychological intimacy.

---

## III. GLASS EVOLUTION — From Frosted to Living

The current glass treatments are solid. The directional borders, the inner highlights, the shadow stacks — all correct. But glass in Dreamcatcher should not be static. It should feel like a material that responds to the environment.

### Animated Grain

The dual-noise SVG filters on the canvas are static. Glass panels should have their own noise layer — finer grain, animated.

```
// In each glass panel, add a noise overlay div:
<div style={{
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  overflow: 'hidden',
  pointerEvents: 'none',
  mixBlendMode: 'overlay',
  opacity: 0.03,
}}>
  <svg width="100%" height="100%">
    <filter id="panel-grain">
      <feTurbulence type="fractalNoise"
        baseFrequency="2.0"
        numOctaves="3"
        seed={Math.floor(Date.now() / 100)}  // changes every 100ms
        stitchTiles="stitch"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#panel-grain)"/>
  </svg>
</div>

The seed change creates barely perceptible grain motion.
At 0.03 opacity over the glass background, it reads as material texture, not noise.
The effect: glass surfaces feel alive, like looking through actual frosted glass
where micro-imperfections catch light differently as conditions change.
```

**Performance note**: The SVG filter seed change is cheap — it does not trigger layout, only paint. But if benchmarking shows frame drops, reduce to seed change every 500ms or use a pre-rendered noise texture sprite sheet with CSS animation.

### Panel-Type Color Tint

Different panel types should have barely distinguishable color temperatures:

```
Inspector panel:     glass background + rgba(180, 160, 140, 0.01) overlay  // warm
Timeline panel:      glass background + rgba(140, 160, 180, 0.01) overlay  // cool
Memory shelf:        glass background + rgba(160, 140, 180, 0.01) overlay  // purple-cool
Learn overlay:       glass background + rgba(180, 140, 140, 0.015) overlay // red-warm
Context menu:        glassElevated, no tint (neutral, transient)
Model selector:      glassElevated, no tint (neutral, transient)

These are at 1% opacity. They will not be consciously visible.
But over time, the user's peripheral vision associates spatial position
(right = warm = inspector, left = cool-purple = memory) with color temperature.
It is ambient wayfinding.
```

### Glass Refraction Edge

When a glass panel overlaps content (nodes, edges), the content behind the glass should appear very slightly shifted. This is a CSS transform trick:

```css
.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(20px) saturate(1.2);
  /* The blur already creates refraction. But add: */
  transform: scale(1.002);
  /* 0.2% scale creates a 1-2px edge distortion that reads as glass thickness */
  border-radius: inherit;
  z-index: -1;
}
```

The 0.2% scale on the backdrop creates a barely perceptible magnification — the hallmark of real glass with thickness. Most users will never notice. Designers will.

---

## IV. CANVAS AS LIVING SURFACE

The canvas currently has: dot grid, radial vignette, dual noise layers. This is a good foundation for the petri-dish metaphor. But a petri dish under a microscope is not still. The medium has convection currents. Dust particles drift. The illumination shifts with the observer's position.

### Ambient Particle System

Add 15-25 extremely slow-moving particles to the canvas layer. These are not connected to nodes — they are environmental. Think: dust motes in a beam of light, or microorganisms drifting in culture medium.

```typescript
interface AmbientParticle {
  x: number;       // world coordinates
  y: number;
  vx: number;      // velocity: -0.3 to 0.3 px/sec
  vy: number;
  r: number;        // radius: 0.5 to 2.0 px
  opacity: number;  // 0.02 to 0.06
  phase: number;    // for individual oscillation
}

function initAmbientParticles(count: number): AmbientParticle[] {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 2000,
    y: (Math.random() - 0.5) * 2000,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    r: 0.5 + Math.random() * 1.5,
    opacity: 0.02 + Math.random() * 0.04,
    phase: Math.random() * Math.PI * 2,
  }));
}

// In render loop:
function renderAmbientParticles(particles: AmbientParticle[], time: number): string {
  let s = '';
  for (const p of particles) {
    // Brownian drift
    p.x += p.vx + Math.sin(time * 0.3 + p.phase) * 0.1;
    p.y += p.vy + Math.cos(time * 0.2 + p.phase) * 0.1;
    // Gentle opacity oscillation
    const o = p.opacity * (0.7 + 0.3 * Math.sin(time * 0.8 + p.phase));
    s += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${T.dim}" opacity="${o}"/>`;
  }
  return s;
}
```

**Why particles matter**: They solve the "dead canvas" problem. Even when no nodes are streaming, no mouse is moving, and the physics simulation has settled, the canvas breathes. The particles confirm the surface is alive. This is the difference between a screensaver and an organism.

**Performance**: 20 SVG circles with no filters, updated per frame, is negligible. These are simpler than the existing ripple effects.

### Responsive Vignette

The current vignette is fixed at viewport center. Make it track the centroid of visible nodes:

```typescript
// Calculate content centroid in screen space
function getContentCentroid(bodies: Record<string, Body>, panX: number, panY: number, scale: number): { cx: number; cy: number } {
  const ids = Object.keys(bodies);
  if (ids.length === 0) return { cx: 0.5, cy: 0.5 }; // center default
  let sumX = 0, sumY = 0;
  for (const id of ids) {
    const b = bodies[id];
    sumX += b.x * scale + panX;
    sumY += b.y * scale + panY;
  }
  // Normalize to 0-1 viewport range, with heavy damping
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  return {
    cx: Math.max(0.3, Math.min(0.7, (sumX / ids.length) / viewW)),
    cy: Math.max(0.3, Math.min(0.7, (sumY / ids.length) / viewH)),
  };
}
```

The vignette's center shifts to follow the content centroid, clamped to 30%-70% of viewport dimensions (so it never goes fully off-center). The shift should be heavily interpolated (lerp at 0.02/frame) so it feels like the microscope's illumination is lazily tracking the specimen.

Apply via CSS custom properties on the vignette overlay div:
```css
background: radial-gradient(
  ellipse 120% 120% at var(--vignette-cx) var(--vignette-cy),
  rgba(19,18,15,0) 0%,
  rgba(8,7,6,0.4) 70%,
  rgba(8,7,6,0.8) 100%
);
```

### Grid Organic Variation

The current grid is a perfect Cartesian dot grid. Perfect grids feel like graph paper. The petri-dish metaphor wants something more organic.

Two approaches (choose one based on performance):

**Option A — Jittered Grid (cheaper)**:
```typescript
// When drawing grid, add per-dot positional jitter
// Use a deterministic hash so dots don't dance
function gridJitter(x: number, y: number): { dx: number; dy: number } {
  // Simple deterministic hash
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  const h2 = Math.sin(x * 269.5 + y * 183.3) * 43758.5453;
  return {
    dx: (h - Math.floor(h) - 0.5) * 3, // +/- 1.5px jitter
    dy: (h2 - Math.floor(h2) - 0.5) * 3,
  };
}

// In drawGrid, replace:
//   ctx.arc(x, y, r, 0, Math.PI * 2);
// with:
//   const j = gridJitter(x, y);
//   ctx.arc(x + j.dx, y + j.dy, r, 0, Math.PI * 2);
```

**Option B — Density Gradient (richer)**:
```typescript
// Dot density decreases toward viewport edges
// Combined with size variation: center dots slightly larger
function gridDotProperties(screenX: number, screenY: number, viewW: number, viewH: number) {
  const cx = screenX / viewW - 0.5; // -0.5 to 0.5
  const cy = screenY / viewH - 0.5;
  const distFromCenter = Math.sqrt(cx * cx + cy * cy); // 0 to ~0.7

  // Skip some dots far from center (stochastic thinning)
  const keepProbability = 1.0 - distFromCenter * 0.6; // 1.0 at center, 0.58 at corners
  const hash = Math.sin(screenX * 127.1 + screenY * 311.7) * 43758.5453;
  if ((hash - Math.floor(hash)) > keepProbability) return null; // skip this dot

  // Size: slightly larger at center
  const radius = 0.6 + 0.4 * (1 - distFromCenter);

  return { radius };
}
```

Option A is recommended for v1. It adds organic feel with zero performance cost. Option B can layer on top later.

### Depth-of-Field on Distant Nodes

When zoomed in past LOD 3, nodes at the edges of the viewport (far from the zoom center) should receive a slight blur. This is the microscope depth-of-field effect — the specimen in the center is in focus, the periphery softens.

```
Implementation: CSS filter on the world-space SVG, using a radial mask

.world-container::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  backdrop-filter: blur(0.5px);
  mask-image: radial-gradient(
    ellipse 50% 50% at 50% 50%,
    transparent 0%,
    transparent 40%,
    black 80%,
    black 100%
  );
  opacity: 0;
  transition: opacity 0.5s;
}

/* Activate when zoomed in */
.world-container[data-zoomed="true"]::after {
  opacity: 1;
}
```

This is a subtle effect — 0.5px blur at the viewport periphery only when zoomed in. It reinforces the microscope metaphor and creates focus hierarchy: what's centered is what matters.

**Caveat**: `backdrop-filter` with mask is GPU-intensive. Profile on target hardware. If frame rate drops below 55fps, disable or reduce to 0.3px blur.

---

## V. TYPOGRAPHY AS MATERIAL

The previous audit recommended Inter for UI text, Inconsolata for data. That is correct for readability. But the RPG direction opens a more ambitious typographic approach.

### The Type System

```
Font stack:
  UI Chrome:     Inter, system-ui, sans-serif
  Data/Code:     Inconsolata, Menlo, monospace
  Display:       Inter with heavy letter-spacing and weight manipulation

Why not a display serif or decorative face?
  Because the "RPG" here is not medieval fantasy.
  It is sci-fi RPG — Deus Ex, not Diablo.
  The aesthetic is clinical-yet-warm, technical-yet-human.
  Inter at extreme weights (200, 700) with tight tracking
  creates that tension between precision and personality.
```

### Node Labels as Badges

Currently: plain text below the node, Inconsolata 11px. This should be a material element with its own visual treatment.

```
For Tier 0-1 nodes:
  Plain text, as current. Inconsolata 10px, T.tertiary or T.ghost.
  No background. Clean.

For Tier 2+ nodes:
  Add a pill background behind the label:

  <rect x="${-textWidth/2 - 6}" y="${r + 6}"
    width="${textWidth + 12}" height="16"
    rx="4" fill="${E[3]}" opacity="0.7"
    stroke="${E[5]}" stroke-width="0.5"/>
  <text ...same as current but y adjusted to center in pill.../>

For Tier 3-4 nodes:
  The pill gets a faint top-edge highlight:

  <rect ...same pill.../>
  <line x1="${-textWidth/2 - 5}" y1="${r + 6.5}"
    x2="${textWidth/2 + 5}" y2="${r + 6.5}"
    stroke="${T.dim}" stroke-width="0.5" opacity="0.3"/>
  <text .../>
```

This creates a progression: bare text (common) -> pill badge (rare) -> highlighted pill badge (epic/artifact). The label itself communicates rarity.

### Status Indicators as Typography

Instead of (or in addition to) colored dots for streaming/thinking/idle states, use typographic treatments:

```
Streaming state:
  The "..." label on a streaming node should cycle characters:
  Frame 0-20: "."
  Frame 21-40: ".."
  Frame 41-60: "..."
  Frame 61-80: ".."
  Frame 81-100: "."

  But render each dot as a separate <tspan> with staggered opacity:
  <text>
    <tspan opacity="${0.3 + 0.7 * Math.sin(time * 6)}">.</tspan>
    <tspan opacity="${0.3 + 0.7 * Math.sin(time * 6 - 1)}">.</tspan>
    <tspan opacity="${0.3 + 0.7 * Math.sin(time * 6 - 2)}">.</tspan>
  </text>

  This creates a wave-like pulsing across the dots — each dot peaks in sequence.
  More alive than a uniform blink.

Branch count badge (existing):
  Current: circle + number. Add context:
  For 2 branches: "2" (no change)
  For 3+ branches: render as "3x" to imply multiplication/forking
  At LOD 3, add a tiny fork icon (two diverging lines) next to the number
```

### Panel Typography Hierarchy (Inter + Inconsolata)

```
Session name (SessionPill expanded):
  Inter 14px, weight 600, letter-spacing -0.01em
  Color: T.primary
  This is the most prominent text in the UI chrome

Panel titles ("Timeline", "Inspector", "Memories"):
  Inter 10px, weight 600, letter-spacing 0.08em, uppercase
  Color: T.ghost
  The small-caps + wide tracking creates a "section header" that
  reads as structural, not content

Message content (Timeline, Inspector):
  Inter 13px, weight 400, line-height 1.65
  Color: T.secondary
  Maximum line length: 50ch (clamp width of reading column)
  This is the most-read text in the product. It must be comfortable.

Metadata (timestamps, model names, token counts):
  Inconsolata 10px, weight 400
  Color: T.dim
  The monospace face signals "this is machine data, not human content"

Node canvas labels:
  Inconsolata 10px, weight 500
  Color: T.tertiary (user) or T.ghost (AI)

Keyboard shortcuts:
  Inconsolata 10px, weight 700
  Inside a micro-pill: E[5] background, E[7] border, 2px 6px padding, 4px radius
  This creates the <kbd> look without HTML

Input field:
  Inter 13px, weight 400
  Color: T.secondary
  Placeholder: T.ghost

Badge/count:
  Inconsolata 9px, weight 700
  Color: T.primary
```

---

## VI. EDGE EVOLUTION — Circuitry That Breathes

The edges are currently functional: styled per type, animated dashes, arrow markers. But they can carry more information and more atmosphere.

### Energy Flow Animation

Reply edges (the main conversation thread) should have a traveling pulse — a bright spot that moves from parent to child over 2 seconds on a loop. This transforms static connections into visible energy flow.

```
Implementation via animated gradient along path:

Add an SVG <animate> or drive via the render loop:

// For each reply edge, add a "pulse" circle that travels the path
function edgePulse(x0: number, y0: number, x1: number, y1: number, time: number): { px: number; py: number; opacity: number } {
  const t = (time * 0.5) % 1; // 2-second loop, normalized 0-1
  // Interpolate along the cubic bezier (simplified: linear for now)
  const px = x0 + (x1 - x0) * t;
  const py = y0 + (y1 - y0) * t;
  // Fade in/out at endpoints
  const opacity = Math.sin(t * Math.PI) * 0.15;
  return { px, py, opacity };
}

// Render as a small glowing dot:
<circle cx="${px}" cy="${py}" r="2" fill="${T.ghost}" opacity="${opacity}"/>
<circle cx="${px}" cy="${py}" r="4" fill="${T.dim}" opacity="${opacity * 0.3}"/>
```

The outer circle is the glow, the inner is the bright core. A dim point of light flowing from question to answer, continuously. At 0.15 peak opacity, it is subtle — visible if you look, but not demanding attention.

**Performance**: One additional circle per reply edge per frame. With typical graphs of 20-50 edges, this adds 40-100 SVG elements — well within budget.

### Edge Thickness as Depth Indicator

Edges deeper in the conversation tree should be thinner. The root edge (first message to first reply) is the thickest. Each subsequent depth loses 0.1px width.

```
const edgeWidth = Math.max(0.5, 1.5 - depth * 0.08);
```

This creates a natural taper: the conversation trunk is thick, branches thin out. Combined with the opacity-based dead-end dimming already in place, this makes the conversation's structure readable at a glance through line weight alone.

### New Edge Draw-On Animation

When a new edge appears, it should animate from source to target. This was in the previous audit but without an implementation path for the imperative SVG renderer.

```typescript
// In effects.ts, add EdgeEntrance:
interface EdgeEntrance {
  edgeId: string;
  age: number;        // 0 -> 1
  duration: number;   // 0.4 seconds
  pathLength: number; // total SVG path length (estimated)
}

// In renderSVG, for edges with active entrance:
const entrance = fxRef.current.edgeEntrances.get(edgeKey);
if (entrance && entrance.age < 1) {
  const drawLength = entrance.pathLength * easeOutCubic(entrance.age);
  // stroke-dasharray = drawn portion + full path length gap
  dashAttr = ` stroke-dasharray="${drawLength} ${entrance.pathLength}"`;
}
```

The edge traces itself from source to target over 400ms. Combined with the node's springEase entrance, the sequence becomes: node pops in (spring overshoot) -> edge draws toward it (smooth ease) -> settling. This is the heartbeat of the graph.

---

## VII. INTERACTION FEEDBACK — The RPG Hit

### Node Click/Select Feedback

When a node is clicked (not just hovered), it needs a moment of impact. The current ripple effect is good but generic — it is a circular wave radiating from the click point. For node selection specifically:

```
On node click:
  1. Flash — The node's specular highlight jumps to 0.35 opacity for 100ms,
     then eases back to normal over 300ms

  2. Ring burst — A thin ring (stroke 0.8px) expands from the node's radius
     to 2x radius over 300ms, fading from 0.4 to 0 opacity
     Color: T.primary (white, not red — red is the steady-state selection)
     This is the "impact" ring

  3. Particle scatter — 4-6 micro-dots (r: 1px) shoot outward from the node
     at random angles, decelerating and fading over 500ms
     Color: T.dim
     Travel distance: 20-40px from node center

  4. Screen micro-shake — existing, but reduce intensity to 1.5px (from 3px)
     3px is jarring for a click. Reserve 3px for new node creation.
```

This sequence — flash + ring + scatter + shake — creates the RPG "hit" feeling. It is the equivalent of a damage number popping up: immediate, satisfying, informative.

### Drag-and-Drop Physics Feel

When dragging a node, the current implementation moves it 1:1 with the cursor. Add a micro-lag (lerp) and overshoot:

```
// Instead of directly setting body position to cursor position:
// body.x = targetX; body.y = targetY;

// Use lerp with slight lag:
const DRAG_LERP = 0.85; // 85% toward target per frame (fast, but not instant)
body.fx = body.fx + (targetX - body.fx) * DRAG_LERP;
body.fy = body.fy + (targetY - body.fy) * DRAG_LERP;

// On drag release, let the node's physics velocity carry it slightly
// (the simulation already does this, but amplify):
// When releasing, add residual velocity from the last few mouse deltas
```

The 15% lag creates a "weight" feel — the node follows the cursor but has inertia. It feels like dragging a physical object through fluid, not moving a pixel on a screen. This directly reinforces the petri-dish / specimen metaphor.

### Hover Magnetic Snap

When hovering near a node (within 1.5x its radius), add a subtle cursor attraction visualization:

```
// In the hover detection loop, when a node is within range but not yet hovered:
const dist = Math.hypot(mx - body.x, my - body.y);
const range = body.r * 1.5;
if (dist < range && dist > body.r) {
  // Draw a faint line from cursor to node center
  const opacity = 0.05 * (1 - (dist - body.r) / (range - body.r));
  s += `<line x1="${mx}" y1="${my}" x2="${body.x}" y2="${body.y}"
    stroke="${T.dim}" stroke-width="0.5" opacity="${opacity}"
    stroke-dasharray="2 3"/>`;
}
```

This creates a barely visible "field line" between cursor and node as you approach. At 0.05 opacity maximum, it is ghostly — a magnetic suggestion, not a visual element. But it makes the canvas feel responsive to proximity, not just to direct hit-testing.

---

## VIII. MOTION PRINCIPLES

Every animated element in Dreamcatcher should follow these timing rules:

### Timing Taxonomy

```
INSTANT (0-50ms):
  - Hover state changes (stroke color, specular boost)
  - Cursor style changes
  - Tooltip appearance

RESPONSIVE (100-200ms):
  - Button state transitions
  - Panel slide-in/out
  - Node scale on hover (150ms)
  - Context menu appear (120ms)
  - Badge opacity changes

PURPOSEFUL (300-500ms):
  - Node entrance (spring ease, 700ms with overshoot)
  - Edge draw-on (400ms, easeOutCubic)
  - Selection ring establishment
  - Panel content stagger (30ms per item)
  - Ripple expansion (800ms primary, 1200ms secondary)

AMBIENT (1000ms+):
  - Particle orbit rotation (continuous)
  - Breathing auras (1.5 Hz)
  - Selection ring breathing (3 Hz)
  - Streaming pulse (8 Hz — fast, urgent)
  - Ambient particle drift (continuous, 0.3px/sec)
  - Vignette centroid tracking (continuous, lerp 0.02)
  - Edge energy pulses (2000ms loop)
```

### Easing Library

```typescript
const EASE = {
  // For UI transitions (buttons, panels)
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',     // fast start, gentle settle

  // For entrances (nodes, menus)
  spring: springEase, // existing — elastic overshoot

  // For exits (dismissals, fade-outs)
  exit: 'cubic-bezier(0.4, 0, 1, 1)',           // accelerating out

  // For state changes (hover, focus)
  state: 'cubic-bezier(0.2, 0, 0, 1)',          // snappy

  // For ambient (breathing, orbiting)
  sine: (t: number) => Math.sin(t),             // continuous oscillation
} as const;
```

---

## IX. IMPLEMENTATION PRIORITY

This manifesto describes the ceiling. Not everything ships at once. Here is the implementation order, ranked by visual-impact-to-effort ratio:

### Phase 1 — Material Depth (1-2 days)
1. Node rarity calculation function
2. Tier 1 orbit ring (single animated dash)
3. Tier 2 particle orbits (3 rotating circles)
4. Tier 3 breathing aura
5. Edge energy pulse (traveling dot on reply edges)

*Why first*: These are all additions to the existing renderSVG loop — no new rendering infrastructure. Each is 10-20 lines of SVG string generation. The impact is transformative: the canvas goes from uniform to alive.

### Phase 2 — Chromatic Layer (1 day)
6. Model-color streaming pulses (replace red with provider color during stream)
7. AI node hover edge glow in model color
8. Edge tint toward AI nodes (5% model color blend)

*Why second*: Small code changes in the existing node/edge rendering. Creates immediate visual differentiation between model providers.

### Phase 3 — Canvas Atmosphere (1 day)
9. Ambient particle system (20 drifting dots)
10. Grid jitter (deterministic hash, 1.5px displacement)
11. Responsive vignette (centroid tracking with lerp)

*Why third*: New systems (particle array, vignette tracking) but contained to the canvas layer. No impact on node/edge rendering.

### Phase 4 — Glass and Typography (2 days)
12. Animated grain on glass panels
13. Panel-type color tints
14. Inter font integration
15. Type hierarchy implementation across all components
16. Node label badge system (pill backgrounds for Tier 2+)

*Why fourth*: Requires touching every UI component. Higher effort, but the Inter integration alone transforms the reading experience.

### Phase 5 — Interaction Polish (1 day)
17. Node click impact sequence (flash + ring + scatter)
18. Drag lerp (weight feel)
19. Hover magnetic field lines
20. New edge draw-on animation

*Why last*: These are feel improvements — important for the final 10% of quality, but the visual transformation happens in phases 1-3.

### Deferred — Evaluate After Phase 3
- Depth-of-field blur on periphery (expensive, needs profiling)
- Glass refraction edge (subtle, may not register)
- Tier 4 "Artifact" warm amber material (needs user-facing star/pin feature first)
- Depth-based canvas warming (extremely subtle, may be wasted effort)

---

## X. WHAT THIS ACHIEVES

After all five phases, someone opening Dreamcatcher for the first time sees:

A dark, warm canvas that breathes — micro-particles drift lazily, grid dots scatter organically, a vignette follows the conversation's center of mass. The nodes are not uniform: shallow questions are clean and quiet, deep threads shimmer with orbiting particles, branch points have faint satellite rings, starred discoveries glow with warm amber undertones.

Edges trace themselves alive when connections form. A pulse of light travels continuously from each question to its answer. When Claude is thinking, the node pulses in soft amber. When GPT is streaming, it hums with teal. The glass panels that frame the UI feel textured — grain shifts imperceptibly, a cool-warm spectrum differentiates the inspector from the memory shelf.

Text has hierarchy. Panel headers are structured and architectural. Message content is comfortable and readable. Metadata is monospaced and mechanical. Labels on significant nodes sit in translucent pill badges.

Clicking a node produces a flash, a ring burst, a scatter of particles. Dragging a node feels like moving something through fluid. Hovering near a node draws a ghostly field line from cursor to center.

None of these effects are loud. None demand attention. Together, they create a surface that feels *inhabited* — not by an algorithm, but by craft. The kind of craft that makes someone pause and think: the people who built this care about things I didn't even know I could notice.

That is the standard. That is what ships.
