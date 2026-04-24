# Dreamcacher Design Roadmap

**Author**: Design Chief (Forty Thieves)
**Date**: 2026-03-25
**Status**: Plan approved, ready for execution
**Input**: Full code review (35 source files), 6 screenshots, VISUAL-CRITIQUE.md, UX-AUDIT.md, DESIGN-AUDIT-2.md, VISUAL-MANIFESTO.md, MOTION-SPEC.md, Bumba-Dark.json

---

## Current State Assessment

The architecture is strong: spatial graph with physics simulation, branching, sessions, memory/clips, LOD-aware rendering, path tracing, per-provider AI faction colors, multi-layer node materials (radial gradients, specular highlights, rim lights, core dots), glass panel treatment with directional borders. The conceptual model is genuinely novel.

The visual execution is uneven. Node materials received real attention -- they have 5-layer dimensional treatment, per-provider chromatic washes, hexagonal branch points, streaming halos. But everything around the nodes -- panels, typography, spacing, transitions, empty states, feedback -- is developer scaffolding with inline monospace styling, arbitrary spacing values, and zero motion design. The audits converge at 4.5-5/10 overall.

Andrew's direction: "RPG hero characters on a flat game board. Add delight without overwhelming. Users are at desk jobs all day -- make this the spark."

**What we keep**: Warm-black elevation system (E[0]-E[7]). Red accent (#DD0000) used sparingly. Per-model warm faction colors (amber/green/yellow/orange). Glass treatment with directional borders. Dot grid canvas without noise or vignette (Andrew's decision). Node material layering.

**What must change**: Everything documented below.

---

## Phase 1 -- Foundation

**Goal**: Establish the design token system and global scale that every subsequent phase depends on. No visual feature work until the substrate is right.

**Dependencies**: None. This phase is the prerequisite for everything.

**Estimated scope**: Medium (theme.ts rewrite + sweep across all 15 UI components + layout.tsx font loading)

### 1A. Design Token Expansion in theme.ts

The current theme exports raw hex values and two glass objects. There is no spacing system, no radius system, no type scale, no z-index stack, no timing tokens. Every component uses ad-hoc values.

**Deliverables**:

- **Spacing scale** (`S`): 4, 8, 12, 16, 20, 24, 32. Seven tokens. Every padding, gap, and margin in the codebase maps to one of these. Specific violations to fix:
  - Context menu items: 6/9 -> 8/12
  - Timeline messages: 8/14 -> 8/16
  - Memory shelf items: 8/10 -> 8/12
  - Session pill header: 7/14 -> 8/16
  - Learn overlay body: 14/18 -> 16/20
  - ToolCard header: 5/8 -> 8/12
  - ClipCreator: 6/14 -> 8/16

- **Border radius scale** (`R`): sm=6, md=10, lg=14, xl=18, pill=9999. Five tokens. Specific changes:
  - Inspector action buttons: 4 -> 6 (R.sm)
  - Context menu container: already 12, keep
  - Context menu items: 6 stays (R.sm)
  - Session pill collapsed: 10 stays (R.md)
  - Session pill open: 14 stays (R.lg)
  - Floating input: 12 stays (R.md, do not change on focus -- jarring)

- **Type scale** (`FS`): caption=10, label=11, body=13, title=16, display=20. Five tokens. Floor all text at 10px -- sweep the eleven instances of 8px and 9px across StatusBar, ToolCard, Inspector metadata, Timeline timestamps, BranchPreview metadata, MemoryShelf footer, ContextMenu dividers.

- **Font family tokens** (`FF`): `FF.sans` for UI chrome and reading content, `FF.mono` for data/metadata. See 1C below.

- **Z-index stack** (`Z`): Formalize the current implicit stack. status=40, canvas=10, floating=50, shelf=55, inspector=60, timeline=70, pill=80, pathTrace=90, contextMenu=200, overlay=300. Currently these are scattered as magic numbers across 12 components.

- **Duration and easing tokens** (`DURATION`, `EASE`): instant=100ms, fast=150ms, normal=250ms, slow=400ms. Easing: snap=cubic-bezier(0.16,1,0.3,1), smooth=cubic-bezier(0.4,0,0.2,1), bounce=cubic-bezier(0.34,1.56,0.64,1). A `transition()` helper that combines property + duration + easing into a CSS string.

- **Opacity tokens** (`O`): invisible=0.04, ghost=0.08, dim=0.15, subtle=0.3, medium=0.5, solid=0.7, visible=0.85, full=1.0.

**Definition of done**: `theme.ts` exports all token objects. Zero raw numeric padding/gap/radius/z-index/duration values remain in any component file. Every value traces back to a named token. A `grep` for inline `padding:` or `gap:` values returns zero hits that aren't using token references.

### 1B. Global Scale-Up

The audits unanimously agree: everything is too small. The font range is 8-13px (5px spread). Premium apps use 12-32px (20px spread). The floating input at 320px unfocused feels like a debug field. The panels at 280px are cramped.

**Deliverables**:

- Body text in reading panels (Timeline, Inspector, LearnOverlay): 13px minimum
- Input text in FloatingInput: 14px unfocused, 15px focused (up from 13/14)
- FloatingInput unfocused width: 420 -> 460. Focused width: 560 -> 600
- Inspector panel width: 280 -> 320
- Memory Shelf panel width: 280 -> 320
- Timeline panel width: 400 -> 440
- Panel header text: 11px (up from 9-10)
- StatusBar height: 24 -> 28, text: 10px (up from 9)
- All hit targets verified at 44px minimum (currently violated by: CanvasTools buttons, model dropdown items, SessionPill delete button, MemoryShelf spawn button, PathTrace navigation arrows)

**Definition of done**: No text below 10px anywhere in the application. Primary reading surfaces (Timeline messages, Inspector content, LearnOverlay educational text) at 13px. Input bar feels like a primary action surface, not an afterthought.

### 1C. Font Pairing

Every component currently declares `fontFamily: 'Inconsolata, monospace'` inline. Monospace everywhere makes a spatial thinking tool look like a terminal.

**Deliverables**:

- Add Inter (or Geist Sans) to layout.tsx via Google Fonts link alongside Inconsolata
- Set `body` font-family to `FF.sans` in globals.css
- Remove all ~20 inline `fontFamily` declarations from components (they now inherit)
- Apply `FF.mono` explicitly only where data/metadata semantics require it:
  - Node labels on canvas (GraphCanvas.tsx)
  - Timestamps everywhere
  - Node IDs in Inspector
  - Token counts in StatusBar
  - Keyboard shortcut badges in ShortcutsHelp
  - Model names in StatusBar and model selector
  - Code/JSON content in ToolCard pre blocks
- Conversational content (Timeline messages, Inspector body text, LearnOverlay educational content, FloatingInput placeholder/text) uses Inter
- Panel headers (Timeline, Inspector, MemoryShelf section labels) use Inter at semibold weight

**Definition of done**: Two typefaces visible in the UI. Conversational surfaces feel readable and approachable. Metadata surfaces retain the technical monospace character. The application no longer reads as a terminal emulator.

---

## Phase 2 -- Identity

**Goal**: Make user nodes and AI nodes feel like distinct RPG character classes. The user is the protagonist; AI models are faction-allied companions. Each model provider has a recognizable visual fingerprint.

**Dependencies**: Phase 1 complete (token system provides spacing, radii, type scale that Phase 2 components use).

**Estimated scope**: Large (GraphCanvas.tsx node rendering, models.ts expansion, effects.ts additions, new SVG gradient definitions)

### 2A. Node Rarity System

Currently every user node looks identical to every other user node. Every AI node is the same glass vessel. Conversations have structure -- some nodes are openers, some are deep in a 40-message thread, some are branch points, some are dead ends, some are breakthroughs. The visual system should encode this.

**Deliverables**:

- **Tier 0 -- Common** (depth 0-2, leaf nodes): Current treatment. Radial gradient fill, specular highlight, rim light, core dot. No additions. This is the baseline.

- **Tier 1 -- Uncommon** (depth 3-8, or branch points with 2 children): Add a single thin orbit ring -- a short dashed arc that rotates slowly around the node at r+6. One SVG circle with a stroke-dasharray creating a single arc segment, driven by timeRef. Rotation speed: 8 units/sec. Opacity 0.3. This signals "this node has accumulated context."

- **Tier 2 -- Rare** (depth 9-20, or branch points with 3+ children, or clip nodes): Add 3-5 micro-dot particles orbiting at varying distances (r+8 to r+14). Each particle is a tiny SVG circle inside a rotating `<g>` group. Rotation speeds vary (12, -8, 15 deg/sec). Particle radii: 0.7-1.0px. This signals "this node holds significance."

- **Tier 3 -- Epic** (depth 21+, or summary nodes, or nodes with 50+ tokens of dense content): Add a breathing aura -- a soft radial glow that pulses in luminance. Ambient warm-white halo at 1.5Hz pulse rate. Opacity oscillates 0.06-0.09. Radius oscillates +/-3px. Distinct from the red selection glow.

- **Tier 4 -- Artifact** (nodes explicitly starred/pinned by the user, or memory-saved nodes): Full treatment (orbit + particles + aura) plus a shifted fill gradient with a barely-perceptible warm amber undertone. Not gold, not orange -- the faintest suggestion of heat baked into the node material itself.

- **Tier classification function** in a new `lib/node-tiers.ts`: takes a node, its depth in the graph, its child count, and its metadata, returns a tier 0-4. Pure function, no side effects, testable.

**Definition of done**: Zooming into a conversation graph, you can distinguish a first-message node from a deep-thread node from a branch point from a memory-saved node purely by visual treatment, before reading any labels. Tier effects are subtle at normal zoom and become apparent at closer zoom levels (LOD 2+). Performance: no new per-frame allocations, all tier visuals are static SVG with timeRef-driven transforms.

### 2B. AI Provider Faction System

The current per-provider treatment is a 10% opacity color wash inside AI nodes. The audits confirm this is invisible. Model icons render at ~6x6px effective size -- "meaningless gray smudge."

**Deliverables**:

- **Distinct rim treatment per provider**: Each AI model's outer bezel stroke uses its faction color at low opacity (0.2 idle, 0.35 hover) instead of the current uniform E[5]. This is the primary visual signal -- visible at all LOD levels.

- **Enhanced faction tint**: Inner chromatic wash increased from 10% to 15% idle, 20% hover. The color should be perceptible without being garish.

- **Faction-colored core indicator**: The innermost dot of AI nodes uses the model color (currently implemented but at low opacity). Increase to 0.2 idle with a slow pulse (2Hz, amplitude 0.05).

- **Streaming identity**: When an AI node is streaming, the halo and pulsing ring use the model's faction color (not red). Already partially implemented -- verify the per-provider streaming glow gradients are correctly resolved and visible.

- **Model icon scale**: When LOD >= 2, model icons render at 14x14 effective size (up from ~6x6). At LOD 3, render at 16x16 with a subtle background circle in the faction color at 5% opacity to give the icon a "badge" feel.

- **Provider identity in Timeline and Inspector**: When viewing an AI node, the role dot in Timeline and the header accent in Inspector use the model's faction color instead of generic T.ghost.

**Definition of done**: A user can visually distinguish a Claude response from a GPT response from a Gemini response without reading the model name. Each faction has a recognizable color signature that appears consistently across nodes on canvas, the Timeline panel, and the Inspector panel.

### 2C. User Node Character

User nodes have strong materials (5-layer treatment) but no personality. They are the protagonist -- they should feel like the hero's marker on the game board.

**Deliverables**:

- **Active node indicator**: The node the user is currently "replying to" (activeNodeId) gets a distinctive treatment: a subtle warm-white breathing ring (not red -- red is selection) that communicates "this is where your next message connects." Implemented as a dedicated ring layer in the render loop, only on the active node.

- **Temporal luminance gradient**: Nodes fade slightly with age within a conversation. Most recent node at full opacity, previous at 0.97, two back at 0.94, etc. Floor at 0.80. This creates depth-of-time -- a visual recency signal. Computed per-frame in renderSVG based on node position in the ancestral path.

- **First-message distinction**: The very first user node in a session (depth 0) gets a slightly larger core dot (r=6 instead of 5) and a brighter specular highlight. It is the origin point of the conversation -- the "spawn point."

**Definition of done**: Looking at a conversation graph, you can identify the most recent exchange (brightest), the reply target (breathing indicator), and the origin (slightly larger). The user's nodes feel like active agents on the board, not passive data points.

---

## Phase 3 -- Panels

**Goal**: Transform the Inspector, Timeline, Memory Shelf, and all floating panels from developer scaffolding into premium surfaces that feel like they belong to the same world as the canvas.

**Dependencies**: Phase 1 complete (tokens for spacing, type, radii). Phase 2 partially complete (faction colors needed for provider identity in panels).

**Estimated scope**: Large (7 panel components + StatusBar consolidation + new toast system)

### 3A. Inspector Overhaul

The Inspector is the only panel that uses opaque E[0] background instead of the glass treatment. Its 280px width is cramped. Its content is dense monospace text with 9px labels.

**Deliverables**:

- Apply `glass` treatment to Inspector (match MemoryShelf, which already uses glass). Remove opaque E[0] background. Add the directional border system (light top, dark bottom).
- Width: 280 -> 320
- Header: panel title in Inter 11px semibold (up from Inconsolata 10px). Close button hit target expanded to 32x32.
- Section labels ("Content", "Details", "Reasoning", "Tool Use", "Actions"): Inter 10px semibold, uppercase, letterSpacing 0.06em, color T.ghost. Currently Inconsolata 9px -- too small and too technical.
- Body content: Inter 13px, lineHeight 1.7 (up from 12px/1.65). This is a reading surface -- treat it like one.
- Metadata (model, tokens, time, node ID): Inconsolata 11px (up from 10px). Key-value pairs with subtle separator dots, not newline-separated `div`s.
- Action buttons: 44px minimum height, radius R.sm, padding S[2]/S[3]. "Branch" button gets a subtle warm-white left border accent (matching branch edge color). "Regen" button gets the active model's faction color border.
- Add scroll fade masks: 16px gradient at top and bottom of the scrollable body using CSS mask-image. Content clips gracefully instead of hard-cutting.
- Entry animation: translateX(100%) + opacity(0) -> translateX(0) + opacity(1), 300ms, EASE.snap. Header delays 50ms, content items stagger 30ms.

**Definition of done**: Inspector feels like a premium card that floated in from the right, not a debug panel that was bolted on. Content is readable at a glance. Action buttons are obvious and appropriately sized.

### 3B. Timeline Transformation

The Timeline is the linear reading view of a conversation thread. Currently it reads like a git log -- small monospace text, role dots, timestamps. It should read like a premium chat surface.

**Deliverables**:

- Width: 400 -> 440
- Background: glass treatment (currently opaque E[0])
- Message content: Inter 13px, lineHeight 1.7. This is the primary reading experience for long-form AI responses.
- Role indicator: Replace the tiny 6px dot with a larger (20px) avatar-like circle. For user messages: bright warm-white fill with the user's initial or a subtle person silhouette. For AI messages: the model's faction color fill with the provider icon inside.
- Active message highlight: left border accent stays (good pattern), but increase to 3px and use ACCENT at 60% opacity (up from 2px at full -- currently too harsh in the warm palette).
- Timestamps: Inconsolata 10px, aligned right. Fine as-is but enforce minimum size.
- Thinking steps: expandable detail stays. Summary line color uses C.thinking (correct). Expanded content gets Inter body font at 11px.
- Tool calls: ToolCard treatment stays (already well-structured). Verify padding is on 4px grid.
- Scroll fade masks at top and bottom (same as Inspector).
- Entry animation: slide-in from right, 250ms. Messages stagger in from bottom, last 5 visible messages animate at 30ms intervals.

**Definition of done**: The Timeline reads like a premium messaging app, not a developer console. Opening it feels like opening a companion pane, not revealing a debug log.

### 3C. Memory Shelf Polish

The Memory Shelf is the best-designed panel currently (already uses glass, has good empty state, has search). It needs incremental improvements, not an overhaul.

**Deliverables**:

- Width: 280 -> 320
- Memory card hover: add subtle scale(1.01) and shadow intensification on hover, 150ms transition. Currently border-color changes only -- flat.
- Spawn button: hit target to 44px minimum height. Faction color of the original model if the memory came from an AI node.
- Clip thumbnails: increase height from 36px to 48px, use faction colors for nodes in the mini SVG.
- Search input: padding onto 4px grid (currently 5/8 -> 8/12), radius R.sm.
- Toggle button (left side): increase from 6/10 padding to 8/12. Add a subtle pulse animation when a new memory is saved while the shelf is closed (2 quick opacity bounces, 0.5s total).
- Scroll fade masks.

**Definition of done**: Memory Shelf feels curated and precious -- memories are collectible items, not database rows.

### 3D. StatusBar Rethink

The StatusBar is 24px of 9px monospace text that looks like a code editor chrome bar. On a spatial canvas interface, every pixel of canvas is valuable.

**Deliverables**:

- Remove the fixed full-width StatusBar bar entirely
- Fold its information into existing surfaces:
  - Model name and phase dot: already shown in SessionPill collapsed state
  - Node/edge count: move to SessionPill peek state
  - Token estimate: move to Inspector metadata section
- Replace with a minimal floating status pill: fixed bottom-left, glass treatment, pill radius, content = phase dot + phase text. 28px height, Inconsolata 10px. Opacity 0.6 at rest, 1.0 when streaming. Transitions over 300ms.
- This frees 24px of vertical space and eliminates the last "code editor" visual pattern.

**Definition of done**: No horizontal bar at the bottom of the viewport. Status information is available but does not consume permanent screen real estate. The canvas extends edge-to-edge vertically.

### 3E. Context Menu Upgrade

The context menu already uses `glassElevated` (upgraded from the audit). Remaining work is animation and sizing.

**Deliverables**:

- Entry animation: scale(0.95) + opacity(0) -> scale(1) + opacity(1), 120ms, EASE.snap. Transform-origin at cursor position.
- Menu items: stagger 20ms each, translateY(2px) + opacity(0) -> translateY(0) + opacity(1).
- All padding values onto 4px grid (already mostly there: 8/12 items, 4/8 dividers).
- Hit targets verified at 44px height per item.
- Keyboard navigation: arrow keys to move focus between items, Enter to select. Currently mouse-only.

**Definition of done**: Context menu feels like it unfurls from the click point. Items are comfortably sized for quick selection.

### 3F. Toast/Notification System

The UX audit identified zero feedback for: memory saves, clipboard copies, clip saves, session creation. These are invisible actions.

**Deliverables**:

- New `components/ui/Toast.tsx` component
- Toast store (simple Zustand slice or collocated in ui-store)
- Visual treatment: glass pill, bottom-center (above the floating input), width auto-sized to content, max-width 300px
- Content: icon + message, Inter 12px
- Duration: 2.5 seconds, auto-dismiss with fade-out
- Entry: translateY(8px) + opacity(0) -> translateY(0) + opacity(1), 200ms
- Exit: opacity(1) -> opacity(0), 300ms
- Integration points:
  - ContextMenu handleSaveMemory: toast "Saved to memory"
  - ContextMenu handleCopy: toast "Copied to clipboard"
  - ClipCreator handleSave: toast "Clip saved"
  - SessionPill createSession: toast "New session created"
  - Error states: toast with ACCENT color border for failures

**Definition of done**: Every secondary action that modifies state produces a brief, non-intrusive confirmation. The user is never left wondering "did that work?"

---

## Phase 4 -- Delight

**Goal**: Add purposeful celebration moments for key actions. These are not decorative -- they communicate that something meaningful happened. The RPG hero-on-a-game-board metaphor comes alive through these moments.

**Dependencies**: Phases 1-3 complete. Motion needs the token timing system (Phase 1), faction colors (Phase 2), and toast system (Phase 3F).

**Estimated scope**: Medium (effects.ts additions, GraphCanvas render additions, FloatingInput animation, new edge draw-on system)

### 4A. Edge Draw-On Animation

When a new edge is created (user sends message, AI responds), the edge currently just appears. This is the single highest-impact motion addition.

**Deliverables**:

- New edges animate their stroke-dashoffset from full path length to 0 over 400ms with EASE.smooth
- Implementation: track "new edge" IDs in the effects system (similar to how entrances are tracked). During the draw-on period, set stroke-dasharray to [pathLength] and animate stroke-dashoffset from pathLength to 0.
- After animation completes (400ms), remove the edge from the "new" set and render normally.
- Reply edges draw from parent to child. Branch edges draw from the branch point outward.
- Combined with the existing node entrance spring animation, the graph will feel like it grows organically rather than appearing.

**Definition of done**: Sending a message produces a visible "wiring" effect -- the edge traces from the parent node to the new child. It feels like the graph is being constructed in real time.

### 4B. Streaming Orchestration

When AI is streaming a response, the current signals are: node pulse on canvas, "Thinking..." in the input bar. The rest of the UI is unaware.

**Deliverables**:

- **Input bar streaming indicator**: The floating input's top border animates as a thin line in the active model's faction color, sweeping left-to-right over 1.5s repeating. Not the full border -- just a 30% width accent that translates across. Implemented as a CSS gradient mask animation.
- **Session pill phase dot pulse**: Already pulses (good). Verify it uses the model's faction color during streaming, not generic.
- **Canvas ambient pulse**: A very subtle radial gradient emanating from the streaming node's position. 200px radius, model faction color at 2% opacity, expanding and contracting over 2s (scale 0.8 to 1.2). Implemented in the SVG effects layer. Nearly invisible but creates a sense of "activity happening there."
- **Streaming completion moment**: When streaming finishes, a brief ripple effect emanates from the completed node (already implemented via addRipple in effects.ts). Verify the ripple uses warm-white (currently correct: rgba(225,225,225,0.15)). Add a second, slower ripple at 1.6x radius for a richer signal.

**Definition of done**: During AI streaming, the entire interface subtly communicates "something is happening" without being distracting. When the response arrives, there is a moment of resolution.

### 4C. Branch Creation Ceremony

Branching is Dreamcacher's signature interaction. It deserves a moment.

**Deliverables**:

- When a branch edge is created (edgeType === 'branch'), trigger a special ripple at the branch point node: two concentric rings expanding outward in T.secondary at low opacity (0.12 and 0.05), 600ms duration. This is visually distinct from the standard send-message ripple.
- The branch point node receives a brief scale pulse: 1.0 -> 1.08 -> 1.0, 300ms, with spring easing. This makes the node feel like it "reacted" to being branched.
- The floating input's "BRANCH" label animates in: translateX(-4px) + opacity(0) -> translateX(0) + opacity(1), 200ms. Currently it pops in instantly.
- The branch edge draws on with its dashed pattern animating from the branch point outward, same system as 4A but using the branch dash pattern (12 6) from the start.

**Definition of done**: Creating a branch feels like a deliberate, meaningful fork in the road. The branch point acknowledges the action. The new path draws itself into existence.

### 4D. Memory Save Celebration

Saving a node or clip to memory should feel like collecting a treasure.

**Deliverables**:

- When a memory is saved, the source node receives a brief golden-amber flash: a circle at r*1.5 that fades from amber-at-8% to transparent over 500ms. The amber is a one-time deviation from the luminance-only palette -- it is the "collection" color, used only in this moment and for Artifact-tier nodes.
- The Memory Shelf toggle button pulses twice (opacity 0.6 -> 1.0 -> 0.6 -> 1.0, 400ms total) if the shelf is closed.
- If the shelf is open, the new memory card entry animates: translateY(8px) + opacity(0) -> translateY(0) + opacity(1), 200ms.
- Toast: "Saved to memory" (from 3F) fires simultaneously.

**Definition of done**: Saving a memory feels like pocketing a rare find. The source node briefly glows with warmth, and the memory shelf acknowledges receipt.

### 4E. Floating Toolbar Entrance

The CanvasTools floating toolbar (Branch/Clip/Inspect) appears when a node is selected. Currently it pops in with no animation.

**Deliverables**:

- Entry: scale(0.85) + opacity(0) -> scale(1) + opacity(1), 200ms, EASE.snap. Transform-origin: center.
- Exit: scale(1) + opacity(1) -> scale(0.9) + opacity(0), 150ms, EASE.smooth.
- When the toolbar appears, its buttons stagger in at 40ms intervals (3 buttons = 80ms total stagger).
- Consider expanding the toolbar to include Regenerate (AI nodes) and Save as Memory alongside Branch/Clip/Inspect, per UX audit recommendation D1.

**Definition of done**: The toolbar unfurls smoothly when a node is selected and collapses cleanly when deselected. It feels responsive, not instantaneous.

---

## Phase 5 -- Polish

**Goal**: The final 10% that separates "well-designed" from "this was built by people who care more than they should." These are the details a user might never consciously notice but would miss if they were absent.

**Dependencies**: Phases 1-4 complete.

**Estimated scope**: Medium (spread across many files, but each change is small)

### 5A. Empty State Design

The canvas with zero nodes is a void. No guidance, no personality, no invitation.

**Deliverables**:

- Canvas empty state (rendered in GraphCanvas or a sibling overlay):
  - Large monogram: "DC" at 48px, Inter ultra-light (weight 200), color E[5], letterSpacing 8px
  - Below: "Start a conversation" at 14px Inter weight 400, color T.ghost
  - Below that: keyboard shortcut hint "/ to focus input" at 11px Inconsolata, color T.dim, with kbd styling (E[4] background, E[6] border, 4px radius)
  - All elements at 60% opacity
  - Subtle breathing animation on the monogram: scale oscillates between 0.98 and 1.02 over 4 seconds
  - Fade out over 500ms when the first node is created (tied to graph store node count changing from 0 to 1)
- Timeline empty state: "No messages yet. Start a conversation and your thread will appear here." at 13px Inter, color T.ghost
- Inspector empty state (when toggled open with I but no node selected): "Select a node to inspect it" centered, 13px Inter, T.ghost

**Definition of done**: A first-time user immediately understands where to begin. The empty canvas feels alive and inviting, not dead and intimidating.

### 5B. Scroll Fade Masks

All scrollable panels hard-clip content at boundaries. Premium apps fade.

**Deliverables**:

- Apply CSS mask-image gradient to all scrollable containers:
  - Inspector body
  - Timeline message list
  - Memory Shelf memory list
  - LearnOverlay content area
  - SessionPill session list (open state)
- Mask: `linear-gradient(to bottom, transparent 0px, black 16px, black calc(100% - 16px), transparent 100%)`
- Dynamic: only apply top mask when scrolled down, only apply bottom mask when not scrolled to end. Detect via scroll position and toggle mask classes.

**Definition of done**: Content at scroll boundaries fades gracefully. No hard content clipping visible anywhere in the application.

### 5C. Hover Micro-Interactions on Panels

All panel hover states currently use inline style mutations (`onMouseEnter={e => e.currentTarget.style.background = ...}`). These are instant -- no transition. Premium apps have 150ms transitions on every hover state.

**Deliverables**:

- Replace all inline hover handlers with CSS transition on the background property: `transition: background 150ms ease-out`
- Apply to: Timeline message rows, MemoryShelf memory cards, SessionPill session items, ContextMenu items, model selector items, LearnOverlay mode buttons, ToolCard headers
- For MemoryShelf cards, add subtle shadow intensification on hover (box-shadow transition)
- For ContextMenu items, add translateX(2px) on hover for a subtle "selection" nudge

**Definition of done**: Every interactive element in every panel has a smooth 150ms transition on hover. Nothing snaps. Everything breathes.

### 5D. Panel Open/Close Choreography

Panels slide in with translateX but lack content stagger and backdrop treatment.

**Deliverables**:

- When Inspector or Timeline opens: content items (header, then body sections) stagger in at 30ms intervals with translateY(4px) + opacity(0) -> translateY(0) + opacity(1). Total stagger for 5 items = 150ms, well within the panel's 300ms entrance.
- When a right-side panel opens, the canvas does NOT dim (Andrew's preference for maintaining the spatial relationship). But the panel's left edge gets a subtle inner shadow: `box-shadow: inset 6px 0 12px -6px rgba(0,0,0,0.3)` to create depth separation.
- SessionPill state transitions (collapsed -> peek -> open): content fade-in at each state, 200ms. Currently instant.

**Definition of done**: Every panel state transition is choreographed. Content reveals itself in reading order. The spatial relationship between canvas and panels is reinforced through shadow depth.

### 5E. First-Run Experience

The UX audit's single most critical finding: users land on a blank canvas with zero guidance.

**Deliverables**:

- First-run detection: check localStorage for a `dc-onboarded` key
- Three-step contextual walkthrough (not a modal wizard -- floating glass pills that point to elements):
  1. "Type below to start a conversation" -- glass pill positioned above the floating input with a subtle downward arrow. Pulse animation on the input bar's border.
  2. "Right-click any response to branch, learn, or save" -- appears after the first AI response arrives. Glass pill near the AI node. Dismisses on right-click or after 10 seconds.
  3. "Your conversation grows as a graph you can explore" -- appears after the second exchange. Brief, then fades. Points to the canvas.
- Each step auto-advances or dismisses on the relevant action being performed
- Set `dc-onboarded` in localStorage after step 3 completes or is dismissed
- A "?" button visible in the top-left or near the session pill that opens ShortcutsHelp. Currently the only way to access ShortcutsHelp is pressing "?" -- which requires knowing it exists.

**Definition of done**: A first-time user who has never seen Dreamcacher can send a message, discover branching, and understand the spatial metaphor within their first 60 seconds. The walkthrough is non-intrusive and disappears permanently after completion.

### 5F. Accessibility Pass

The current application has zero explicit accessibility work. No ARIA labels, no focus management, no keyboard navigation beyond the shortcuts defined in ShortcutsHelp.

**Deliverables**:

- All interactive elements get `aria-label` attributes (icon-only buttons, model selector, panel toggles)
- Focus trap in modal overlays (LearnOverlay, ShortcutsHelp)
- Focus ring: the floating input already has an accent-colored focus state (good). Verify all other focusable elements have a visible `:focus-visible` ring using the ACCENT color at 30% opacity.
- Skip-to-content link for keyboard users (hidden until focused, jumps to the floating input)
- Context menu keyboard navigation (arrow keys + enter, per 3E)
- Color contrast audit: verify all text meets WCAG 2.1 AA (4.5:1 for text, 3:1 for UI components). Known risks: T.dim (#404040) on E[1] (#0C0B09) is approximately 2.3:1 -- below threshold. T.ghost (#606060) on E[1] is approximately 3.6:1 -- marginal. Remediation: increase T.dim to #4A4A4A and T.ghost to #6A6A6A, or accept that these are decorative/non-essential text.
- Reduced-motion: wrap all animation in `@media (prefers-reduced-motion: no-preference)` checks. Users who prefer reduced motion see instant state changes instead of transitions.

**Definition of done**: WCAG 2.1 AA compliance on all essential text and interactive elements. Keyboard-navigable through all primary flows. Screen reader can announce panel names, node roles, and action results.

---

## Phase Summary

| Phase | Name | Scope | Key Deliverable | Depends On |
|-------|------|-------|-----------------|------------|
| 1 | Foundation | Medium | Token system, scale-up, font pairing | Nothing |
| 2 | Identity | Large | Node rarity tiers, AI faction system, user character | Phase 1 |
| 3 | Panels | Large | Inspector/Timeline/MemoryShelf overhaul, StatusBar removal, toast system | Phase 1 |
| 4 | Delight | Medium | Edge draw-on, streaming orchestration, branch ceremony, memory celebration | Phases 1-3 |
| 5 | Polish | Medium | Empty states, scroll fades, hover transitions, first-run, accessibility | Phases 1-4 |

Phases 2 and 3 can run in parallel after Phase 1 completes -- they touch different files. Phase 2 is primarily GraphCanvas.tsx and effects.ts. Phase 3 is primarily the panel components (Inspector, Timeline, MemoryShelf, StatusBar, ContextMenu) and a new Toast component.

Phase 4 requires both 2 and 3 because delight moments span both canvas effects and panel feedback.

Phase 5 is the only phase that touches every file, but each touch is small and isolated.

---

## What This Roadmap Does NOT Cover

- **Feature work**: No new features (the UX audit has a backlog of feature recommendations like expanded CanvasTools, select-descendants, cancel-streaming). These are product decisions, not design decisions.
- **Performance optimization**: The LOD system and physics bridge are already sound. No performance work is proposed.
- **Canvas noise/vignette**: Andrew explicitly removed these. They stay removed.
- **Major layout changes**: The spatial canvas + floating panels model is correct. No structural changes proposed.
- **Color palette changes**: The Bumba-Dark warm-black elevation system and red accent are locked. The per-model faction colors are locked. No new chromatic colors except the fleeting amber flash on memory save (Phase 4D).

---

## How to Use This Document

Each phase section has specific deliverables and a definition of done. When implementing, work through one phase at a time. Within a phase, the lettered subsections can be implemented in any order unless a dependency is noted.

For each deliverable, the component files affected are identifiable from the description (theme.ts, GraphCanvas.tsx, Inspector.tsx, etc.). The token references (S[], R.sm, FS.body, etc.) are the names proposed for Phase 1A -- adjust if different names are chosen during implementation.

The estimates (small/medium/large) refer to implementation effort, not design effort. The design decisions are made in this document. What remains is execution.
