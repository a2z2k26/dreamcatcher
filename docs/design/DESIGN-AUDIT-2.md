# Dreamcatcher Design Audit II — Synthesized Findings

**Date**: 2026-03-25
**Agents**: Design Chief, UI Designer, Visual Designer, Interaction Designer, System Architect, Frontend Design Specialist
**Input**: Code review of all 35 source files + 8 live screenshots at 1920x1080 + previous audit docs

---

## Consensus Rating: 4.5-5/10

All six agents converge: the **architecture is 8/10** (spatial graph, physics, LOD, branching, sessions, memory — genuinely novel). The **visual execution is 4.5/10** — dragging perceived quality down by 4 points. The gap is craft propagation: node materials received serious attention, everything else is developer scaffolding.

---

## Three Core Problems (Unanimous)

### 1. EVERYTHING IS TOO SMALL
- Font range: 8-13px (6px spread). Premium apps use 12-32px (20px spread)
- 8 components have text at or below 8px — functionally invisible
- Node radii 18/22px produce 36/44px circles — feel like data points, not specimens
- Hit targets below 44px minimum on: CanvasTools, model dropdown, SessionPill delete, MemoryShelf spawn, PathTrace nav
- Input bar at 320px/11px is the most-used element and feels like a debug field

### 2. NO AI MODEL IDENTITY
- All AI nodes look the same regardless of provider
- Model color tint at 4% opacity is invisible (every agent confirmed this independently)
- Model icons in nodes render at ~6x6px effective — "meaningless gray smudge"
- Placeholder SVG paths are not actual brand marks — Claude, GPT, Gemini icons are generic
- No "faction" visual language per provider

### 3. PANELS FEEL LIKE DEV TOOLS
- Inspector uses opaque E[0] background, not glass — the only panel that doesn't float
- All panel headers: 9-10px uppercase monospace — invisible
- Zero scroll fade masks on any scrollable surface
- Zero hover transitions — all inline style mutations are instant
- Zero entry animations on context menu, learn overlay, shortcuts help
- Monospace everywhere — makes a spatial thinking tool look like a terminal

---

## Synthesized Next Objectives

Ordered by compound impact. Each builds on the previous.

### PHASE 1 — Foundation (Token System + Scale)

**Objective 1: Design Token Expansion**
Add to `theme.ts`:
- **Spacing**: `S` — 4px grid (4, 8, 12, 16, 20, 24, 32)
- **Radii**: `R` — sm(6), md(8), lg(12), xl(16), pill(9999)
- **Type scale**: `FS` — 2xs(10), xs(11), sm(13), base(16), lg(20), xl(25)
- **Font families**: `FF` — mono (Inconsolata), sans (Geist/Satoshi/Inter)
- **Shadows**: `SHADOW` — ambient, sm, md, lg, xl, inner, node
- **Duration**: `DURATION` — instant(100), fast(150), normal(250), slow(400), glacial(600)
- **Easing**: `EASE` — out, inOut, bounce + `transition()` helper
- **Z-index**: `Z` — formalized stack (40-400)
- **Opacity**: `O` — 8 named levels (invisible through full)

**Objective 2: Global Scale-Up**
- Floor ALL font sizes at 10px (sweep 8px and 9px everywhere)
- Body text in reading panels: 13-14px minimum (Timeline, Inspector, LearnOverlay)
- Input text: 13px unfocused, 15px focused
- Node radii: USER 18→22 (minimum touch target), AI 22→26
- FloatingInput width: 320→400 unfocused, 520→560 focused
- Panel widths: Inspector 280→320, MemoryShelf 280→320
- All padding snapped to 4px grid

**Objective 3: Font Pairing**
- Add a proportional sans-serif (Geist, Satoshi, or Inter) for UI chrome + reading content
- Keep Inconsolata for data/metadata (timestamps, IDs, token counts, kbd)
- Apply `fontFamily` at root layout, remove ~20 inline declarations

### PHASE 2 — Node Identity System

**Objective 4: AI Provider Visual Factions**
Per-provider materials on AI nodes:

| Provider | Color | Rim Light | Tint Opacity | Streaming Glow | Inner Mark |
|----------|-------|-----------|-------------|----------------|------------|
| Claude | `#D4A574` amber | Amber arc 0.3/0.5 | 0.08 idle, 0.14 hover | Amber pulse | Starburst at r×0.35 |
| GPT | `#10A37F` green | Green arc 0.3/0.5 | 0.08/0.14 | Green pulse | Hexagon at r×0.35 |
| Gemini | `#4285F4` blue | Blue arc 0.3/0.5 | 0.08/0.14 | Blue pulse | 4-point star at r×0.35 |
| Qwen | `#6366F1` indigo | Indigo arc 0.3/0.5 | 0.08/0.14 | Indigo pulse | Circle-dot at r×0.35 |

- Per-provider SVG gradient defs (`node-ai-fill-claude`, etc.)
- Faction rim visible at LOD 1+, inner mark at LOD 2+, full detail at LOD 3
- Streaming glow uses provider color instead of ACCENT red (ACCENT stays for selection)

**Objective 5: Brand Icon Replacement**
- Replace placeholder SVG paths in `models.ts` with recognizable brand marks
- Anthropic: starburst. OpenAI: hexagonal flower. Gemini: 4-point star. Qwen: cloud/Q
- Render at scale(0.58) = ~14px effective (up from 6px)
- Model selector: 18x18 icons. Timeline: 12x12. Input: 16x16

**Objective 6: Node Rarity System**
Visual layering based on conversation depth/branching:
- **Tier 0** (Common): Current treatment
- **Tier 1** (Uncommon, depth 3-8): Orbiting dash ring
- **Tier 2** (Rare, depth 9+, 3+ branches): Micro-particle orbits
- **Tier 3** (Epic, saved as memory): Breathing luminance aura
- **Tier 4** (Artifact, heavily branched + memorized): Amber material shift + light leak

### PHASE 3 — Panel & Chrome Upgrade

**Objective 7: Premium Panels**
- Inspector: Switch from opaque E[0] to `glass` background, add rounded inner corners, inset 12px from viewport edge
- Timeline: Same treatment — floating, glass, rounded, max-height 85vh
- All panels: Add scroll fade masks (16px gradient at top/bottom)
- Panel headers: 11px minimum, T.subtle (#808080) minimum
- Section labels: 10px floor, still uppercase

**Objective 8: Remove/Replace StatusBar**
- Fold model name + phase into SessionPill collapsed state
- Fold node/edge count into SessionPill peek state
- Fold token estimate into Inspector metadata
- Delete StatusBar component, reclaim 24px
- Delete TopBar.tsx (confirmed dead code)

**Objective 9: Off-Palette Cleanup**
- MemoryShelf: `rgba(139,92,246,...)` purple → `E[5]`/`E[6]` borders
- FloatingUI: `#A1A1A1` → `T.subtle`
- LearnOverlay: Inline rgba values → ACCENT alpha tokens
- Backdrop overlays → shared `OVERLAY` token

### PHASE 4 — Motion & Feedback

**Objective 10: GSAP Migration (Priority Targets)**
- Node entrances: Replace `springEase` with `gsap.from({ scale: 0 }, { elastic.out(1.2, 0.5) })`
- Context menu: `scale(0.95) opacity(0)` → `scale(1) opacity(1)`, 120ms
- Panel slide-ins: Add opacity + content stagger (30ms per item)
- Edge draw-on: stroke-dashoffset animation over 400ms for new edges
- Custom eases: `dc-settle`, `dc-breathe`, `dc-snap`, `dc-reveal`

**Objective 11: Hover & Feedback**
- Node hover: scale 1.08 + shadow intensification + specular brighten, 150ms
- All buttons: CSS `transition: background 150ms ease` (replace instant inline mutations)
- Action confirmations: Toast system for copy, save-memory, clip-saved
- Streaming completion: Ceremony when AI finishes (specular flash + ring burst)
- Input focus: ACCENT red glow ring (2px outer, 8% opacity)

### PHASE 5 — Canvas Atmosphere

**Objective 12: Living Canvas**
- Ambient particles: 20 micro-dots with Brownian drift at 0.3px/sec
- Grid jitter: Deterministic hash-based dot offset for organic feel
- Vignette tracks content centroid with heavy damping
- Canvas breathing: Very slow (0.02Hz) vignette pulse when idle 5+ seconds
- Edge energy pulse: Traveling dot along reply edges on 2-second loop

---

## Spec Documents Produced

| Document | Author | Location |
|----------|--------|----------|
| VISUAL-MANIFESTO.md | Visual Designer | `dreamcatcher/VISUAL-MANIFESTO.md` |
| MOTION-SPEC.md | Interaction Designer | `dreamcatcher/MOTION-SPEC.md` |
| This synthesis | All 6 agents | `dreamcatcher/DESIGN-AUDIT-2.md` |

Previous audits (still valid for UX recommendations):
- `dreamcatcher/VISUAL-CRITIQUE.md` — 12 critiques with CSS/SVG prescriptions
- `dreamcatcher/UX-AUDIT.md` — 40+ recommendations across 8 dimensions

---

## Execution Recommendation

**CRITICAL REVISION (post-screenshot analysis):** The screenshots shifted the priority order. The original plan led with tokens/type scale (foundational). The visual evidence shows **raw scale increase delivers more immediate impact** because the material system already works — it's just invisible at current node sizes. dc-08 (zoomed) proves the materials sing at 2-3x. The fix is making default zoom show what zoomed-in already shows.

**Revised execution order:**

1. **Node scale increase** — USER r=18→24, AI r=22→28. This single change makes the existing 5-layer materials visible at default zoom. Highest ROI.
2. **AI model color visibility** — Tint 4%→10%, add per-provider inner ring + core indicator. Makes faction identity real.
3. **Chrome scale** — Input bar 320→440px, canvas tools visible, session pill 160→200px. The floating UI must announce itself.
4. **Font pairing + type scale** — Proportional sans for UI/reading, mono for data. 10px floor everywhere.
5. **Tokens + spacing normalization** — Foundation for consistency going forward.
6. **Everything else** — Panels, motion, canvas atmosphere, empty state, rarity system.

**Visual Designer's key insight:** "The material system was designed for nodes viewed at 2-3x their current rendered size. At actual rendered size, the multi-layer stack collapses into 'small dark circle.'" The fix is not more layers — it's bigger nodes + ambient auras that extend visual footprint beyond geometric boundary.

**Design Chief's key insight:** "Increasing node radius is now the single highest-impact change because it would make the existing material quality visible at normal zoom levels without redoing any of the gradient work."

Start a fresh session for implementation. Full context window, no infrastructure debt.
