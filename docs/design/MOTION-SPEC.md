# Dreamcatcher Motion Design Specification

**Auditor**: Interaction Designer (Forty Thieves)
**Date**: 2025-03-25
**Status**: Complete audit + GSAP integration plan + RPG motion language + visual evidence review

---

## Part 0: Visual Evidence Analysis

Six screenshots of the live application reviewed. Findings cross-referenced with code.

### dc-01-empty.png — Empty State

**What I see**: A dark void. Session pill ("DC" + dot + session name) at top center. Model selector and timeline toggle at top right. Memory shelf button at bottom left (barely visible). Floating input bar at bottom center. Status bar at absolute bottom. A subtle radial vignette is visible, and the dot grid is faintly present.

**Interaction problems**:
- **Dead empty canvas with zero guidance.** No onboarding, no hint about what to do, no ghost element suggesting where the first node will appear, no pulse on the input bar drawing attention. A new user sees a black screen with a tiny input at the bottom. This is the most critical onboarding gap in the product.
- **Input bar is too small and too low.** At rest (unfocused) it reads as a minor UI element rather than the primary action surface. The "Ask anything..." placeholder is barely legible at this scale. For a product where typing is the core action, the input needs much more presence.
- **No spatial invitation.** The canvas is infinite but nothing communicates that. No subtle animation, no breathing grid, no focal point. The vignette creates a nice petri-dish atmosphere but it frames emptiness.
- **Memory shelf button (bottom left) is nearly invisible.** The icon at this scale reads as noise.

**Motion prescriptions**:
1. Empty state should have a subtle "breathing" animation: the vignette gently oscillates (tighter/looser, 4s cycle, nearly imperceptible) and the grid dots near center pulse faintly. This communicates "alive, waiting."
2. Input bar should have a slow, gentle border pulse in the empty state -- a rhythmic glow that says "start here." Not aggressive, but present. Something like the border-top opacity oscillating between 0.3 and 0.6 over 2s.
3. Consider a ghost node or crosshair at canvas center showing where the first node will materialize. Faint, T.dim color, with a subtle breathing scale.

### dc-02-nodes.png — First Exchange

**What I see**: Two nodes vertically arranged. Top: user node (smaller circle, bright white core dot, labeled "What makes a great design s..."). Bottom: AI node (larger, concentric ring treatment, red accent selection glow, red breathing ring, labeled "A great design system addresse..."). A straight edge connects them. Inspector panel open on right showing AI response content. Floating toolbar visible at bottom center (Branch, Clip, Inspect). The red selection halo is visible around the AI node -- the breathing ring and solid inner ring.

**Interaction problems**:
- **Inspector auto-opened is good, but there is no visual connection between the selected node and the panel.** The red glow on the node and the panel on the right feel disconnected. There is no line, no shared color accent on the panel header, no directional cue saying "this panel is showing that node."
- **The floating toolbar (Branch/Clip/Inspect) appeared with no entrance animation.** It is just there. Since it is contextual (only visible when a node is selected), its appearance should be an event.
- **Node scale issue is visible.** Andrew noted things feel "too small." Looking at the screenshot, the nodes are indeed small relative to the canvas -- the two nodes and their edge occupy maybe 8% of the viewport area. The vignette frames them but they feel lonely and undersized. The labels are particularly small.
- **The edge between nodes is a single thin line.** No curvature visible at this zoom level. It lacks the "precious" quality of the nodes themselves. The edge is doing the least visual work of anything in the frame.

**Motion prescriptions**:
1. When Inspector opens, a brief accent-colored line should flash from the selected node's screen position toward the panel edge (a "connection trace" that establishes spatial relationship, 0.3s, fades immediately).
2. Floating toolbar should scale-in from center: scale(0.8) + opacity(0) -> scale(1) + opacity(1), 0.25s, dc-snap. And scale-out when deselected.
3. Edges need draw-on animation. When the first edge appears, it should draw from parent to child (0.4s, dc-reveal). This single addition will dramatically change how the graph feels -- it will feel like it is being constructed rather than just appearing.

### dc-03-conversation.png — Multi-Node Graph

**What I see**: Four nodes in a vertical chain. User-AI-User-AI. The bottom AI node has the red selection halo (active/selected). The inspector panel is scrolled showing a longer AI response. The graph is still vertically linear -- no branches yet. Labels are visible on all nodes. The edge connections read as thin gray lines between nodes.

**Interaction problems**:
- **The vertical chain layout is readable but lacks spatial dynamism.** Every node is directly below the previous one. This is correct behavior (physics + reply edges), but visually it reads as a flat list, not a spatial graph. When branches appear this will differentiate, but the linear case needs visual interest too.
- **No visual differentiation between the first exchange and the latest.** Older nodes and newer nodes look identical. There is no temporal gradient -- no sense of "recency." The most recent exchange should feel hotter/brighter than older ones.
- **The selection jumped from the second node (dc-02) to the fourth node (dc-03).** Between these two screenshots, the user sent another message. There is no visible trace of that transition -- the selection just moved. The auto-pan happened but left no wake.

**Motion prescriptions**:
1. Temporal luminance gradient: nodes could have a very subtle opacity or brightness reduction the further back in the chain they are. Most recent node at 100%, previous at 95%, two back at 90%, etc. Floor at 75%. This creates depth-of-time.
2. When a new node pair appears and the camera auto-pans, the previously-selected node's glow should fade out over 0.3s (not vanish instantly) while the new node's glow fades in. This creates a visual "handoff."
3. The edge connecting the newest pair should draw on visibly even if the user was watching. The draw-on is both functional (shows the connection being established) and delightful.

### dc-04-contextmenu.png — Context Menu

**What I see**: Same four-node graph. Inspector panel showing a very long AI response that is scrolled. The context menu is NOT visible in this screenshot despite the filename -- or it may be overlapping with the inspector panel content. Looking more carefully, the inspector panel is now showing expanded content with bullet points and structured formatting. The floating toolbar is still visible.

Actually, re-examining: the inspector panel content has changed significantly between dc-03 and dc-04. The content is much longer and more structured. This may be showing the inspector scrolled down, or a different node selected. The context menu may have been opened and closed before the screenshot, or it may be occluded.

**What this reveals about interaction state**: The inspector panel has no visual separator between sections when content is long. The scrollable area blends together. There is no "return to top" affordance. For long AI responses, the panel becomes a wall of text.

**Motion prescriptions for context menu (from code analysis, confirmed by visual context)**:
1. The context menu currently appears at exact click coordinates with zero animation. It should scale in from the click point (transformOrigin at click position).
2. Menu items should stagger in (0.03s each) -- this is fast enough to feel instant but creates a "cascade" that draws the eye down the menu.
3. On close, the menu should scale down and fade (0.12s) rather than vanishing.

### dc-06-timeline.png — Timeline Panel

**What I see**: The timeline panel is open on the right side, replacing/overlapping the inspector. It shows the conversation in linear reading order. Each message has a role indicator (dot + "You"/"AI"), a timestamp, and the full text. The active message has a red left border accent. The bottom of the timeline shows a long AI response that continues below the fold, and there is a visible red accent border at the bottom of the viewport -- this appears to be the bottom of the panel or a status indicator.

**Interaction problems**:
- **The timeline panel replaced the inspector with no transition between them.** In the code, they are separate components positioned at the same location (right side). Toggling timeline likely caused the inspector to slide out and timeline to slide in simultaneously, but since both use the same CSS transition, they may have collided visually.
- **The red left-border on the active message is the only visual affordance for "current position."** There is no scroll-into-view animation visible. The message just has a red bar.
- **Message entries have no entrance stagger.** When the panel opens, all messages appear simultaneously. For a panel that could contain dozens of messages, a quick stagger (0.02s per item, capped at 10 items visible) would create a satisfying "unfurling" effect.
- **The red bar at the viewport bottom is concerning.** If that is clipped panel content, the overflow handling needs attention. If it is intentional, it needs context.

**Motion prescriptions**:
1. Timeline open: panel slides in (existing), then messages stagger from top with y:12 + opacity:0 -> settled, 0.02s stagger, capped so the animation completes in under 0.4s total regardless of message count.
2. When clicking a message to navigate, the red left-border should animate: the bar on the old message fades/shrinks (0.15s) while the new message's bar grows in (0.15s). Currently it just jumps.
3. Auto-scroll to active message should be animated (smooth scroll behavior), not instant.

### dc-08-zoomed.png — Zoomed Detail

**What I see**: The graph zoomed in significantly. Nodes are much larger now. The node materials are visible in detail: the user node shows its radial gradient fill, specular highlight, core dot with its own gradient, and drop shadow. The AI nodes show their concentric ring treatment, inner refraction ring, model color tint. Labels are fully readable. The memory shelf is visible on the left (open, showing "Memories" header). The timeline panel is still open on the right. The bottom AI node has a red selection glow.

This is the most revealing screenshot. At this zoom level:

**Interaction observations**:
- **The node materials ARE working.** The multi-layer treatment (radial gradient, specular, core dot, rim light) is visible and looks good. The "precious specimen" quality Andrew wanted is present at this zoom level. The problem is that at default zoom (dc-02, dc-03) these details are invisible -- the nodes are too small.
- **The AI node concentric rings are visible.** The double-bezel treatment (outer ring + inner refraction ring) reads clearly. The model color tint is very subtle but present.
- **Labels are clear at this zoom.** "What makes a great design s...", "A great design system addresse...", "Tell me more about token sy...", "Token systems are the measure..." -- truncation is working, readable.
- **The memory shelf (left) is open but empty.** Shows "Memories" header. No saved memories yet. The empty state text is not visible at this crop.
- **The edges at this zoom level show their curvature.** The bezier curves connecting nodes are visible and have the subtle glow underlayer. This looks much better than at default zoom.
- **The vignette effect at this zoom creates a nice depth-of-field analog.** Nodes near the center are in the "bright zone" while the periphery darkens. This is working well as an ambient effect.

**The core "too small" problem is now clear**: The default zoom level (scale ~1.0) makes nodes about 36-44px diameter. The material work, the layering, the gradients -- none of it reads at that size. The product looks like colored dots on a dark background. At 2-3x zoom, it looks like a premium spatial interface. The default experience needs to either:
  a. Start at a higher zoom level
  b. Make nodes larger (increase NODE_R_USER and NODE_R_AI)
  c. Add a "zoom to fit with padding" that frames content more tightly
  d. All of the above

**Motion prescriptions for zoom/scale**:
1. Initial zoom after first message should frame the nodes with generous padding but at a scale where the materials are visible. Current fit-to-view calculates minimum bounding scale -- it should target a scale where node radius is at least 30px on screen (meaning if NODE_R_AI is 22, the canvas scale should be at least 1.36).
2. LOD transitions should be GSAP-driven. When zooming past a LOD threshold, labels should fade in with dc-reveal (0.2s) rather than popping. Currently the LOD crossfade zone handles this with linear interpolation, but it is applied per-frame with no transition -- it is a function of zoom level, not an animated value.
3. Mousewheel zoom should have slight momentum/inertia. Currently each wheel tick multiplies by 0.94 or 1.06. Adding a brief GSAP tween (0.1s, power2.out) from current scale to target scale would make zooming feel physical rather than stepped.

---

## Part 0.5: Revised Priority Assessment (Post-Visual Review)

The screenshots shift the priority order from the original code-only audit:

**P0 (Blocks quality perception)**:
1. Empty state breathing/invitation -- the void is hostile
2. Node size / default zoom -- materials are invisible at default scale
3. Action confirmations (copy, save memory, branch) -- silent actions erode trust
4. Context menu entrance/exit -- primary interaction surface has zero craft

**P1 (Significantly improves feel)**:
5. Edge draw-on animations -- the graph should feel constructed, not spawned
6. Streaming completion ceremony -- the most frequent "moment" has no payoff
7. Floating toolbar entrance/exit -- contextual UI should arrive/depart with intention
8. Node entrance differentiation (user vs AI) -- currently identical springEase for both

**P2 (Polish layer)**:
9. Panel slide-in orchestration (stagger children, not just slide the container)
10. Timeline message stagger and active-message transition
11. Temporal luminance gradient on older nodes
12. Selection handoff animation (old glow fades, new glow appears)

**P3 (RPG moments -- implement after P0-P2 land)**:
13. "Loot Acquired" memory save
14. "Branch Created" ceremony
15. "Quest Begin" first-message sequence
16. "Level Up" milestones

---

## Part 1: Current State Inventory

Every transition, animation, and state change in the codebase, cataloged by mechanism.

### A. requestAnimationFrame (rAF) Loop — `GraphCanvas.tsx` + `effects.ts`

The entire canvas runs on a single imperative rAF loop that reads from Zustand stores directly (no React re-renders). This is the performance-critical path.

| Effect | File | Mechanism | Duration | Easing | Notes |
|--------|------|-----------|----------|--------|-------|
| Node entrance scale | effects.ts:96-102 | `springEase()` hand-rolled | 0.7s | elastic overshoot (peaks ~1.15) | `Math.pow(2, -8*t) * sin(...)` |
| Ripple expansion | effects.ts:113-118 | rAF tick, age 0->1 | 0.8s outer, 1.2s inner | easeOutCubic | Double-ring, stroke-width decay |
| Drag trails | effects.ts:121-127 | rAF tick, age 0->1 | ~0.56s (age += dt*1.8) | Linear decay | Glowing dots, size falloff |
| Screen shake | effects.ts:140-148 | rAF tick, sin-based displacement | 0.35s | Linear decay | Triggered on new node entrance |
| Streaming pulse | effects.ts:151-154 | Continuous sin oscillation | Perpetual | sin(time*8) | Opacity 0.3-1.0, red accent halo |
| Selection breathing ring | GraphCanvas:383-384 | sin(time*3) | Perpetual | Sinusoidal | Outer ring radius oscillates |
| Path trace breathing | GraphCanvas:392-393 | sin(time*4) | Perpetual | Sinusoidal | Opacity oscillates 0.4-0.6 |
| Edge dash animation | GraphCanvas:239 | selDashRef -= dt*30 | Perpetual | Linear | Per-type speed multipliers |
| Auto-pan animation | GraphCanvas:577-594 | rAF lerp | 400ms (default) | easeOutCubic | `animateTo()` in ui-store |
| Grid redraw | GraphCanvas:115-144 | Canvas 2D on every frame | N/A | N/A | Dot grid with scale-aware radius |
| LOD crossfade | GraphCanvas:39-50 | Scale-based threshold | N/A | Linear interpolation | 5% crossfade zone per LOD level |

### B. CSS Transitions

| Element | Property | Duration | Easing | File |
|---------|----------|----------|--------|------|
| SessionPill state (collapsed/peek/open) | `all` | 0.3s | `cubic-bezier(0.16, 1, 0.3, 1)` | SessionPill:100 |
| SessionPill phase dot | `background` | 0.3s | default | SessionPill:118 |
| Inspector slide-in | `transform` | 0.2s | `cubic-bezier(0.16, 1, 0.3, 1)` | Inspector:34 |
| Timeline slide-in | `transform` | 0.25s | `cubic-bezier(0.16, 1, 0.3, 1)` | TimelineView:49 |
| MemoryShelf slide-in | `transform` | 0.25s | `cubic-bezier(0.16, 1, 0.3, 1)` | MemoryShelf:84 |
| FloatingInput width expand | `all` | 0.3s | `cubic-bezier(0.16, 1, 0.3, 1)` | FloatingUI:259 |
| FloatingInput padding/radius | `all` | 0.3s | `cubic-bezier(0.16, 1, 0.3, 1)` | FloatingUI:267 |
| FloatingInput font-size | `font-size` | 0.2s | default | FloatingUI:288 |
| FloatingInput send color | `color` | 0.2s | default | FloatingUI:304 |
| InputBar border-color | `border-color` | 0.2s | default | InputBar:143 |
| Timeline item background | `background` | 0.15s | default | TimelineView:100 |
| ClipCreator all | `all` | 0.2s | `cubic-bezier(0.16, 1, 0.3, 1)` | ClipCreator:87 |
| ToolCard chevron rotation | `transform` | 0.15s | default | ToolCard:72 |
| Drag hotspot opacity | `opacity` | 0.2s | default | GraphCanvas:874 |

### C. Inline JS Style Mutations (No Transition)

These use `onMouseEnter`/`onMouseLeave` to set `style.background` directly. No transition, no easing. Instant state changes.

| Element | Property | Trigger | File |
|---------|----------|---------|------|
| ContextMenu MenuItem | background | hover | ContextMenu:263 |
| SessionPill "New Session" row | background | hover | SessionPill:166-167 |
| SessionPill session row | background | hover | SessionPill:189-190 |
| BranchPreview branch row | background | hover | BranchPreview:80-81 |
| FloatingUI model dropdown item | background | hover | FloatingUI:92-93 |
| FloatingUI ToolBtn | background | hover | FloatingUI:148-149 |
| FloatingUI TopControls buttons | N/A | N/A | No hover effect at all |
| MemoryShelf memory card | borderColor | hover | MemoryShelf:141-142 |
| LearnOverlay mode buttons | borderColor | hover | LearnOverlay:245-246 |
| LearnOverlay follow-up buttons | borderColor | hover | LearnOverlay:293-294 |

### D. No Animation at All

These state changes happen instantly with zero visual feedback:

| Action | What Happens | Missing Feedback |
|--------|-------------|-----------------|
| Context menu open | Appears at click position | No scale-in, no fade-in, just pops |
| Context menu close | Disappears | No exit animation |
| Node selection | Glow appears in next rAF frame | No transition from unselected to selected state |
| Node deselection | Glow disappears | No fade-out |
| "Copy text" action | Nothing visible | No confirmation |
| "Save as memory" action | Nothing visible | No confirmation, no feedback |
| "Branch from here" action | Nothing visible | No visual acknowledgment |
| Clip creation (Save button) | Pill disappears | No success state, no celebration |
| Learn overlay open | Instant | No backdrop fade, no panel scale-in |
| Learn overlay close | Instant | No exit animation |
| Shortcuts help open | Instant | No fade-in |
| Shortcuts help close | Instant | No fade-out |
| Fit-to-view (Space) | Transform jumps | No animated zoom, just instant |
| Zoom (mousewheel) | Scale updates per frame | No momentum, no snap |
| Branch preview popover | Appears after 500ms timeout | No entrance animation when it arrives |
| Model selector dropdown open | Instant | No scale/fade entrance |
| Model selector dropdown close | Instant | No exit animation |
| Session create | Instant | No new-session ceremony |
| Session delete | Instant | No exit animation |
| Session switch | Instant | No transition between sessions |
| Multi-select toggle | Ring appears/disappears | No add/remove animation |
| Dead-end dimming | Opacity changes on next rAF | No fade transition |
| Highlight mode activation | Instant opacity changes | No transition from full to dimmed |
| Regeneration (new AI node) | Node pops in via entrance | Same as any node, not special |
| Hotspot drop (Learn/Remember) | Action fires, no visual | No drop confirmation animation |
| Streaming start | Pulse begins | No "thinking initiated" moment |
| Streaming complete | Pulse stops, label updates | No "response complete" moment |

---

## Part 2: GSAP Migration Priorities

### Priority 0 — Foundation (do first, enables everything)

**Create `src/lib/gsap-setup.ts`**

Register GSAP plugins once, define custom eases, export configured instance.

```typescript
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(CustomEase);

// Custom Dreamcatcher eases — see Part 5 for curve definitions
CustomEase.create('dc-settle', 'M0,0 C0.14,0 0.27,0.55 0.34,0.85 0.38,1.01 0.44,1.08 0.5,1.08 0.58,1.08 0.62,1.02 0.68,0.99 0.78,0.96 0.88,1 1,1');
CustomEase.create('dc-breathe', 'M0,0 C0.4,0 0.2,1 0.5,1 0.8,1 0.6,0.85 1,0.85');
CustomEase.create('dc-snap', 'M0,0 C0.12,0 0.15,1.2 0.3,1.2 0.42,1.2 0.4,0.95 0.5,0.95 0.6,0.95 0.7,1 1,1');
CustomEase.create('dc-reveal', 'M0,0 C0.05,0 0.15,1 0.3,1 0.5,1 0.7,1 1,1');

export { gsap, useGSAP };
```

### Priority 1 — Node Entrances (HIGH IMPACT, replaces `springEase`)

**Current**: Hand-rolled `springEase()` in rAF loop. Scale interpolates from 0 to 1 with elastic overshoot.

**Problem**: The spring function is decent but can't be tuned without code changes. No secondary motion (opacity, filter, glow bloom). Same entrance for every node type.

**GSAP replacement**: Do NOT move this out of the rAF loop. Instead, use GSAP to drive a simple numeric value that the rAF loop reads.

```
Approach: gsap.to() targeting a plain object { scale: 0, opacity: 0, glowRadius: 0 }
stored per-node in the entrances Map. The rAF loop reads these values during render.
This keeps the SVG imperatively rendered (performance) while GSAP handles the easing.
```

**User node entrance** — "Item Placed":
```
Duration: 0.6s
Properties:
  scale:      0 -> 1        ease: dc-settle (overshoot to 1.08, settle)
  opacity:    0 -> 1        ease: power2.out, duration 0.2s
  glowRadius: 0 -> 40 -> 0  ease: power2.out, duration 0.8s
Secondary:
  Screen shake: intensity 4, duration 0.25s, decay exponential
  Ripple: centered on node, maxRadius 80, color T.primary at 15% opacity
```

**AI node entrance** — "Summoning":
```
Duration: 0.7s
Properties:
  scale:      0 -> 1        ease: dc-settle
  opacity:    0 -> 1        ease: power2.out, delay 0.1s
  innerGlow:  0 -> 1 -> 0.3  ease: power3.out (red accent wash, fades to idle)
Secondary:
  Outer ring draws on: strokeDashoffset from full to 0 over 0.5s
  Subtle radial burst: 3 thin circles expanding outward, staggered 0.05s
  Screen shake: intensity 2 (less than user), duration 0.2s
```

**Branch point promotion** — when a node gains its second child:
```
Duration: 0.5s
Properties:
  Morph circle to hexagon (SVG path interpolation via MorphSVG or manual)
  scale: 1 -> 1.1 -> 1     ease: dc-snap
  stroke-width: 1.5 -> 2.5 -> 1.5  ease: power2.inOut
Secondary:
  Branch lines pulse from origin outward
  Badge count appears with scale-in (0 -> 1, dc-snap, 0.3s)
```

### Priority 2 — Panel Slide-ins (MEDIUM IMPACT, replaces CSS transitions)

**Current**: CSS `transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)` on Inspector, Timeline, MemoryShelf.

**Problem**: CSS transitions can't orchestrate stagger effects, can't animate child content, can't add secondary motion. Also, `all` transitions are a performance footgun.

**GSAP replacement** using `useGSAP` hook:

**Inspector panel open**:
```
Timeline (sequential):
  1. Panel slides in:      translateX(100%) -> translateX(0)   0.3s  dc-reveal
  2. Header fades in:      opacity 0 -> 1                      0.15s power2.out  delay 0.1s
  3. Content staggers in:  y: 12 -> 0, opacity 0 -> 1          0.2s each, stagger 0.04s
  4. Action buttons:       scale 0.8 -> 1, opacity 0 -> 1      0.2s  dc-snap  delay 0.2s
```

**Inspector panel close**:
```
Timeline:
  1. Content fades:   opacity 1 -> 0   0.1s  power2.in
  2. Panel slides:    translateX(0) -> translateX(100%)  0.2s  power2.in
```

**Timeline panel** — same pattern but from right, wider (400px):
```
Open:  panel 0.3s dc-reveal, then messages stagger in from bottom (y:20, stagger 0.03s)
Close: messages fade 0.1s, panel slides 0.2s power2.in
```

**MemoryShelf** — from left:
```
Open:  panel 0.25s dc-reveal, search bar drops in 0.15s delay, memories stagger 0.04s
Close: reverse, 0.15s total
```

### Priority 3 — Context Menu (HIGH IMPACT, currently zero animation)

**Current**: Pops into existence at click coordinates. Disappears instantly.

**GSAP replacement**:

**Open**:
```
Timeline:
  1. Container:  scale(0.85) -> scale(1), opacity 0 -> 1   0.2s  dc-snap
                 transformOrigin: top-left (at click point)
  2. Menu items: y: -8 -> 0, opacity 0 -> 1                0.15s each  stagger 0.03s  power2.out
  3. Dividers:   scaleX(0) -> scaleX(1)                     0.1s  power2.out  delay 0.12s
```

**Close**:
```
  Container: scale(1) -> scale(0.95), opacity 1 -> 0   0.12s  power2.in
```

**Menu item hover** — add GSAP-driven micro-interaction:
```
  Background: 0 -> E[6]   0.1s  power1.out
  Item content: x: 0 -> 3px  0.15s  power2.out  (subtle rightward nudge)
  Icon: scale 1 -> 1.15    0.15s  dc-snap
```

### Priority 4 — SessionPill State Transitions (MEDIUM IMPACT)

**Current**: CSS `transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1)` handles width and maxHeight changes. Peek/open content just appears.

**GSAP replacement**:

**Collapsed -> Peek**:
```
Timeline:
  1. Width: 160 -> 280     0.3s  dc-reveal
  2. Session list: y: -10 -> 0, opacity 0 -> 1  stagger 0.05s  0.2s  power2.out  delay 0.1s
```

**Peek -> Open**:
```
Timeline:
  1. Width: 280 -> 340, borderRadius: 10 -> 14   0.25s  dc-reveal
  2. "New Session" button: y: -8, opacity 0 -> visible  0.2s  power2.out  delay 0.1s
  3. Session list: stagger in from top  0.04s each  0.2s  power2.out
```

**Open -> Collapsed**:
```
  All content fades 0.1s, then width collapses 0.2s power2.in
```

### Priority 5 — Canvas Auto-Pan (LOW PRIORITY, current implementation is fine)

**Current**: rAF loop with easeOutCubic interpolation, 400ms.

**GSAP option**: Could use `gsap.to()` targeting panX/panY in the store, but the current approach integrates cleanly with the rAF loop. Recommend keeping as-is unless we want to add bounce or more complex easing.

**One improvement**: The fit-to-view (Space key) currently jumps instantly. This should animate:

```
Fit-to-view animation:
  scale + panX + panY: current -> calculated   0.6s  dc-settle
  (use gsap.to() on a proxy object, rAF loop reads from it)
```

### Priority 6 — Edge Draw-On Animations (MEDIUM IMPACT, currently none)

**Current**: Edges appear fully drawn when their nodes exist. No draw-on effect.

**GSAP replacement**:

```
New edge appears:
  stroke-dasharray: [totalLength, totalLength]
  stroke-dashoffset: totalLength -> 0   0.4s  dc-reveal

  For branch edges: offset animates with a slight overshoot (dc-snap)
  For reply edges: smooth draw-on (dc-reveal)
  For regeneration edges: fast draw with red flash (0.2s, ACCENT glow)
```

**Implementation note**: SVG path lengths must be calculated. Since edges are re-rendered every frame in the rAF loop, the animation would store a `drawProgress: 0->1` value per-edge that GSAP drives, and the render function uses it to set dashoffset.

---

## Part 3: Missing Feedback Catalog

### Critical Missing Feedback

| Action | Current State | Required Feedback |
|--------|--------------|-------------------|
| **Copy text** | Nothing. User has no idea if it worked. | Toast notification: "Copied" — slides in from top, auto-dismisses 2s. Accent border flash on the copied content. |
| **Save as memory** | Nothing. Silently saves. | "Loot acquired" animation (see Part 4). Memory shelf button pulses once. If shelf is visible, new memory card slides in with glow. |
| **Branch from here** | Input bar focuses. No visual connection to the node. | Accent-colored line briefly pulses from the branched node to the input bar. Input bar border flashes accent. "BRANCH" badge does a subtle scale-up (dc-snap). |
| **Streaming complete** | Pulse simply stops. Label updates. | "Response arrived" ceremony (see Part 4). Quick scale-pulse on the node (1 -> 1.05 -> 1, 0.3s). Streaming halo dissolves outward rather than vanishing. |
| **Streaming start** | Empty AI node appears with "..." label. | Node should fade in with a "conjuring" effect: inner glow intensifies, concentric rings pulse outward from center. |
| **Regeneration** | New node pops in identically to any other. | Regeneration should feel like a "re-roll": brief spin animation on the regen icon, the new node entrance has a red-accent chromatic tint. |
| **Hotspot drop (Learn)** | Action fires, node snaps back. | Drop confirmation: node briefly scales up (1.2x) at drop zone, zone flashes accent, then node returns to position. If learn overlay opens, it should connect visually to the drop point. |
| **Hotspot drop (Remember)** | Action fires, node snaps back. | Memory icon briefly appears at drop zone, scales in then fades. Memory shelf button pulses. |
| **First message in session** | Node pair appears normally. | "Session begin" ceremony (see Part 4). First user node has a slightly larger entrance, first AI node has an anticipatory glow before appearing. |
| **Error state** | Text becomes "[Error: ...]" | Red flash on node border. Error icon appears. Node shakes briefly (reuse screen shake at lower intensity). |
| **Node hover** | Stroke color changes instantly | Stroke should transition over 100ms. Specular highlight should brighten gradually. Subtle scale-up (1 -> 1.03, 150ms, dc-settle). |
| **Node drag start** | No feedback beyond position change. | Brief scale-up (1 -> 1.06, 100ms), elevation increase (shadow deepens), opacity of connected edges increases. |
| **Node drag end / drop** | Node released, snaps to physics | Scale returns (1.06 -> 1, 200ms dc-settle). Brief "landing" ripple at final position. |
| **Multi-select toggle** | Dashed ring appears/disappears | Ring should scale-in (0 -> 1, 0.2s, dc-snap) when added, scale-out when removed. |
| **Model change** | Model icon updates | Brief icon transition: old icon fades/scales down, new icon scales up. Model color tint on AI nodes should pulse once. |

### Nice-to-Have Feedback

| Action | Suggested Feedback |
|--------|-------------------|
| Zoom to threshold (LOD change) | Subtle "snap" feeling at LOD boundaries. Labels could stagger-fade rather than appearing uniformly. |
| Path trace step | Current node pulses on arrival. Brief flash-line along the edge connecting previous to current step. |
| Session switch | Old graph dissolves outward (scale up + fade), new graph condenses inward (scale down + fade in). |
| Keyboard shortcut activation | Brief flash indicator near the shortcut key display (if ShortcutsHelp is not open, a subtle HUD flash at screen edge). |

---

## Part 4: RPG-Inspired Motion Language

The core metaphor: Dreamcatcher is a **living specimen tray** where thoughts are **precious artifacts**. Every user action should carry the weight of intentionality, and every AI response should arrive with the ceremony of something being conjured.

### Moment Catalog

#### "Item Placed" — User creates a node (sends a message)

**Feel**: The deliberate placement of a specimen under the microscope. Weighty, precise, satisfying.

```
Sequence (total ~0.8s):
  1. Input bar text dissolves upward (letters stagger-fade, y: 0 -> -8, 0.2s)
  2. At the position where the node will appear:
     - Convergence: 4 small dots rush inward from 60px away toward center (0.25s, dc-snap)
     - Node materializes at center: scale 0 -> 1 (0.5s, dc-settle)
     - Radial gradient brightens from center outward (0.3s, power2.out)
  3. Screen shake: intensity 3, 0.2s
  4. Ripple: single ring, 100px radius, T.primary at 12% opacity
  5. Edge draws on from parent to this node (0.4s, dc-reveal, slight delay 0.15s)
```

#### "Summoned" — AI response arrives (streaming completes)

**Feel**: Something materializing from the ether. Less weighty than user placement, more ethereal, with a sense of arrival.

```
Sequence — two phases:

Phase A: Streaming (while text is arriving):
  - Node has an inner glow that pulses with ACCENT (existing, but enhance):
    Pulsing concentric dashed rings, slight rotation (1 revolution per 3s)
    Inner fill opacity oscillates subtly (0.03 -> 0.06 -> 0.03)

Phase B: Completion (text done, label updates from "..."):
  Duration: 0.5s total
  1. Streaming rings accelerate briefly then dissolve outward (0.3s, power2.out)
  2. Node border flashes bright once: stroke-opacity 0.6 -> 1 -> 0.6 (0.2s)
  3. Node scale: subtle pulse 1 -> 1.06 -> 1 (0.3s, dc-settle)
  4. Model color tint inside node intensifies briefly (0.04 -> 0.12 -> 0.04, 0.4s)
  5. Label text fades in from "..." to actual label (0.2s, power2.out)
```

#### "Loot Acquired" — Memory saved

**Feel**: Finding a rare item. Brief, bright, unmistakable. Like a chest opening in an RPG.

```
Sequence (total ~1.0s):
  1. At the source node:
     - Brief flash: node fill brightens (all luminance values +15% for 0.15s)
     - Small icon (memory/chest) scales up from center: 0 -> 1.2 -> 0 (0.5s, dc-snap)
     - 6-8 tiny particles (2px circles) burst outward in random directions (0.6s, power3.out)
       Particles: C.memory color, fade as they travel, radius 30-60px
  2. A "trail" line draws from the node toward the memory shelf button:
     - Curved bezier path, 0.4s, dc-reveal
     - Trail is C.memory at 30% opacity, 1px, dissolves after drawing
  3. Memory shelf button:
     - Scale pulse: 1 -> 1.15 -> 1 (0.3s, dc-snap, delay 0.4s)
     - Count badge increments with a flip animation
     - If shelf is open: new memory card slides in from left with glow border
```

#### "Branch Created" — Forking the conversation

**Feel**: A decisive split. The moment should feel like choosing a path in a dungeon. Consequential, directional.

```
Sequence (total ~0.7s):
  1. At the branch point node:
     - If first branch (circle -> hex promotion): morph shape over 0.4s (dc-snap)
     - Hex rotates 30 degrees during morph (visual flourish)
     - Branch count badge appears: scale 0 -> 1 (0.3s, dc-snap)
     - Two brief flash-lines emanate from the node at divergent angles (0.3s)
  2. New branch edge draws on with C.branch color, slightly thicker for 0.5s, then settles to normal
  3. Input bar:
     - "BRANCH" tag does a horizontal slide-in from left: x: -20 -> 0, 0.2s, dc-snap
     - Bar border color transitions to C.branch for 0.5s, then back to default
  4. Camera: auto-pan to the branch target starts immediately (existing animateTo)
```

#### "Level Up" — Session reaches milestones

Trigger: 10 nodes, 25 nodes, 50 nodes, first branch, first memory save, first regeneration.

```
Sequence (total ~1.5s, subtle, does not interrupt flow):
  1. Status bar milestone text fades in: "10 nodes" with a brief gold/warm tint
  2. Very subtle full-canvas pulse: vignette darkens slightly then returns (0.5s, power2.inOut)
  3. A thin ring expands from center of viewport outward (200px -> viewport edge, 0.8s)
     Color: T.primary at 5% opacity — barely visible, subliminal
  4. Session pill briefly glows its top border brighter (0.3s)
```

#### "Power-Up" — Model changed / capability shift

```
Sequence (0.4s):
  1. Old model icon: scale 1 -> 0.8, opacity 1 -> 0 (0.15s, power2.in)
  2. New model icon: scale 0.8 -> 1, opacity 0 -> 1 (0.2s, dc-snap)
  3. All AI nodes on canvas: model tint briefly shifts to new model color
     (0.1s pulse at 8% opacity, then returns to 4%)
  4. Status bar model indicator: color crossfade (0.3s)
```

#### "Quest Begin" — First message in a fresh session

```
Sequence (1.2s, only on truly empty canvas):
  1. Canvas vignette tightens slightly (spotlight effect, 0.5s)
  2. Grid dots near the first node brighten (parallax — closer = brighter, 0.3s)
  3. First user node entrance is 1.3x the normal scale-up amplitude
  4. First edge draws on slower (0.6s instead of 0.4s)
  5. First AI node has an extended "conjuring" sequence:
     - Pre-glow: a soft ACCENT wash appears at the position 0.2s before the node
     - Node fades in through the glow
  6. After first exchange completes:
     - Session pill shows session name with a typewriter effect (characters stagger 0.03s)
```

#### "Discovery" — Learn mode activated

```
Sequence (0.6s):
  1. Backdrop: opacity 0 -> 0.5 (0.3s, power2.out)
  2. Learn panel: scale(0.92) + y(20px) + opacity(0) -> scale(1) + y(0) + opacity(1)
     Duration: 0.4s, dc-settle, delay 0.1s
  3. Mode buttons: stagger in, 0.05s each, scale 0.9 -> 1 + opacity (dc-snap)
  4. "LEARN MODE" title: typewriter reveal, each character 0.02s
```

#### "Critical Hit" — Error state

```
Sequence (0.5s):
  1. Node border: flash ACCENT red 3 times rapidly (0.05s on, 0.05s off)
  2. Node scale: 1 -> 0.97 -> 1 (recoil, 0.2s)
  3. Very brief screen shake: intensity 2, 0.15s
  4. Error text fades in with red tint (0.2s)
```

---

## Part 5: Custom GSAP Eases

Four eases that define Dreamcatcher's motion vocabulary. Each serves a distinct emotional purpose.

### `dc-settle`
**Purpose**: The default "things landing in place" ease. Node entrances, panel arrivals, elements reaching their final position. Has slight overshoot that communicates physicality — things have mass, they don't just appear.

```
Curve: Overshoots to ~108%, then settles to 100%
CSS equivalent (approximate): cubic-bezier(0.34, 1.56, 0.64, 1)
GSAP CustomEase path:
  M0,0 C0.14,0 0.27,0.55 0.34,0.85 0.38,1.01 0.44,1.08 0.5,1.08 0.58,1.08 0.62,1.02 0.68,0.99 0.78,0.96 0.88,1 1,1

Behavior:
  0.0s — start
  0.3s — reaches ~85% of target
  0.4s — overshoots to ~108%
  0.6s — settles back through 99%
  0.7s — arrives at 100%

Duration guidance: 0.4-0.7s
Use for: node entrances, panel slides, fit-to-view, element placement
```

### `dc-breathe`
**Purpose**: Continuous living motion. The "alive" feeling. Selection rings, streaming indicators, idle ambient oscillations. Not a one-shot ease — this is the envelope shape for looping animations.

```
Curve: Fast rise to peak, slow descent to ~85%, holds
CSS equivalent: N/A (looping)
GSAP CustomEase path:
  M0,0 C0.4,0 0.2,1 0.5,1 0.8,1 0.6,0.85 1,0.85

Behavior (one cycle):
  0.0 — at minimum
  0.5 — reaches maximum smoothly
  1.0 — returns to 85% (not zero — it "breathes" between 85-100%)

Implementation: gsap.to(target, { keyframes: { '50%': { value: 1 }, '100%': { value: 0.85 } }, repeat: -1, ease: 'dc-breathe' })
Duration guidance: 1.5-3s per cycle
Use for: selection halo, streaming pulse, idle node ambient glow
```

### `dc-snap`
**Purpose**: Decisive, confident motion. Things clicking into place. Badge appearances, branch promotions, toggle states. Overshoots more aggressively than dc-settle, then locks in.

```
Curve: Sharp overshoot to ~120%, quick correction to 95%, locks at 100%
CSS equivalent (approximate): cubic-bezier(0.15, 1.6, 0.4, 0.95)
GSAP CustomEase path:
  M0,0 C0.12,0 0.15,1.2 0.3,1.2 0.42,1.2 0.4,0.95 0.5,0.95 0.6,0.95 0.7,1 1,1

Behavior:
  0.0s — start
  0.15s — reaches 100%, keeps accelerating
  0.25s — peaks at 120% (aggressive overshoot)
  0.4s — corrects to 95% (slight undershoot)
  0.6s — arrives at 100% and holds

Duration guidance: 0.2-0.4s
Use for: badges, context menu items, button presses, toggling elements, "click" moments
```

### `dc-reveal`
**Purpose**: Content appearing, drawing on, unveiling. No overshoot — just a smooth, confident entrance that starts fast and decelerates to a gentle stop. The "curtain rising" ease.

```
Curve: Very fast initial movement (~60% in first 30% of time), long deceleration tail
CSS equivalent (approximate): cubic-bezier(0.05, 0.7, 0.15, 1)
GSAP CustomEase path:
  M0,0 C0.05,0 0.15,1 0.3,1 0.5,1 0.7,1 1,1

Behavior:
  0.0s — start
  0.1s — already at ~60%
  0.2s — at ~90%
  0.5s — at ~98%
  1.0s — 100% (the long tail is barely perceptible but creates smoothness)

Duration guidance: 0.2-0.5s
Use for: edge draw-on, text fade-in, panel content reveal, backdrop fade, opacity transitions
```

---

## Part 6: Implementation Order (Revised Post-Visual Review)

The screenshots fundamentally shifted priorities. The empty state, node scale, and silent
actions are more damaging to perceived quality than the canvas animation refinements.

### Phase 1 — Foundation + The Void Problem (1-2 sessions)
1. Create `gsap-setup.ts` with registered custom eases
2. **Empty state life**: breathing vignette, input bar border pulse, ghost crosshair at center
3. **Node scale fix**: increase NODE_R_USER to 24, NODE_R_AI to 28. Adjust fit-to-view
   to target minimum 30px rendered node radius. Consider starting at scale 1.2.
4. **Context menu GSAP**: scale-in from click origin, staggered items, fade-out on close
5. **Action confirmation toasts**: a lightweight toast component using GSAP for slide-in/out.
   Apply to copy, save-memory, branch-from-here.

### Phase 2 — The Graph Should Feel Constructed (2-3 sessions)
6. **Edge draw-on animations**: strokeDashoffset driven by GSAP per new edge
7. **Streaming completion ceremony**: pulse + dissolve-outward on streaming halo
8. **Floating toolbar entrance/exit**: scale-in on selection, scale-out on deselection
9. **Node entrance differentiation**: user "Item Placed" vs AI "Summoning" (different
   eases, secondary effects)
10. **Fit-to-view animation**: Space key triggers 0.6s dc-settle zoom instead of instant jump

### Phase 3 — Panel Orchestration (1-2 sessions)
11. Inspector/Timeline/MemoryShelf: GSAP timelines replacing CSS transitions.
    Panel slides, then children stagger in. Content fades before panel slides out.
12. Timeline active-message transition: red bar animates between messages
13. Context menu hover micro-interactions: nudge, icon scale
14. SessionPill GSAP state transitions with child content stagger

### Phase 4 — Temporal Depth + Selection Craft (1 session)
15. Temporal luminance gradient: older nodes slightly dimmer
16. Selection handoff: old glow fades (0.3s) while new glow emerges
17. Node hover transitions: 100ms stroke brightness, subtle 1.03x scale
18. Mousewheel zoom momentum: GSAP micro-tween per wheel event (0.1s)
19. LOD label fade: dc-reveal when crossing LOD thresholds while zooming

### Phase 5 — RPG Moments (1-2 sessions)
20. "Loot Acquired" — memory save particle burst + trail to shelf
21. "Branch Created" — hex morph, divergent flash lines, BRANCH tag slide-in
22. "Quest Begin" — first-message ceremony (spotlight, extended entrance, typewriter session name)
23. "Level Up" — milestone moments (10/25/50 nodes, first branch, first memory)

### Phase 6 — Ambient Life (1 session)
24. Replace sin-based breathing with GSAP dc-breathe loops
25. Streaming "conjuring" enhancement (concentric rings, rotation)
26. Idle canvas presence (very subtle grid breathing, focal warmth near nodes)
27. Node drag micro-interactions: scale-up on grab, landing ripple on release

---

## Files Referenced

- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/lib/effects.ts` — rAF effects system, springEase, ripples, entrances, shake
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/lib/theme.ts` — elevation stack, colors, glass styles
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/canvas/GraphCanvas.tsx` — main canvas, rAF loop, SVG render, mouse handlers
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/ContextMenu.tsx` — right-click menu, zero animation
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/SessionPill.tsx` — CSS transition state machine
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/FloatingUI.tsx` — floating input, model selector, canvas tools
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/Inspector.tsx` — CSS slide-in panel
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/TimelineView.tsx` — CSS slide-in panel
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/MemoryShelf.tsx` — CSS slide-in panel
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/LearnOverlay.tsx` — zero entrance/exit animation
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/ClipCreator.tsx` — CSS transition, no success state
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/PathTrace.tsx` — no step transition animation
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/BranchPreview.tsx` — no entrance animation
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/ToolCard.tsx` — chevron rotation only
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/StatusBar.tsx` — static, no animation
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/components/ui/ShortcutsHelp.tsx` — no entrance/exit animation
- `/Users/az/Desktop/Code  - Node Based Design System/dreamcatcher/src/stores/ui-store.ts` — animTarget, state management
