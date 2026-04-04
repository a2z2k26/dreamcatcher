# Audit Round 3 — Visual Impact Priorities

Assessed from screenshots (dc-now-01 through dc-now-06) and source files.
Phase 1 design system is solid: warm-black elevation stack, multi-layer node materials, glass panels, LOD system. What follows are the 10 highest-impact visual upgrades remaining — things users see and feel before they understand architecture.

---

## 1. Canvas Substrate Is Dead Flat

**What**: The canvas reads as a plain dark rectangle with a dot grid. No atmospheric depth, no sense of environment. The dots are a single flat color (`E[5]` / `#252320`) at uniform opacity.

**Why it matters**: The canvas is 95% of what users see. A flat void makes every floating element look pasted on rather than inhabiting a space. The petri-dish metaphor from the design direction calls for a living surface — right now it's a dead one.

**Implementation**:

In `drawGrid()` inside `GraphCanvas.tsx`, add a radial opacity falloff so dots near the center of the viewport are brighter and dots at the edges fade:

```ts
// After calculating gap, ox, oy, r — replace the flat fill loop:
const centerX = W / 2;
const centerY = H / 2;
const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

for (let x = ox; x < W; x += gap) {
  for (let y = oy; y < H; y += gap) {
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const falloff = 1 - (dist / maxDist) * 0.7; // 100% center → 30% edges
    ctx.globalAlpha = falloff * (0.25 + 0.15 * scale); // scale-responsive
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
ctx.globalAlpha = 1;
```

Then add a CSS vignette overlay (even though it was removed before — the issue was it was too heavy; this one is surgical):

```css
/* In globals.css — canvas vignette, pointer-events: none */
.canvas-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 70% 70% at 50% 50%,
    transparent 0%,
    rgba(8, 7, 6, 0.35) 100%
  );
  z-index: 1;
}
```

Add `<div className="canvas-vignette" />` after the `<canvas>` element in GraphCanvas's return JSX. This gives a subtle lens darkening that makes the center feel spotlit.

---

## 2. Empty State Is Anemic

**What**: Screenshot 01 shows a barely visible "DC" at ~40% opacity with "Start a conversation" in `T.ghost` (#606060) and a keyboard hint in `T.dim` (#404040). The breathing animation cycles between 0.3 and 0.5 opacity. The entire empty state whispers when it should beckon.

**Why it matters**: First impression. A user opening this for the first time sees almost nothing — a dark void with text they have to squint to read. The app looks broken or loading.

**Implementation**:

In `renderSVG()` around line 267, replace the empty state block:

```ts
// Raise base opacity, add a warm glow behind the monogram
const breathe = 0.6 + 0.15 * Math.sin(timeRef.current * 0.8);

s += `<g transform="translate(${cx},${cy})">`;

// Warm ambient glow behind text
s += `<circle cx="0" cy="10" r="120" fill="none" stroke="${E[6]}" stroke-width="60" opacity="${0.04 + 0.02 * Math.sin(timeRef.current * 0.5)}"/>`;

// DC monogram — heavier weight, warmer color
s += `<text x="0" y="0" text-anchor="middle" fill="${T.ghost}" font-family="Inter,system-ui,sans-serif" font-size="56" font-weight="300" letter-spacing="14" opacity="${breathe}">DC</text>`;

// Tagline — bump to T.subtle so it's actually legible
s += `<text x="0" y="42" text-anchor="middle" fill="${T.subtle}" font-family="Inter,system-ui,sans-serif" font-size="15" font-weight="400" opacity="${breathe * 0.8}">Start a conversation</text>`;

// Shortcut hint — T.ghost instead of T.dim
s += `<text x="0" y="66" text-anchor="middle" fill="${T.ghost}" font-family="'Inconsolata',monospace" font-size="11" opacity="${breathe * 0.5}">Press / to focus input</text>`;

s += `</g>`;
```

Key changes: monogram goes from 48px/200wt to 56px/300wt, from `E[5]` to `T.ghost`, breathing range 0.6-0.75 instead of 0.3-0.5. Tagline from `T.ghost` to `T.subtle`. Ambient glow circle adds a soft warm halo that breaks the dead-flat canvas.

---

## 3. Edge Lines Are Nearly Invisible

**What**: Reply edges render at `rgba(140,140,140,0.30)` with a 2px stroke. Branch edges at `rgba(176,176,176,0.30)` with 1.5px. At the default zoom level shown in screenshots 02-04, the vertical thread connecting user-to-AI is barely perceptible — you have to know it's there.

**Why it matters**: Edges are the conversation's narrative structure made visible. If users can't see the connections, the spatial metaphor fails. The graph becomes scattered dots instead of a threaded conversation.

**Implementation**:

In the `EDGE_RENDER` constant around line 65:

```ts
const EDGE_RENDER: Record<EdgeType, { stroke: string; dash: string; width: number; speed: number; glow: string; marker: string }> = {
  reply:        { stroke: 'rgba(160,155,145,0.45)', dash: '',         width: 2.5,  speed: 0,   glow: 'rgba(160,155,145,0.12)', marker: 'url(#arrow-reply)' },
  branch:       { stroke: 'rgba(176,176,176,0.40)', dash: '12 6',    width: 2.0,  speed: 0.8, glow: 'rgba(176,176,176,0.06)',  marker: 'url(#arrow-branch)' },
  regeneration: { stroke: 'rgba(221,0,0,0.30)',     dash: '2 6',     width: 1.5,  speed: 2.0, glow: '',                        marker: 'url(#arrow-regen)' },
  summarizes:   { stroke: `${T.dim}`,               dash: '1 4',     width: 1.0,  speed: 0.5, glow: '',                        marker: '' },
  clips_to:     { stroke: `${C.memory}40`,          dash: '8 4',     width: 1.2,  speed: 0.6, glow: '',                        marker: '' },
  references:   { stroke: `${T.ghost}35`,           dash: '6 2 2 2', width: 1.0,  speed: 0.4, glow: '',                        marker: '' },
};
```

Changes: reply stroke `0.30` to `0.45` with a warm tint (`160,155,145` instead of neutral `140,140,140`), width `2.0` to `2.5`, glow from `0.10` to `0.12`. Branch gets its own glow layer. Arrow marker fill opacity from `0.30` to `0.45` to match:

```ts
// In the defs section, update marker fill:
s += `<marker id="arrow-reply" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="rgba(160,155,145,0.45)"/></marker>`;
```

---

## 4. Floating Input Lacks Presence

**What**: The input bar at the bottom (screenshots 01-05) is a 420px-wide glass pill that blends into the dark background. Its unfocused state is nearly invisible — the placeholder text is `T.ghost` (#606060), the glass background is 88-92% opaque dark, and the overall contrast against `E[1]` is minimal. There is no visual anchor saying "type here."

**Why it matters**: The input is the primary interaction point. If users don't immediately see it, they don't know how to start.

**Implementation**:

In `FloatingInput` around line 286:

```tsx
// Increase unfocused width and add a subtle bottom glow
width: focused || input ? 560 : 460,  // was 420
```

Add a glow gradient beneath the input container:

```tsx
// Wrap the glass div with a glow container
<div style={{
  position: 'absolute',
  bottom: 16,  // was 20 — slightly closer to edge
  left: '50%',
  transform: 'translateX(-50%)',
  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  width: focused || input ? 560 : 460,
}}>
  {/* Ambient glow beneath input — always visible */}
  <div style={{
    position: 'absolute',
    bottom: -8,
    left: '10%',
    right: '10%',
    height: 24,
    background: `radial-gradient(ellipse at 50% 0%, rgba(225,225,225,0.04) 0%, transparent 70%)`,
    pointerEvents: 'none',
    filter: 'blur(8px)',
  }} />
  <div style={{
    ...glass,
    borderRadius: 14,  // was 12
    padding: focused ? '14px 20px' : '12px 18px',  // slightly more generous
    // ... rest unchanged
  }}>
```

Also bump the placeholder color from implicit `T.ghost` styling to a custom value:

```css
/* In globals.css */
.dc-input::placeholder {
  color: #808080;  /* T.subtle — was inheriting ~T.ghost */
  opacity: 1;
}
```

---

## 5. Inspector Panel Has No Visual Hierarchy

**What**: Screenshot 03 shows the inspector as a flat `E[0]` rectangle with uniform padding. Content, Details, Reasoning, Actions sections all use the same 9px uppercase ghost labels, same 12-13px body text, same vertical rhythm. Nothing differentiates the primary content from metadata.

**Why it matters**: When a user opens the inspector to read an AI response, the content should be front and center. Right now it's a wall of similarly-weighted text. The panel reads like a debug view, not a reading surface.

**Implementation**:

In `Inspector.tsx`, restructure the body section:

```tsx
{/* Content — primary, prominent */}
<div style={{ marginBottom: 20 }}>
  <div style={{
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: 14,          // was 13
    lineHeight: 1.75,      // was 1.65
    color: T.primary,      // was T.secondary — this is the main content
    letterSpacing: '-0.01em',
  }}>
    {node.text || '...'}
  </div>
</div>

{/* Divider between content and metadata */}
<div style={{
  height: 1,
  background: `linear-gradient(to right, ${E[5]}, transparent)`,
  marginBottom: 16,
}} />

{/* Metadata — recessed, smaller */}
<div style={{ marginBottom: 14 }}>
  <Label>Details</Label>
  <div style={{
    fontSize: 10,
    color: T.dim,      // was T.subtle — push it further back
    lineHeight: 1.7,
    fontFamily: "'Inconsolata', monospace",
  }}>
```

Remove the "Content" label above the main text block entirely — the content IS the inspector. It doesn't need a label. Also increase padding from `12px` to `16px 18px` for breathing room.

---

## 6. Timeline Messages Are Visually Monotonous

**What**: Screenshot 05 shows the timeline as an undifferentiated stream of messages. User and AI messages have identical padding (12px 16px), identical font treatment (13px, T.secondary), and are distinguished only by a 6px dot that's either `T.tertiary` or `T.ghost`. The active message border-left is 3px solid accent — the only color in the entire panel.

**Why it matters**: In a conversation graph, the timeline is the narrative reading mode. If you can't instantly tell user from AI, the conversation loses its back-and-forth rhythm.

**Implementation**:

In `TimelineView.tsx`, differentiate user vs. AI messages:

```tsx
// User messages: left-aligned, slightly brighter
// AI messages: indented, subtler, with a model-colored left accent

<div
  key={node.id}
  style={{
    padding: node.role === 'user' ? '14px 18px 14px 16px' : '14px 18px 14px 28px', // AI indented
    cursor: 'pointer',
    borderLeft: isActive
      ? `3px solid ${ACCENT}`
      : node.role === 'ai' && model
        ? `2px solid ${model.color}20`   // subtle faction color
        : '3px solid transparent',
    background: isActive ? `${E[3]}4D` : 'transparent',
    transition: 'background 0.15s',
  }}
>
```

For AI content text, drop it a luminance level:

```tsx
<div style={{
  fontSize: 13,
  lineHeight: 1.65,
  color: node.role === 'user' ? T.secondary : T.tertiary,  // AI one step dimmer
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}}>
```

Add a 1px separator between messages:

```tsx
// After each message div, add:
{i < path.length - 1 && (
  <div style={{ height: 1, background: E[3], margin: '0 16px' }} />
)}
```

---

## 7. Node Labels Lack Warmth and Weight

**What**: Node labels render in Inconsolata monospace at 12px/600 weight. In screenshot 06 (zoomed), the labels under nodes read as cold, technical, and thin. The monospace font at this size produces uneven letter spacing and fights the warm material treatment of the nodes above.

**Why it matters**: Labels are the first thing users read to understand what each node contains. They should feel like handwritten specimen labels under precious objects — not terminal output.

**Implementation**:

In `renderSVG()` around line 421, switch labels to Inter:

```ts
// Change label font from mono to sans, with warm styling
const labelColor = n.role === 'user' ? T.secondary : T.subtle;  // was T.tertiary : T.ghost
const labelWeight = n.role === 'user' ? '500' : '400';

s += `<text x="0" y="${r + 20}" text-anchor="middle" fill="${labelColor}" font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="${labelWeight}" letter-spacing="0.02em" opacity="${labelOpacity}">${esc(label)}</text>`;
```

Key changes: Inter instead of Inconsolata, size 11 instead of 12 (Inter reads larger at same size), weight 500/400 instead of flat 600, added letter-spacing for legibility, colors bumped one level brighter. The label should complement the node material, not compete with it.

---

## 8. Glass Panel Borders Are Too Uniform

**What**: The `glass` object in theme.ts defines directional borders — top lighter, bottom darker — which is correct. But in practice, every glass element (session pill, input, model dropdown, canvas toolbar) uses the identical glass treatment. There's no differentiation between a top-anchored element (session pill) and a bottom-anchored element (input bar).

**Why it matters**: Directional lighting sells the illusion. A panel hanging from the top of the screen should catch light on its bottom edge. A panel resting at the bottom should catch light on its top edge. Using the same gradient for both breaks the spatial metaphor.

**Implementation**:

Add a `glassBottom` variant to `theme.ts`:

```ts
// Glass variant for bottom-anchored elements — light catches on top edge
export const glassBottom = {
  background: 'linear-gradient(0deg, rgba(26,24,22,0.92) 0%, rgba(19,18,15,0.88) 100%)',
  backdropFilter: 'blur(20px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
  borderTop: '1px solid rgba(61,58,53,0.6)',       // light catch
  borderLeft: '1px solid rgba(44,42,38,0.35)',
  borderRight: '1px solid rgba(44,42,38,0.3)',
  borderBottom: '1px solid rgba(19,18,15,0.5)',     // shadow edge
  boxShadow: [
    '0 1px 0 0 rgba(61,58,53,0.15) inset',
    '0 -1px 0 0 rgba(0,0,0,0.2) inset',
    '0 -4px 16px -2px rgba(0,0,0,0.5)',            // shadow projects upward
    '0 -1px 3px 0 rgba(0,0,0,0.3)',
  ].join(', '),
} as const;
```

Use `glassBottom` for `FloatingInput` and `CanvasTools`. Keep `glass` for `TopControls`, `SessionPill`, and dropdowns.

---

## 9. Status Bar Is a Flat Dead Zone

**What**: The status bar (visible in all screenshots) is a 24px-tall strip of `E[0]` with 10px Inconsolata text. Model name, phase dot, node count, edge count, token count — all at `T.dim` (#404040) with `T.subtle` for the model name. It reads as inert debug information.

**Why it matters**: The status bar occupies the full width of the screen permanently. At its current contrast, it's visual dead weight — too dim to be useful, too present to be invisible. Either make it informative or make it disappear.

**Implementation**:

Option A (the better one) — make it disappear into the canvas and only materialize on hover:

In `StatusBar.tsx`:

```tsx
<div
  style={{
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,                               // was 24
    background: `linear-gradient(to top, ${E[0]}CC, ${E[0]}00)`,  // fades to transparent
    borderTop: 'none',                         // remove hard line
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    fontFamily: "'Inconsolata', monospace",
    fontSize: 10,
    color: T.dim,
    zIndex: 40,
    opacity: 0.5,
    transition: 'opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  }}
  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
  onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
>
```

The gradient background makes it melt into the canvas. The hover-to-reveal means it's accessible without being visually heavy. The `borderTop` removal eliminates the harsh line that cuts across the viewport.

---

## 10. AI Node Faction Tints Are Imperceptible

**What**: Per-provider AI node fills use chromatic tints at `stop-opacity="0.08"` in the first gradient stop (e.g., `rgba(212,165,116,0.08)` for Anthropic). At the rendered node size (~28px radius), this 8% opacity chromatic wash is invisible against the dark background. The faction color system exists in code but not in pixels.

**Why it matters**: Provider differentiation is a first-class feature of the product. If users can't tell an Anthropic node from an OpenAI node at a glance, the spatial graph loses a critical information channel. The zoomed screenshot (06) shows the warm amber glow around one node and a subtler treatment on another, but at normal zoom the tints vanish.

**Implementation**:

In the SVG defs section of `renderSVG()`, increase the chromatic tint intensity and extend its radius:

```ts
// Anthropic — amber warmth
s += `<radialGradient id="node-ai-fill-anthropic" cx="50%" cy="45%" r="70%">`;
s += `<stop offset="0%" stop-color="rgba(212,165,116,0.18)"/>`;   // was 0.08
s += `<stop offset="35%" stop-color="${E[3]}" stop-opacity="0.85"/>`;
s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
s += `</radialGradient>`;

// OpenAI — green signal
s += `<radialGradient id="node-ai-fill-openai" cx="50%" cy="45%" r="70%">`;
s += `<stop offset="0%" stop-color="rgba(82,196,26,0.18)"/>`;     // was 0.08
s += `<stop offset="35%" stop-color="${E[3]}" stop-opacity="0.85"/>`;
s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
s += `</radialGradient>`;

// Google — gold warmth
s += `<radialGradient id="node-ai-fill-google" cx="50%" cy="45%" r="70%">`;
s += `<stop offset="0%" stop-color="rgba(250,173,20,0.18)"/>`;    // was 0.08
s += `<stop offset="35%" stop-color="${E[3]}" stop-opacity="0.85"/>`;
s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
s += `</radialGradient>`;

// Qwen — orange warmth
s += `<radialGradient id="node-ai-fill-qwen" cx="50%" cy="45%" r="70%">`;
s += `<stop offset="0%" stop-color="rgba(250,140,22,0.18)"/>`;    // was 0.08
s += `<stop offset="35%" stop-color="${E[3]}" stop-opacity="0.85"/>`;
s += `<stop offset="100%" stop-color="${E[1]}" stop-opacity="0.95"/>`;
s += `</radialGradient>`;
```

Also increase the model-colored tint circle inside the node from `0.10` resting / `0.16` hover to `0.16` resting / `0.24` hover (line ~387-388):

```ts
const tintOpacity = isHov ? 0.24 : 0.16;
```

And increase the core indicator resting opacity (line ~390):

```ts
const coreOpacity = 0.25 + 0.08 * Math.sin(timeRef.current * 2 + (n.id.charCodeAt(0) || 0));
```

---

## Priority Order for Implementation

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Canvas substrate (vignette + dot falloff) | 30 min | Transforms the entire visual field |
| 2 | Empty state presence | 15 min | First impression fix |
| 3 | Edge visibility | 10 min | Structural comprehension |
| 4 | Floating input presence | 20 min | Primary interaction affordance |
| 5 | Inspector hierarchy | 20 min | Reading experience |
| 6 | Timeline differentiation | 15 min | Conversation rhythm |
| 7 | Node label font/weight | 10 min | Label legibility |
| 8 | Directional glass borders | 20 min | Spatial consistency |
| 9 | Status bar fade treatment | 10 min | Visual noise reduction |
| 10 | AI faction tint intensity | 10 min | Provider differentiation |

Items 1-4 should ship together — they collectively transform the "first 3 seconds" experience. Items 5-7 improve the reading experience once users are engaged. Items 8-10 are refinement passes that compound the premium feel.
