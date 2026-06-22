# Dreamcatcher Quality Scorecard

A weighted rubric for evaluating design quality across ten dimensions. Score the application at any milestone to track progress from prototype to premium product.

**Methodology**: Each category is grounded in published research and industry frameworks -- Princeton's 5D Rubric (empowerment, efficiency, intuitiveness, engagement, trust), GitLab's UX Scorecard (A-F grading on task completion), Nielsen Norman Group's first-impression and cognitive load research, WCAG 2.2 accessibility standards, and the InVision Design Maturity Model (Levels 1-5). Scoring descriptors are calibrated against the benchmarks named in each category.

**Scoring**: 1-10 integer scale per category. Multiply the raw score by the category weight, sum all weighted scores. Maximum possible = 100.

**Target thresholds**:
- Below 40: Prototype. Not ready for external users.
- 40-59: Functional beta. Usable but visually unremarkable.
- 60-74: Polished product. Competitive with incumbents.
- 75-89: Premium product. Users remark on the quality unprompted.
- 90-100: Best-in-class. Award-level craft.

**Benchmark peers**: Linear, Raycast, Arc Browser, Figma Canvas, Obsidian Canvas.

---

## Scoring Table

| # | Category | Weight | Score (1-10) | Weighted |
|---|----------|--------|:------------:|:--------:|
| 1 | Visual Hierarchy Effectiveness | 15% | ___ | ___ |
| 2 | Information Density Balance | 10% | ___ | ___ |
| 3 | Interaction Feedback Completeness | 12% | ___ | ___ |
| 4 | Typographic Quality | 10% | ___ | ___ |
| 5 | Color System Coherence | 10% | ___ | ___ |
| 6 | Spatial Clarity | 12% | ___ | ___ |
| 7 | Empty State Quality | 5% | ___ | ___ |
| 8 | Motion Design Maturity | 8% | ___ | ___ |
| 9 | Accessibility Baseline | 10% | ___ | ___ |
| 10 | First-Impression Impact | 8% | ___ | ___ |
| | **TOTAL** | **100%** | | **___** |

---

## 1. Visual Hierarchy Effectiveness

**Weight**: 15%

**Definition**: The degree to which the interface guides the user's eye through content in a deliberate sequence -- from most important to least important -- using size, contrast, position, and grouping. Visual hierarchy determines whether a user can extract meaning from a screen in the first 2-3 seconds of exposure, before conscious reading begins.

**Research basis**: Nielsen Norman Group eyetracking studies identify four dominant scanning patterns (F-pattern, Z-pattern, layer-cake, spotted) that users adopt based on the strength of visual hierarchy. When hierarchy is weak, users default to F-pattern scanning and miss content in the lower-right quadrant. When hierarchy is strong, users follow the designer's intended path. Lindgaard et al. (2006) demonstrated that aesthetic judgments -- driven heavily by hierarchy -- form within 50 milliseconds.

**Dreamcatcher-specific concerns**: The spatial canvas demands a clear distinction between primary objects (nodes), secondary objects (edges), and tertiary chrome (panels, input bar, status). The node LOD system is a form of programmatic hierarchy. The challenge is maintaining hierarchy when 50+ nodes, 4 panels, and 6 floating elements coexist.

### What 1/10 looks like

Everything is the same size, weight, and contrast. Text ranges from 8px to 13px -- a spread too narrow to create perceptible levels. Nodes, edges, panels, and chrome all compete for attention equally. No element draws the eye first. The user experiences visual noise: the interface feels like a dense data dump with no entry point. Equivalent to a spreadsheet with no header row.

### What 10/10 looks like

Three unmistakable levels visible within 500ms of exposure. Primary: the node you are interacting with (selected, active, or streaming) is the brightest, largest, most dimensional object on screen. Secondary: the conversation graph around it provides context without competing -- edges are visible but recessive, sibling nodes are present but subordinate. Tertiary: panels, chrome, and metadata fade to near-invisible until needed. The user always knows where to look. Navigating a 100-node graph feels no harder than navigating a 5-node graph because the hierarchy dynamically focuses attention. Comparable to how Linear's issue detail view foregrounds the issue while the sidebar recedes.

### How to test

1. **5-second screenshot test**: Show a screenshot of a 30+ node graph to 5 people who have never seen the app. After 5 seconds, ask: "What is the most important thing on this screen?" If 4 of 5 point to the same element (the selected/active node), hierarchy is working.
2. **Squint test**: Blur the screenshot to the point where text is unreadable. The hierarchy should still be legible -- bright focal point, mid-tone context, dark background. If everything blurs to the same gray, hierarchy has failed.
3. **Zoom regression**: Navigate a large graph at 5 different zoom levels. At each level, the most important element (active node, selected node, streaming node) should remain visually dominant. If it disappears into the field at any zoom level, the LOD system needs recalibration.
4. **Panel overlay check**: Open Inspector + Timeline + Memory Shelf simultaneously. The canvas content behind them should remain distinguishable as the primary surface, not feel like it has been buried under chrome.

---

## 2. Information Density Balance

**Weight**: 10%

**Definition**: The ratio of useful information per pixel to available breathing room, calibrated for the user's task context. Too sparse wastes screen real estate and forces unnecessary scrolling. Too dense overwhelms and obscures patterns. The target is maximum comprehension per unit of attention, not maximum data per unit of area.

**Research basis**: Research on information density in interfaces (Paulwallas, 2024; Envylabs) establishes that "busy" or "cluttered" reactions indicate failed hierarchy rather than excessive content. Dense UIs work when they use consistent micro-spacing (4-8px grid) and clear grouping. Progressive disclosure -- showing high-level data with drill-down to detail -- is the primary strategy for managing density in data-heavy applications. Edward Tufte's data-ink ratio principle: maximize the proportion of ink devoted to communicating data, minimize non-data ink.

**Dreamcatcher-specific concerns**: The canvas must handle 1-200 nodes without feeling empty (1 node) or chaotic (200 nodes). Panels display metadata-rich content (model name, token count, timestamps, tool calls, reasoning chains) that can overwhelm a 320px-wide panel. The LOD system is the architectural answer to density on the canvas; the panels need their own density management.

### What 1/10 looks like

Either: (a) a cramped screen where every pixel contains data, with 14 different padding values (3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24), no governing spacing system, and no visual grouping -- the user cannot separate one piece of information from the next. Or: (b) a barren screen with a single node floating in a vast dark canvas, requiring the user to zoom or scroll constantly to find content. Both extremes fail.

### What 10/10 looks like

The canvas surface dynamically adjusts perceived density through the LOD system -- zoomed out shows topology (just nodes and connections), zoomed in reveals detail (labels, metadata, content preview). Panels use a strict 4px spacing grid where related items cluster and distinct sections breathe. Every piece of information earns its pixel. Metadata is available but not foregrounded -- visible when you look for it, invisible when you do not. The interface at maximum complexity (100 nodes, all panels open) feels like a well-organized workshop, not a messy desk. Comparable to how Figma's canvas transitions between artboard overview and component-level detail.

### How to test

1. **Spacing audit**: Grep all padding, margin, and gap values across components. Count unique values. Fewer than 8 unique values = systematic. More than 12 = ad hoc.
2. **Progressive disclosure check**: Can the user access all information about a node (content, metadata, reasoning, tool calls, token count, path, siblings)? Is it layered (summary visible, detail on demand), or flattened (everything visible always)?
3. **Extremes test**: View the interface with 1 node, 10 nodes, 50 nodes, and 200 nodes. Rate readability at each scale 1-10. Average those four scores.
4. **Panel density review**: Open the Inspector for a node with a long AI response including reasoning and tool calls. Is the content scannable? Can you find the action buttons within 3 seconds? Is the scroll position after reading predictable?

---

## 3. Interaction Feedback Completeness

**Weight**: 12%

**Definition**: The percentage of user-initiated actions that produce perceptible visual, auditory, or state-change feedback within the user's expected response window. Every action -- whether it succeeds, fails, or is in progress -- must produce a response the user can perceive and interpret.

**Research basis**: Jakob Nielsen's response time thresholds: 100ms for feeling instantaneous, 1 second for maintaining flow without special feedback, 10 seconds as the attention limit requiring a progress indicator. Research on haptic and visual feedback latency (Immersion, 2015) shows that feedback delays over 100ms degrade task performance. GitLab's UX Scorecard grades experiences where "users can still finish but take longer" as C-grade and "users may abandon" as D-grade -- both typically caused by missing or delayed feedback.

**Dreamcatcher-specific concerns**: The UX audit identified six actions with POOR or no feedback: save as memory (no confirmation), copy text (no confirmation), regeneration (no auto-pan), clip saved (no confirmation), node drag to hotspot (ambiguous), session deletion (no confirmation dialog). The branching flow and primary chat flow have GOOD feedback. The gap is entirely in secondary actions.

### What 1/10 looks like

The user performs an action and nothing observable happens. Save a memory: no toast, no animation, no shelf pulse. Delete a session: gone immediately with no confirmation. Copy to clipboard: silence. Error during streaming: the stream hangs indefinitely with no timeout, no retry button, and no way to cancel. The user constantly wonders "did that work?" and resorts to checking side panels or refreshing the page to confirm state changes.

### What 10/10 looks like

Every action produces proportional feedback. Primary actions (send message, branch, path trace) get rich, multi-signal feedback: canvas animation + panel update + state indicator change. Secondary actions (save memory, copy, create session) get lightweight confirmation: a 2.5-second toast notification plus a subtle visual pulse on the relevant UI element. Destructive actions (delete session) get a confirmation dialog. Error states get inline retry buttons. Streaming gets a timeout (30 seconds) with abort capability. The user never wonders about the result of any action -- the interface confirms or explains every state transition. Comparable to how Arc Browser confirms bookmarks with a brief animation and sound, or how Linear shows inline confirmation on every action.

### How to test

1. **Action inventory**: List every user-initiated action in the application. For each, document the feedback provided (visual, audio, state change, none). Calculate the percentage with adequate feedback. Target: 100% of destructive and state-changing actions have feedback.
2. **Blind action test**: Perform each action with your eyes elsewhere on the screen (simulating peripheral attention). Could you perceive that the action completed? If not, feedback is insufficient.
3. **Error path walk**: Deliberately trigger every error condition (network failure, timeout, malformed response, stalled stream). Document the recovery path available to the user. Every error must have a visible escape route.
4. **Timing audit**: Measure the delay between user action and first visible feedback for each interaction. All primary actions should respond in under 100ms. Secondary feedback (toast, animation completion) should resolve within 3 seconds.

---

## 4. Typographic Quality

**Weight**: 10%

**Definition**: The effectiveness of type as both a communication medium and a design element -- encompassing font selection, scale system, weight distribution, line height, letter spacing, and contrast. Typography is the primary carrier of information in any interface; its quality directly determines readability, scannability, and perceived professionalism.

**Research basis**: WCAG 2.2 Level AA requires 4.5:1 contrast ratio for normal text and 3:1 for large text (18px+ or 14px bold). The emerging APCA (Accessible Perceptual Contrast Algorithm) for WCAG 3 goes further, accounting for font weight and polarity -- particularly relevant for dark mode, where bright text on very dark backgrounds can pass WCAG 2 but cause halation. Optimal line height is 1.5x font size (WCAG recommendation). Line length should not exceed 80 characters for body text. Type scale ratios (1:1.25 minor third, 1:1.333 perfect fourth) create predictable, harmonious size relationships.

**Dreamcatcher-specific concerns**: The current implementation uses Inconsolata monospace everywhere, with a size range of 8-13px (5px spread). This is a 1:1.6 ratio from smallest to largest -- barely perceptible. The VISUAL-CRITIQUE identified zero typographic hierarchy: no variation in typeface, weight distribution, or meaningful scale. The prescription is a dual-font system (Inter for UI/reading, Inconsolata for data/metadata) with a 10-20px range (1:2 ratio).

### What 1/10 looks like

Single monospace font everywhere. Size range of 5px (8-13px). No weight variation. No distinction between conversational content and metadata. 9px text in a status bar on a high-DPI display is physically straining to read. The type scale has no mathematical relationship -- sizes are chosen ad hoc (8, 9, 10, 11, 12, 13). Text at T.dim (#404040) on E[1] (#0C0B09) fails WCAG AA at 2.3:1 contrast. The interface reads like a terminal emulator, not a premium product.

### What 10/10 looks like

Two complementary typefaces: a humanist sans-serif (Inter/Geist) for reading and UI chrome, a monospace (Inconsolata) reserved for data, metadata, and code. The type scale follows a defined ratio (1:1.25 minor third) with 5 named sizes (caption 10, label 11, body 13, title 16, display 20). Weight is used structurally: 400 for body, 500 for emphasis, 600 for headings, 700 for badges. Line height is 1.5-1.7 for reading surfaces. Every text element passes WCAG 2.2 AA contrast requirements. Monospace and sans-serif are used semantically -- seeing the font tells you the category of information. The type system alone communicates hierarchy, even without size differences. Comparable to Linear's Inter-based type system with 6 weight/size combinations.

### How to test

1. **Contrast audit**: Run every text color / background color combination through a WCAG 2.2 AA contrast checker. All essential text must pass 4.5:1. UI components must pass 3:1. Document any failures.
2. **Scale coherence check**: List all font-size values in the codebase. Do they map to named tokens? Do they follow a mathematical ratio? Fewer than 6 unique sizes on a defined scale = excellent. More than 10 unique sizes = broken.
3. **Readability test**: Ask 3 people to read a long AI response in the Timeline panel and rate readability 1-10. Average below 7 indicates insufficient line height, line length, or font size.
4. **Semantic test**: Show a screenshot to someone and ask them to identify "which text is data/metadata and which is content" based purely on typography. If they can distinguish the two categories, the dual-font system is working.

---

## 5. Color System Coherence

**Weight**: 10%

**Definition**: The degree to which color usage across the entire interface follows a documented, intentional system -- with each color carrying consistent semantic meaning, every value traceable to a named token, and no orphan hex values that exist outside the system.

**Research basis**: Design token systems (documented by Nathan Curtis, EightShapes; Carbon Design System; Fluent 2) establish a three-tier model: primitive tokens (raw hex values in a scale), semantic tokens (intent-based aliases like `surface-critical` or `text-subtle`), and component tokens (element-specific overrides). Color consistency research (UXPin, 2024) shows that systematic token usage creates visual continuity across products and enables reliable dark mode implementation. InVision's design maturity research found that organizations at Level 4+ ("Infused") use token systems; organizations at Levels 1-2 use ad-hoc hex values.

**Dreamcatcher-specific concerns**: The design direction specifies a luminance-only hierarchy (warm-black elevation scale E[0]-E[7], neutral text scale T.primary through T.dim) with a single chromatic accent (#DD0000 red) used exclusively for attention. Per-model faction colors (amber, green, yellow, orange) are permitted inside model-related surfaces. The VISUAL-CRITIQUE found violations: #0066FF blue on Branch buttons, #8B5CF6 purple in Memory Shelf and Clip tool, #FFCC00 yellow in Learn mode and ripple effects. These are placeholder developer colors with no semantic justification.

### What 1/10 looks like

Random hex values scattered across components. Colors are chosen per-component with no shared vocabulary. The same semantic meaning (e.g., "interactive element") appears in blue, purple, yellow, and red depending on which developer built the component. Hardcoded hex values in style objects -- no tokens, no variables. Dark mode was achieved by "making things dark" rather than inverting a systematic palette. Off-palette colors appear in ripple effects, tool buttons, and status indicators with no chromatic language. A grep for hex values returns 30+ unique colors with no mapping to a palette.

### What 10/10 looks like

Every color in the application traces to a named token in `theme.ts`. Zero orphan hex values in any component file. The elevation scale (E[0]-E[7]) governs all surface colors. The text scale (T.primary through T.dim) governs all text. The single accent (red) is used exclusively for focus, streaming, danger, and attention. Per-model faction colors appear only inside model-identified surfaces (model selector, AI node interiors, Timeline role indicators). Ripple effects, drag trails, hover states, and system feedback all use the warm-neutral palette. A designer can open `theme.ts`, read the color definitions, and predict every surface in the application. Comparable to Linear's grayscale-plus-accent system or Arc's per-Space color theming.

### How to test

1. **Token coverage audit**: Grep all hex values, rgb/rgba values, and color references across the codebase. Map each to a theme token. Calculate coverage percentage. Target: 100% of color values reference tokens.
2. **Chromatic discipline check**: List every chromatic (non-gray, non-black, non-white) color in the UI. For each, document its semantic purpose. Any chromatic color without a documented purpose is a violation.
3. **Substitution test**: Replace the accent color (#DD0000) with a different hue (e.g., blue). Does the interface still make semantic sense? If red was used correctly (danger, attention, focus), the blue substitution will feel wrong in those contexts -- confirming the color carried meaning. If it feels arbitrary, color was decorative, not semantic.
4. **Dark mode stress**: View every surface at every elevation level. Are levels distinguishable? Can you count the number of elevation steps by visual inspection alone?

---

## 6. Spatial Clarity

**Weight**: 12%

**Definition**: The user's ability to orient themselves within the spatial canvas at any moment -- knowing where they are in the graph, what they are looking at, how they got there, and where they can go. Spatial clarity is the canvas equivalent of navigation confidence in a traditional application.

**Research basis**: Wayfinding research (MIT, NNg, Passini) identifies five components of spatial orientation: placemaking (understanding the environment), orientation (knowing your position), navigation (moving purposefully), labeling (identifying elements), and search (finding specific content). For node-based canvas interfaces specifically, Lynch's "imageability" concept applies: the quality that makes a space memorable and navigable depends on landmarks, paths, edges, districts, and nodes. Eye-tracking research on Figma Canvas and similar spatial tools shows that users anchor to the largest or most visually distinct object, then navigate outward.

**Dreamcatcher-specific concerns**: The canvas is an infinite pan-and-zoom surface with no fixed landmarks. A 200-node graph can spread across a large area. The user needs to understand: which node they are replying to (active node), which node they are inspecting (selected node), the shape of the conversation (topology), and where branches diverge. The session pill provides session-level context. The minimap does not exist. Path trace provides thread-level wayfinding. The LOD system helps by simplifying distant nodes.

### What 1/10 looks like

The user sends 20 messages, branches twice, and is now lost. They cannot find the branch point. They cannot see the full graph topology. They do not know which node their next message will connect to. The active node and selected node are conflated -- clicking to inspect also changes the reply target, causing accidental re-routing. There is no minimap, no breadcrumb, no visual trail. The canvas is featureless: uniform dot grid, no depth, no vignette, no landmarks. Zooming out shows a homogeneous cloud of identical circles. Zooming in shows detail but loses context. The user resorts to "Space" (fit view) repeatedly to regain orientation.

### What 10/10 looks like

At any zoom level, the user can answer three questions without moving: (1) Where is the active node? (a dedicated breathing indicator marks it), (2) Where did this conversation start? (the origin node is visually distinct), (3) Where do branches diverge? (branch points have hexagonal shape, visible at all LODs). Path trace mode highlights the thread from root to any selected node, dimming everything else. The canvas has atmospheric depth -- central illumination fading to edges creates a sense of "place." The LOD system provides seamless transitions: zoomed out = topology map, zoomed in = detail view, with no jarring jumps. Temporal luminance (recent nodes brighter, older nodes dimmer) provides a time-based wayfinding layer. The active node is never ambiguous. Comparable to how Figma's canvas uses artboard labels and zoom-dependent detail to maintain orientation at any scale.

### How to test

1. **Orientation quiz**: After a user has built a 30-node graph with 3 branches, ask them without looking at the screen: "Where is the branch point?" "Which node will your next message connect to?" "How many branches exist?" If they can answer 2 of 3 correctly, spatial clarity is working.
2. **Landmark test**: Zoom to fit the entire graph. Can you identify the origin node, the most recent node, and each branch point by visual appearance alone (without reading labels)? Each should have a distinct visual treatment.
3. **Return-to-context test**: Navigate to a distant part of the graph, then attempt to return to the active conversation thread. Time the return. Under 3 seconds with fit-view or path trace = passing. Over 10 seconds of panning and scanning = failing.
4. **New-user topology test**: Show the canvas to someone who did not build the graph. Ask them to describe the conversation structure (linear? branching? how many threads?). If they can read the topology from the visual, spatial clarity is working.

---

## 7. Empty State Quality

**Weight**: 5%

**Definition**: The design quality and strategic effectiveness of screens, panels, and components when they contain no user data. Empty states are the product's first impression and its primary onboarding surface -- they communicate what the tool does, invite the user to act, and prevent the disorientation of encountering a void.

**Research basis**: Nielsen Norman Group's guidelines for empty states in complex applications (2023) identify three types: informational (explaining the container is empty), action-focused (urging the user toward a filling action), and celebratory (communicating that emptiness is positive, e.g., inbox zero). Smashing Magazine's user onboarding research established the "two parts instruction, one part delight" principle. The UX audit identified the canvas empty state as the single most critical onboarding gap in Dreamcatcher.

**Dreamcatcher-specific concerns**: The application has 9 surfaces that can be empty: canvas (zero nodes), Inspector (no selection), Timeline (no messages), Memory Shelf (no memories), Learn Overlay (no mode selected), Path Trace (not active), Clip Creator (fewer than 2 selected), Branch Preview (no branch hovered), Session Pill (no session). Currently, only the Memory Shelf has a meaningful empty state ("No memories saved yet. Right-click a node > Save as memory"). The canvas -- the primary surface that every user sees first -- is a blank void.

### What 1/10 looks like

The user opens the application and sees a dark grid with a small input bar. No explanation of what the tool does. No invitation to act. No personality. The canvas communicates nothing about the spatial paradigm. A user from ChatGPT will type, get a response, see it appear as two dots connected by a line, and have no mental model for why this is a graph instead of a chat thread. Panels opened while empty show blank space or "No data" text. The empty state actively harms retention: users who do not understand the value proposition within 30 seconds are unlikely to return.

### What 10/10 looks like

The empty canvas is alive. A subtle monogram breathes at center (scale oscillation 0.98-1.02 over 4 seconds). Below it, "Start a conversation" in the UI font with a keyboard shortcut hint ("/ to focus input"). The entire composition is at 60% opacity -- present but not demanding. It fades out in 500ms when the first node appears, replaced by the growing graph. Every panel has a contextual empty state that explains its purpose and how to populate it: Timeline says "Start a conversation and your thread will appear here." Inspector says "Select a node to inspect it." The empty states are not filler text -- they are micro-onboarding moments that collectively teach the application's vocabulary. A first-time user walks through empty states like chapters in a tutorial they do not realize they are reading. Comparable to Notion's empty page ("Press / for commands") or Linear's empty project ("Create your first issue").

### How to test

1. **Surface inventory**: List every UI surface. For each, document its empty state (text, illustration, call-to-action, or void). Score each: 0 = void, 1 = text-only, 2 = text + call-to-action, 3 = text + CTA + visual delight. Average across all surfaces.
2. **First-session test**: Have 3 new users open the application with zero prior context. Observe their first 60 seconds. If they send a message within 30 seconds without prompting, the canvas empty state is doing its job. If they stare at the screen or ask "what do I do?", it is failing.
3. **Return-user test**: A user who has used the app before creates a new empty session. Does the empty state feel welcoming or annoying? Empty states should fade from helpful to invisible as the user gains experience.

---

## 8. Motion Design Maturity

**Weight**: 8%

**Definition**: The sophistication, consistency, and purposefulness of animation and transition throughout the interface -- from micro-interactions (button hover, focus ring) through meso-interactions (panel open/close, menu reveal) to macro-interactions (node entrance, edge draw-on, branch ceremony). Motion maturity is not about quantity of animation but about whether every animation communicates something the user needs to know.

**Research basis**: Disney's 12 animation principles mapped to UI (anticipation, follow-through, slow-in/slow-out, staging) provide the quality baseline. Microsoft Fluent 2's motion system and Apple's Human Interface Guidelines both define motion as a tool for communicating spatial relationships, state changes, and cause-effect. NNg's research on animation in UX (2020) identifies purposeful animation as animation that helps the user understand what changed, where it came from, and what it means. The key distinction: decorative animation (adds delight but no information) vs. functional animation (communicates state, spatial relationships, or causality).

**Dreamcatcher-specific concerns**: The current motion inventory is uneven. Nodes have entrance animations (spring physics, good). Streaming nodes pulse (good). Edges appear instantly (bad -- no draw-on animation). Panels slide in with translateX but have no content stagger and no opacity transition. The context menu pops in with no animation. Hover states are instant (inline style changes with no CSS transition). The disconnect between the animated canvas and the static panels creates a split-personality feel.

### What 1/10 looks like

All state changes are instant. Panels appear, menus appear, nodes appear, edges appear -- everything pops into existence with no transition. Hover states snap from one color to another. The interface feels like a series of jump cuts. No easing curves, no duration tokens, no choreography. The user has no spatial continuity between states. Alternatively: excessive, decorative animation everywhere (bouncing icons, spinning loaders, gratuitous parallax) that adds no information and slows task completion.

### What 10/10 looks like

Every state change is animated at a duration and easing appropriate to its purpose. Micro-interactions (hover, focus, press) use fast timing (100-150ms) with snap easing. Meso-interactions (panel open, menu reveal, toolbar entrance) use normal timing (200-300ms) with content stagger (30ms per item). Macro-interactions (node entrance, edge draw-on, branch ceremony) use slow timing (300-500ms) with spring or smooth easing. All durations and easings reference named tokens (not magic numbers). Motion respects `prefers-reduced-motion` -- users who opt out see instant state changes. The graph growing organically (node spring-in + edge draw-on + ripple) is the signature motion moment: it communicates that the conversation is alive and building. Comparable to Linear's panel transitions (smooth slide with content fade) or Arc Browser's tab animations.

### How to test

1. **Motion inventory**: List every animated element. For each, document: trigger, duration, easing, purpose (what does this animation communicate?). Any animation without a clear communicative purpose is decorative and should be questioned.
2. **Consistency audit**: Check that all transitions of the same type use the same duration and easing. All hover states should share timing. All panel entrances should share timing. Inconsistency in motion timing is as jarring as inconsistency in spacing.
3. **Reduced-motion test**: Enable `prefers-reduced-motion: reduce` in browser settings. Navigate the entire application. Every interaction should still be usable and clear. If any state change becomes confusing without animation, the animation was carrying too much functional weight without a static fallback.
4. **Choreography test**: Trigger a panel open. Do the elements inside appear in reading order (header first, then content)? Or does everything appear simultaneously? Staggered reveal should feel like a choreographed entrance, not a loading delay.

---

## 9. Accessibility Baseline

**Weight**: 10%

**Definition**: Conformance with WCAG 2.2 Level AA across the four POUR principles (Perceivable, Operable, Understandable, Robust), with particular attention to keyboard navigation, screen reader compatibility, focus management, contrast ratios, and touch target sizing. Accessibility is not a feature -- it is a quality floor. An inaccessible premium interface is not premium.

**Research basis**: WCAG 2.2 Level AA requires: 4.5:1 contrast for normal text, 3:1 for large text and UI components. All functionality available via keyboard. Focus indicators not hidden by overlapping elements. Interactive targets at least 24x24 CSS pixels (with spacing exceptions). Focus traps in modal dialogs. Reduced-motion support. The APCA algorithm (WCAG 3 draft) adds nuance for dark mode: bright text on very dark backgrounds can pass WCAG 2 ratio checks while causing halation -- APCA accounts for font weight and polarity.

**Dreamcatcher-specific concerns**: The application has zero explicit accessibility work currently. No ARIA labels on icon-only buttons (timeline toggle, memory shelf toggle, model selector). No focus trap in modal overlays (LearnOverlay, ShortcutsHelp). No keyboard navigation for the context menu (mouse-only). Known contrast failures: T.dim (#404040) on E[1] (#0C0B09) = approximately 2.3:1 (fails AA). T.ghost (#606060) on E[1] = approximately 3.6:1 (marginally passes for large text only). Several interactive elements fall below the 24x24px target minimum (CanvasTools buttons, SessionPill delete button, PathTrace arrows).

### What 1/10 looks like

No ARIA labels anywhere. Keyboard users cannot reach interactive elements. Tab order is undefined -- pressing Tab jumps unpredictably. No focus rings visible. Modal overlays do not trap focus -- Tab escapes into the background. Context menu is mouse-only. Color contrast fails on 30%+ of text elements. Touch targets are 16px with no spacing. Screen reader announces nothing meaningful -- just a wall of unlabeled divs. The application is functionally unusable for anyone not using a mouse with 20/20 vision on a large display.

### What 10/10 looks like

Full WCAG 2.2 AA conformance. Every interactive element has an aria-label. Tab order follows visual order. All modals trap focus and return focus to the trigger element on close. Context menu is keyboard-navigable (arrow keys + Enter). All text passes 4.5:1 contrast (or 3:1 for large text). All interactive targets are 44px minimum (exceeding the 24px WCAG minimum for comfortable use). A visible `:focus-visible` ring in the accent color at 30% opacity appears on every focusable element. Skip-to-content link hidden until focused. `prefers-reduced-motion` respected. Screen reader can announce: panel names, node roles (user/AI), node content, and action results. The spatial canvas has an accessible alternative (Timeline view) that provides equivalent content in a linear, screen-reader-friendly format. Comparable to how GitHub's dark mode passes all contrast requirements and provides full keyboard navigation.

### How to test

1. **Keyboard-only walkthrough**: Unplug the mouse. Navigate the entire application using only keyboard. Send a message, branch, open inspector, open timeline, save a memory. Document every point where keyboard access fails.
2. **Contrast audit tool**: Run axe-core, Lighthouse accessibility audit, or Wave against every view. Document all contrast failures. Categorize as essential text (must fix) or decorative text (evaluate case-by-case).
3. **Screen reader test**: Navigate with VoiceOver (macOS) or NVDA (Windows). Can the user understand the interface structure? Can they identify nodes, panels, and actions? Document unlabeled elements.
4. **Target size audit**: Measure the click/touch target size of every interactive element. Document any below 24x24px (WCAG minimum) or 44x44px (comfortable minimum).
5. **Reduced-motion test**: Enable prefers-reduced-motion. Navigate the full application. Verify no animation plays and all state changes are still perceivable.

---

## 10. First-Impression Impact

**Weight**: 8%

**Definition**: The quality of the user's initial emotional and cognitive response within the first 5 seconds of seeing the application -- before they interact with anything. First impression is the synthesis of all other categories perceived simultaneously and instantly: hierarchy, color, type, density, atmosphere, and craft. It determines whether the user feels trust, curiosity, and desire to explore, or skepticism, confusion, and desire to close the tab.

**Research basis**: Lindgaard et al. (2006) demonstrated that visual appeal assessments form within 50 milliseconds and correlate highly with assessments made after 500ms of exposure. Google research (Tuch et al., 2012) confirmed that visual complexity and prototypicality are the two primary drivers of first-impression aesthetic judgments. Through the halo effect, positive first impressions increase perceived credibility, usability, and willingness to overlook minor issues. Negative first impressions persist even when subsequent experience is positive -- the anchoring effect of the first moment is difficult to overcome.

**Dreamcatcher-specific concerns**: The first-impression window is particularly critical for Dreamcatcher because the spatial-conversation paradigm is unfamiliar. Users arriving from linear chat interfaces (ChatGPT, Claude) will judge the product within milliseconds and either lean in ("this is something different and interesting") or recoil ("this is confusing and unfinished"). The canvas atmosphere, node materials, glass panel treatment, and empty state design collectively form the first impression. The design direction -- "petri dish in a bio-tech lab, precious specimens under glass" -- is a strong, distinctive vision that must be visually evident in the first moment.

### What 1/10 looks like

A dark screen with a dot grid, a tiny input bar, and some small text. Feels like a developer tool in alpha. No personality, no atmosphere, no visual distinction from a hundred other dark-mode apps. The user's inner monologue: "Is this a terminal? A debug view? Am I in the right place?" The visual quality signals "hobbyist project" or "weekend hackathon." The halo effect works in reverse: the user enters with low expectations and interprets every subsequent interaction through a lens of skepticism.

### What 10/10 looks like

The screen loads and the user pauses. The warm-black canvas has depth -- not flat, but atmospheric. Nodes (if present) look like precious objects: dimensional, layered, materially rich. Glass panels float with convincing depth separation. Typography is confident and legible. The empty state (if new session) is alive: a breathing monogram, an invitation to begin, a subtle hint of what will emerge. The overall impression is of a purpose-built instrument -- something designed with intentionality by people who care about craft. The user's inner monologue: "This is something different. I want to explore this." The halo effect kicks in positively: minor rough edges are forgiven because the overall quality signals competence and care. Comparable to the first impression of opening Arc Browser for the first time, or the moment you see a Linear workspace with real data -- both provoke the reaction "someone made this with real care."

### How to test

1. **50ms flash test**: Show a screenshot for 50 milliseconds (use presentation software with timed slides). Ask the viewer: "Did that look professional, amateur, or neutral?" Repeat with 5 viewers. Professional should be the majority response.
2. **Competitive lineup**: Place a Dreamcatcher screenshot alongside screenshots of Linear, Raycast, ChatGPT, and a generic Bootstrap dashboard. Ask 5 people to rank them by perceived quality. Dreamcatcher should place in the top 3.
3. **Emotional response**: Show the application to 5 people for 5 seconds each. Ask each to write one word describing their reaction. Target words: "sleek," "interesting," "clean," "dark," "futuristic." Red-flag words: "confusing," "empty," "boring," "unfinished," "broken."
4. **"Would you screenshot this?" test**: An informal but telling metric. After 10 minutes of use, would the user screenshot the interface to share with a colleague or on social media? Premium products get screenshotted. Forgettable products do not.

---

## Evaluation Template

Use this template at each milestone. Fill in scores, calculate weighted totals, and compare against previous evaluation.

```
EVALUATION DATE: _______________
EVALUATOR: _______________
BUILD / COMMIT: _______________
MILESTONE: _______________

| # | Category                         | Wt   | Score | Weighted |
|---|----------------------------------|------|:-----:|:--------:|
| 1 | Visual Hierarchy Effectiveness   | 0.15 |  /10  |          |
| 2 | Information Density Balance      | 0.10 |  /10  |          |
| 3 | Interaction Feedback Completeness| 0.12 |  /10  |          |
| 4 | Typographic Quality              | 0.10 |  /10  |          |
| 5 | Color System Coherence           | 0.10 |  /10  |          |
| 6 | Spatial Clarity                   | 0.12 |  /10  |          |
| 7 | Empty State Quality              | 0.05 |  /10  |          |
| 8 | Motion Design Maturity           | 0.08 |  /10  |          |
| 9 | Accessibility Baseline           | 0.10 |  /10  |          |
| 10| First-Impression Impact          | 0.08 |  /10  |          |
|   | TOTAL                            | 1.00 |       |    /100  |

THRESHOLD:  [ ] Prototype (<40)
            [ ] Functional Beta (40-59)
            [ ] Polished Product (60-74)
            [ ] Premium Product (75-89)
            [ ] Best-in-Class (90-100)

TOP 3 IMPROVEMENT PRIORITIES:
1. _______________
2. _______________
3. _______________

NOTES:
_______________
```

---

## Weight Rationale

The weights reflect the strategic priorities of a dark-mode spatial canvas application:

- **Visual Hierarchy (15%)** and **Spatial Clarity (12%)** are weighted highest because they are existential for a canvas-based interface. A spatial tool that fails at wayfinding is broken at the concept level, regardless of polish elsewhere.
- **Interaction Feedback (12%)** is weighted high because incomplete feedback was identified as the largest UX gap in the audit. Users who do not trust that their actions succeeded will not explore further.
- **Typography (10%)**, **Color System (10%)**, and **Accessibility (10%)** are the three foundational craft dimensions. Each affects every pixel of the interface and compounds across all interactions.
- **Information Density (10%)** is weighted at the same level because the application manages complex data across canvas and panels -- getting density wrong makes everything else harder.
- **Motion Design (8%)** and **First-Impression Impact (8%)** are weighted slightly lower because they are multiplicative of the above dimensions. Good motion amplifies good hierarchy. First impression is the synthesis of all categories perceived at once. They matter deeply, but they follow from the others.
- **Empty State Quality (5%)** is the lowest weight because its impact is concentrated in a narrow window (first session, new panels). It is critical for onboarding but affects a smaller surface area of the total experience.

---

## Sources

Research and frameworks referenced in this scorecard:

- [The 5D Rubric -- Princeton User Experience Office](https://ux.princeton.edu/5d-rubric)
- [UX Scorecards -- GitLab Handbook](https://handbook.gitlab.com/handbook/product/ux/ux-scorecards/)
- [The Design Critique Rubric -- Patrick Thornton, UX Collective](https://uxdesign.cc/the-design-critique-rubric-how-to-determine-if-something-is-well-designed-9421db59f982)
- [First Impressions Matter -- Nielsen Norman Group](https://www.nngroup.com/articles/first-impressions-human-automaticity/)
- [Attention web designers: You have 50 milliseconds to make a good first impression -- Lindgaard et al.](https://www.tandfonline.com/doi/abs/10.1080/01449290500330448)
- [The role of visual complexity and prototypicality regarding first impression of websites -- Google Research](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/)
- [Cognitive Load -- Laws of UX](https://lawsofux.com/cognitive-load/)
- [A critical analysis of cognitive load measurement methods -- Darejeh & Marcus, 2024](https://arxiv.org/abs/2402.11820)
- [Text Scanning Patterns: Eyetracking Evidence -- Nielsen Norman Group](https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/)
- [F-Shaped Pattern For Reading Web Content -- Nielsen Norman Group](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/)
- [The Role of Animation and Motion in UX -- Nielsen Norman Group](https://www.nngroup.com/articles/animation-purpose-ux/)
- [Designing Empty States in Complex Applications -- Nielsen Norman Group](https://www.nngroup.com/articles/empty-state-interface-design/)
- [12 Core Principles for Premium Quality UX Design -- Whitespectre](https://medium.com/whitespectre/12-core-principles-for-premium-quality-ux-design-828435b4a968)
- [UI Density -- Matt Strom](https://mattstromawn.com/writing/ui-density/)
- [Designing for Data Density -- Paul Wallas](https://paulwallas.medium.com/designing-for-data-density-what-most-ui-tutorials-wont-teach-you-091b3e9b51f4)
- [Understanding Contrast and Typography Scale for WCAG -- ArtVersion](https://artversion.com/blog/understanding-contrast-and-typography-scale-for-wcag/)
- [APCA vs WCAG -- Roger Romero](https://www.regoremor.com/design/apca-vs-wcag-why-the-future-of-visual-accessibility-has-already-changed/)
- [Web Content Accessibility Guidelines (WCAG) 2.2 -- W3C](https://www.w3.org/TR/WCAG22/)
- [Color Consistency in Design Systems -- UXPin](https://www.uxpin.com/studio/blog/color-consistency-design-systems/)
- [Light and Dark Color Modes in Design Systems -- Nathan Curtis, EightShapes](https://medium.com/eightshapes-llc/light-dark-9f8ea42c9081)
- [Motion -- Fluent 2 Design System](https://fluent2.microsoft.design/motion)
- [The Ultimate Design Maturity Guide for Tech Leaders -- DSRUPTR / Joe Smiley](https://dsruptr.com/2026/01/19/the-ultimate-design-maturity-guide-for-tech-leaders/)
- [UX Maturity: A Holistic Approach to Design -- Improving](https://www.improving.com/thoughts/ux-maturity-a-holistic-approach-to-design/)
- [UX Impacts of Haptic Latency -- Immersion](https://www.immersion.com/wp-content/uploads/2015/10/ux-impact_haptic-latency-in-auto_jul13v1.pdf)
- [Empty State UX Examples and Best Practices -- Pencil and Paper](https://www.pencilandpaper.io/articles/empty-states)
- [Credibility judgments in web page design -- PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4863498/)
