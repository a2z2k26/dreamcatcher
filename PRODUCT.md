# Dreamcatcher

**A spatial conversation interface where AI thinking becomes visible.**

**Status:** Concept validated with working physics prototype
**Date:** 2026-03-24
**Authors:** Andrew Zellinger & Bumba

---

## What This Is

A spatial conversation interface where AI conversations become navigable, branchable, persistent graphs. The conversation itself is the canvas — not a chat log, not a document, a landscape of thinking you built with an AI partner.

## Purpose

Make AI-assisted thinking visible. Linear chat collapses the structure of real thinking — which is non-linear, spatial, accumulative, and visible. This product restores that structure.

## Three Tiers (All Required for MVP)

### Tier 1: Backtrack
"I went down a path. It didn't work. I go back."

- Navigate to any node, branch from it
- Dead-end branch dims but persists — nothing is lost
- Full prior context maintained on the new branch
- Core interaction: right-click any node → Branch from here

### Tier 2: Clip and Spawn
"I extract a breakthrough and seed a new session with it."

- Select a subgraph → Clip it as a portable memory artifact
- Clips live in a shelf — named, searchable, reusable
- "New session from clip" spawns a fresh canvas with clipped context
- Inherited nodes visually distinct (dashed border, different shape)
- Memory with intentionality — you curate what carries forward

### Tier 3: Decision Transparency
"I can see how I and the model got here."

- Inspector panel shows full content + metadata per node
- AI nodes have expandable reasoning layer (thinking steps)
- Path trace: highlight the full chain from root to any node
- Branch comparison: side-by-side divergence view
- The graph is a learning tool, not just a conversation record

---

## Design System

### Origin
Inspired by Unit's visual language — geometric, precise, grayscale-dominant, monospace typography. Adapted from a programming environment to a thinking environment.

### Canvas
- Background: #1F1F1F (Unit dark)
- Grid: dot pattern, 20px spacing, fades at low zoom
- Orientation: top-down on load (time flows down), freely reposable by user
- Force-directed physics maintains coherence after reposition

### Node Taxonomy

| Node Type | Shape | Visual Treatment |
|---|---|---|
| User message | Circle, filled | Solid fill, lighter stroke |
| AI response | Circle, outlined | Stroke only, no fill, slightly larger |
| AI w/ thinking | Circle, double ring | Outer circle + subtle inner ring |
| Branch point | Circle w/ tick marks | Notches where branches exit |
| Binary decision | Split circle | Two halves representing the choice |
| Multi decision | Segmented circle | Pie segments, selected one highlighted |
| Clip (imported) | Rounded rectangle, dashed | Different shape = different origin |
| Summary | Diamond / rotated square | Meta-content, compressed branch |
| Educational | Circle + "i" badge | Signals inspectable reasoning |

### Color Language

| Color | Hex | Meaning |
|---|---|---|
| Grayscale | 12-stop palette | Default state (90% of graph at rest) |
| Gold | #FFCC00 | Selection / active focus |
| Blue | #0066FF | Branch / navigation |
| Violet | #8B5CF6 | Thinking / reasoning |
| Warm white | #F0EDE6 | Fresh / unread nodes |
| Dim gray | #363636 | Dead-end / abandoned branches |

### Typography
- Inconsolata (monospace) everywhere
- Node labels: 11px
- Inspector: 12px
- Meta/badges: 9px

### LOD Zoom Levels

| Zoom | Rendering |
|---|---|
| < 25% | Dots and lines only. Topology. |
| 25-50% | Shapes visible. User/AI/clip/summary distinguishable. |
| 50-75% | Short labels. Indicators. Branch counts. |
| > 75% | Full labels. All badges and indicators. |

### Physics (Ported from Unit)
- Force-directed simulation with alpha cooling (0.25 → 0.001)
- Edge springs: stiffness * (surfaceDist - restLength) * alpha / centerDist
- Node repulsion: -90 * alpha / surfaceDist (within 144px)
- Hard collision: alpha-independent push when surfaces < 12px apart
- Friction: 0.75, velocity decay: 0.1
- Drag: fx/fy pinning — dragged node locked, forces propagate to neighbors
- On release: fx/fy cleared, springs take over

---

## Toolkit / Interaction Vocabulary

### Universal (every node)
- **Branch** — fork from this point
- **Inspect** — full content in side panel
- **Clip** — add to clip shelf
- **Copy** — copy text

### AI Nodes
- **Expand thinking** — show reasoning steps
- **Regenerate** — alternative response (auto-creates sibling branch)
- **Compare** — side-by-side with sibling branches

### Branch Points
- **Show all paths** — highlight branches with summaries
- **Collapse** — compress to summary diamond
- **Expand** — reverse collapse

### Clip Nodes
- **Spawn session** — new canvas from this clip
- **Edit clip** — modify before spawning
- **Trace origin** — navigate to source

### Global Tools
- **Clip Shelf** (left sidebar) — saved clips with "New session" button
- **Inspector** (right sidebar) — content, thinking, context, metadata, actions
- **Timeline Scrubber** (bottom bar) — temporal dots for date-based navigation
- **Search / ⌘K** — text, type, date, branch filters
- **Path Trace (T)** — highlight root-to-node chain
- **Branch Compare (C)** — split panel divergence view

---

## Technical Architecture

```
Frontend (Next.js)
├── Canvas (custom SVG, force-directed physics)
├── Inspector (node detail, thinking, metadata)
├── Clip Shelf (saved memories)
├── Timeline Scrubber (temporal navigation)
└── Command Palette (search/filter)

State (Zustand)
├── Graph store (nodes, edges, positions, content)
├── Session store (active canvas, history)
├── Clip store (saved clips)
└── UI store (selection, zoom, panels)

API Layer
├── Claude API (streaming, extended thinking)
├── Context Builder (walks graph root→node, assembles messages[])
└── Summary Generator (auto-compress long branches)

Persistence
├── Local-first: IndexedDB for graph documents
├── Clips stored separately, cross-referenceable
└── Future: vector DB for cross-session retrieval

Context Budget (1M window)
├── System prompt: ~2K
├── Active path (root→current): up to ~800K
├── Sibling branch summaries: ~5K
├── Vector DB retrieved chunks: ~10K (future)
├── Clips: ~10K
└── Response headroom: ~100K+
```

---

## What's Out of MVP
- Multiplayer / collaboration
- Custom model routing per node
- Workflow execution
- Export to other formats
- Templates
- Voice input
- Mobile

---

## Open Questions
1. ~~**Name**~~ — **Dreamcatcher**
2. **Standalone vs embedded** — own product, or feature inside existing AI tool?
3. **Summary strategy** — auto-summarize branches at what threshold? User-triggered or automatic?
4. **Clip format** — becomes system prompt? Pre-filled history? Compressed summary?
5. **Onboarding** — how to teach spatial conversation to people trained on linear chat?

---

## Prototype
Working prototype at `prototype.html` in this directory. Unit-authentic SVG rendering, force-directed physics, draggable nodes with elastic connections, branching, inspector, context menu, LOD zoom, minimap.
