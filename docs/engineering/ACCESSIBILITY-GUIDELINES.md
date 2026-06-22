# Dreamcatcher Accessibility Guidelines

Accessibility standards for a dark-mode spatial conversation interface built on SVG canvas, floating glass panels, keyboard shortcuts, and a warm luminance-only palette.

Target: WCAG 2.2 Level AA. Level AAA where achievable without compromising the design language.

---

## Table of Contents

1. [Dark Mode Contrast and Readability](#1-dark-mode-contrast-and-readability)
2. [Canvas and SVG Accessibility](#2-canvas-and-svg-accessibility)
3. [Keyboard Navigation](#3-keyboard-navigation)
4. [Focus Management](#4-focus-management)
5. [Motion and Animation](#5-motion-and-animation)
6. [Color Independence and Color Blindness](#6-color-independence-and-color-blindness)
7. [Screen Reader Support](#7-screen-reader-support)
8. [Target Sizes](#8-target-sizes)
9. [Semantic Structure and ARIA](#9-semantic-structure-and-aria)
10. [Testing Protocol](#10-testing-protocol)
11. [Implementation Priority](#11-implementation-priority)

---

## 1. Dark Mode Contrast and Readability

### Requirement

All text and interactive elements must meet WCAG 2.2 contrast minimums against their backgrounds. Dark mode introduces specific challenges: halation (white text bleeding on dark backgrounds), iris dilation causing readability loss for users with astigmatism (~50% of the population), and reduced distinguishability between elevation levels.

### Why This Matters for Dreamcatcher

The warm black palette (E[0] `#080706` through E[7] `#3D3A35`) with luminance-only text hierarchy (T.primary `#E1E1E1` through T.dim `#404040`) is the entire visual language. There is no color-based hierarchy to fall back on. If a luminance step fails contrast, the information it carries becomes invisible.

### Current Palette Audit

**Text on Canvas Background (E[1] `#0C0B09`)**

| Token | Hex | Contrast vs E[1] | AA Normal | AA Large | AAA Normal |
|-------|-----|-------------------|-----------|----------|------------|
| T.primary | `#E1E1E1` | 15.4:1 | PASS | PASS | PASS |
| T.secondary | `#C8C8C8` | 11.8:1 | PASS | PASS | PASS |
| T.tertiary | `#A8A8A8` | 8.0:1 | PASS | PASS | PASS |
| T.subtle | `#808080` | 4.6:1 | PASS | PASS | FAIL |
| T.ghost | `#606060` | 2.7:1 | FAIL | FAIL | FAIL |
| T.dim | `#404040` | 1.5:1 | FAIL | FAIL | FAIL |

**Text on Glass Panels (approximate E[2]-E[3] blend, ~`#171614`)**

| Token | Hex | Contrast vs ~`#171614` | AA Normal | AA Large |
|-------|-----|------------------------|-----------|----------|
| T.primary | `#E1E1E1` | ~13.2:1 | PASS | PASS |
| T.secondary | `#C8C8C8` | ~10.2:1 | PASS | PASS |
| T.tertiary | `#A8A8A8` | ~6.9:1 | PASS | PASS |
| T.subtle | `#808080` | ~4.0:1 | FAIL (normal) | PASS |
| T.ghost | `#606060` | ~2.4:1 | FAIL | FAIL |
| T.dim | `#404040` | ~1.3:1 | FAIL | FAIL |

### Rules

**R1.1 (Must-Have):** All body text (message content, labels, form inputs) must use T.tertiary (`#A8A8A8`) or brighter against any background. T.subtle (`#808080`) is the absolute floor for large text (>= 18px or >= 14px bold).

**R1.2 (Must-Have):** T.ghost (`#606060`) and T.dim (`#404040`) must never carry meaning on their own. They are decorative-only tokens -- borders, dividers, background hints. Any element rendered in T.ghost that conveys information (timestamps, metadata, node labels) must be promoted to T.subtle minimum or paired with a non-color indicator.

**R1.3 (Must-Have):** The ACCENT color (`#DD0000`) on dark backgrounds achieves approximately 4.6:1 against E[1]. This passes AA for normal text but fails AAA. When used as text smaller than 14px bold, pair it with a brighter variant or use it only for large indicators. For the "Learn Mode" header at 11px, this is a violation -- use T.primary for the label text and reserve ACCENT for the indicator dot or border.

**R1.4 (Must-Have):** Avoid pure white (`#FFFFFF`) for body text. T.primary (`#E1E1E1`) is correct. The 15.4:1 ratio against E[1] is high enough to be legible without triggering halation. Pure white on the warm blacks would push to ~18:1 -- uncomfortable for extended reading and worse for astigmatic users.

**R1.5 (Nice-to-Have):** Node labels on the canvas (currently Inconsolata 12px in T.tertiary/T.ghost) should use T.tertiary minimum. The current implementation uses T.ghost for AI node labels at `GraphCanvas.tsx:402` -- this fails contrast on the dark canvas.

### How to Implement

```typescript
// theme.ts — add a contrast-safe mapping
export const A11Y_TEXT = {
  /** Minimum for body text on any background */
  body: T.tertiary,     // #A8A8A8 — 8.0:1 on E[1], 6.9:1 on glass
  /** Minimum for large text / bold labels */
  label: T.subtle,      // #808080 — 4.6:1 on E[1] (AA large only)
  /** Decorative only — never sole carrier of meaning */
  decorative: T.ghost,  // #606060
  /** Hidden — purely structural, no semantic content */
  structural: T.dim,    // #404040
} as const;
```

Update the following locations:
- `Inspector.tsx:96` -- metadata at T.ghost 10px: promote to T.subtle minimum or increase to 12px
- `Inspector.tsx:114` -- thinking step content at T.ghost: promote to T.subtle
- `GraphCanvas.tsx:402` -- AI node labels at T.ghost: promote to T.tertiary
- `ShortcutsHelp.tsx:84` -- category header at T.dim: promote to T.ghost (decorative context, acceptable)
- `ShortcutsHelp.tsx:89` -- shortcut descriptions at T.subtle 10px: promote to T.tertiary or increase font size

### How to Test

1. Use WebAIM Contrast Checker (webaim.org/resources/contrastchecker/) with exact hex values from theme.ts
2. Browser DevTools: Chrome Accessibility panel shows computed contrast ratios for any element
3. axe DevTools extension: automated scan catches text contrast failures
4. Manual: zoom browser to 200% and verify all text remains legible
5. Test with Windows High Contrast Mode enabled -- the warm palette must not collapse into invisibility

---

## 2. Canvas and SVG Accessibility

### Requirement

SVG content must be perceivable by assistive technologies. Canvas-based (HTML `<canvas>`) elements are opaque to screen readers. Interactive SVG elements need programmatic names, roles, and state descriptions.

### Why This Matters for Dreamcatcher

The entire conversation graph -- nodes, edges, selection state, branch points, streaming indicators -- lives inside an SVG element rendered imperatively via `innerHTML`. Screen readers cannot parse this content. A blind user currently experiences Dreamcatcher as: an input field, some buttons, and silence where the graph should be.

### Rules

**R2.1 (Must-Have):** The SVG canvas container (`svgRef` in `GraphCanvas.tsx`) must have `role="img"` with an `aria-label` that summarizes the current graph state. Update this label dynamically as nodes are added.

```html
<svg
  role="img"
  aria-label="Conversation graph with 12 nodes and 11 connections.
              3 branch points. Currently selected: AI response about React hooks."
>
```

**R2.2 (Must-Have):** Provide a parallel non-visual representation of the graph. This is the single most impactful accessibility feature for Dreamcatcher. Implement a screen-reader-only tree view that mirrors the graph structure.

```html
<!-- Visually hidden, announced by screen readers -->
<div class="sr-only" role="tree" aria-label="Conversation graph">
  <div role="treeitem" aria-level="1" aria-expanded="true"
       aria-label="You: How do React hooks work? 2 branches">
    <div role="group">
      <div role="treeitem" aria-level="2"
           aria-label="Claude (Sonnet): React hooks are functions... Branch 1 of 2">
      </div>
      <div role="treeitem" aria-level="2"
           aria-label="Claude (Sonnet): Hooks let you use state... Branch 2 of 2">
      </div>
    </div>
  </div>
</div>
```

**R2.3 (Must-Have):** Each node group (`<g>` elements with `data-id`) rendered in the SVG should include a `<title>` child for tooltip/screen-reader fallback. While imperative innerHTML makes this challenging, the title elements provide hover tooltips as a side benefit.

```typescript
// In renderSVG(), for each node:
s += `<g ...><title>${esc(n.role === 'user' ? 'Your message' : 'AI response')}: ${esc(n.label)}</title>`;
```

**R2.4 (Nice-to-Have):** Decorative SVG elements (grid dots, glow effects, aura circles, specular highlights) should carry `aria-hidden="true"`. The grid canvas (`gridRef`) should have `aria-hidden="true"` since it is purely decorative.

### How to Implement

The sr-only tree should be a React component that reads from `useGraphStore` and renders a semantic tree mirroring the graph structure. It updates via React (not the imperative rAF loop) because screen reader performance is not frame-rate sensitive.

```css
/* globals.css */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### How to Test

1. Enable VoiceOver (macOS: Cmd+F5) or NVDA (Windows) and navigate the page
2. Verify the graph summary is announced when focus enters the canvas region
3. Verify the sr-only tree is navigable with arrow keys
4. Verify node selection changes are announced
5. Use Chrome Accessibility Tree inspector (DevTools > Accessibility tab) to verify all interactive elements have names

---

## 3. Keyboard Navigation

### Requirement

All functionality must be operable via keyboard alone. No keyboard traps. Logical tab order. Arrow key navigation within composite widgets.

### Why This Matters for Dreamcatcher

Dreamcatcher is a spatial interface where the primary interaction is clicking/dragging nodes on a canvas. Without keyboard support, the entire graph becomes inaccessible to keyboard-only users, screen reader users, and users with motor disabilities who use switch devices.

### Current Keyboard Support

From `ShortcutsHelp.tsx`, the existing shortcuts are:
- `/` -- Focus input
- `Space` -- Fit graph to viewport
- `Escape` -- Exit current mode
- `T` -- Trace path
- `I` -- Toggle inspector
- `L` -- Toggle timeline
- `M` -- Toggle memory shelf
- `?` -- Toggle shortcuts help
- `Shift+Click` -- Multi-select (mouse required)

**Missing:** No way to navigate between nodes, select nodes, open context menu, branch, or read node content via keyboard alone.

### Rules

**R3.1 (Must-Have):** Implement roving tabindex on the graph canvas. The canvas container gets `tabindex="0"`. When focused, arrow keys navigate between nodes. The currently focused node gets `tabindex="0"`, all others get `tabindex="-1"`.

Navigation model (graph-aware, not grid):
- **Down Arrow:** Move to the first child node (follow the reply edge)
- **Up Arrow:** Move to the parent node
- **Left Arrow:** Move to the previous sibling (previous branch)
- **Right Arrow:** Move to the next sibling (next branch)
- **Enter:** Select node (open inspector)
- **Space:** Set node as active for branching
- **Shift+Enter or Application key:** Open context menu on focused node
- **Escape:** Deselect, exit mode, close panel (cascading)
- **Home:** Jump to root node
- **End:** Jump to the last node in the active branch

**R3.2 (Must-Have):** The tab order must follow a logical sequence:

1. Skip-to-content link (new -- see R3.4)
2. Session pill
3. Model selector
4. Timeline toggle
5. Canvas (single tab stop -- arrow keys navigate within)
6. Canvas tools toolbar (when visible)
7. Floating input
8. Inspector panel (when open)
9. Timeline panel (when open)
10. Memory shelf (when open)

**R3.3 (Must-Have):** No keyboard traps. Every modal and overlay must be escapable:
- ShortcutsHelp: Escape closes (already implemented)
- LearnOverlay: Escape closes (already implemented via `closeLearning`)
- ContextMenu: Escape closes (already implemented)
- Model selector dropdown: Escape must close (not currently implemented -- dropdown opens on click but has no Escape handler)
- Inspector panel: Escape must close when focused

**R3.4 (Must-Have):** Add a skip-to-content link as the first focusable element. For Dreamcatcher, "content" is the floating input -- the primary action.

```html
<a href="#dc-input" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[999]"
   style="/* glass treatment when visible */">
  Skip to input
</a>
```

**R3.5 (Nice-to-Have):** Multi-select via keyboard: `Shift+Arrow` extends selection, `Ctrl+A` selects all visible nodes.

### How to Implement

Create a `useCanvasKeyboard` hook that listens for keydown when the canvas has focus:

```typescript
function useCanvasKeyboard(canvasRef: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleKey = (e: KeyboardEvent) => {
      const { nodes, edges } = useGraphStore.getState();
      const { selectedNodeId } = useUIStore.getState();

      switch (e.key) {
        case 'ArrowDown': {
          // Find first child of selected node
          const childEdge = edges.find(edge => edge.from === selectedNodeId);
          if (childEdge) {
            useUIStore.getState().setSelectedNode(childEdge.to);
            // Pan to node
            const body = useGraphStore.getState().bodies[childEdge.to];
            if (body) useUIStore.getState().animateTo(body.x, body.y);
          }
          e.preventDefault();
          break;
        }
        case 'ArrowUp': {
          // Find parent
          const node = nodes.find(n => n.id === selectedNodeId);
          if (node?.parentId) {
            useUIStore.getState().setSelectedNode(node.parentId);
            const body = useGraphStore.getState().bodies[node.parentId];
            if (body) useUIStore.getState().animateTo(body.x, body.y);
          }
          e.preventDefault();
          break;
        }
        // ... Left/Right for siblings, Enter for inspect, etc.
      }
    };

    el.addEventListener('keydown', handleKey);
    return () => el.removeEventListener('keydown', handleKey);
  }, [canvasRef]);
}
```

### How to Test

1. Unplug the mouse. Navigate the entire application using only keyboard
2. Verify every interactive element is reachable via Tab
3. Verify arrow keys navigate nodes in the graph when canvas is focused
4. Verify no focus traps exist (Tab always moves forward, Shift+Tab always moves backward)
5. Verify Escape cascades correctly (close innermost panel/overlay first)
6. Open the model selector dropdown and verify Escape closes it

---

## 4. Focus Management

### Requirement

Focus must be visible, predictable, and managed programmatically during dynamic UI changes. WCAG 2.4.7 (Focus Visible, AA) and 2.4.13 (Focus Appearance, AAA) define minimum requirements.

### Why This Matters for Dreamcatcher

The floating UI architecture means panels slide in/out, modals appear, context menus open at cursor position, and the canvas captures all pointer events. Without intentional focus management, keyboard users lose their place constantly.

### Current Issues

1. `globals.css` has no focus styles beyond browser defaults
2. The glass treatment panels have no visible focus indicators
3. When Inspector opens (`setSelectedNode` triggers `inspectorOpen: true`), focus does not move to the panel
4. When LearnOverlay opens, focus is not trapped within the overlay
5. When ContextMenu opens, focus is not moved to the first menu item
6. The floating input has a visual focus state (accent border glow at `FloatingUI.tsx:268-278`) but no outline -- this may be invisible to users who rely on high contrast mode

### Rules

**R4.1 (Must-Have):** Every interactive element must have a visible focus indicator meeting WCAG 2.4.13: at least 2px thick, contrast ratio >= 3:1 between focused and unfocused states.

```css
/* globals.css */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Glass-surface buttons get a softer treatment */
button:focus-visible,
[role="menuitem"]:focus-visible {
  outline: 2px solid rgba(221, 0, 0, 0.6);
  outline-offset: 1px;
  box-shadow: 0 0 0 4px rgba(221, 0, 0, 0.08);
}
```

The ACCENT red (`#DD0000`) on E[2] (`#13120F`) achieves approximately 4.3:1 -- above the 3:1 requirement for focus indicators. On lighter surfaces like E[6], this ratio drops, so include the box-shadow as a secondary indicator.

**R4.2 (Must-Have):** When a panel or overlay opens, move focus to the first interactive element inside it:

| Trigger | Focus Target |
|---------|-------------|
| Inspector opens | Close button in inspector header |
| LearnOverlay opens | First learn mode button |
| ContextMenu opens | First menu item |
| ShortcutsHelp opens | Close button |
| Model selector opens | Currently selected model option |
| Path trace starts | The "Exit trace" action or the trace step display |

**R4.3 (Must-Have):** When a panel or overlay closes, return focus to the element that triggered it:

```typescript
// Pattern: store the trigger element before opening
const triggerRef = useRef<HTMLElement | null>(null);

const openPanel = (triggerElement: HTMLElement) => {
  triggerRef.current = triggerElement;
  setOpen(true);
};

const closePanel = () => {
  setOpen(false);
  // Return focus after React re-render
  requestAnimationFrame(() => {
    triggerRef.current?.focus();
    triggerRef.current = null;
  });
};
```

**R4.4 (Must-Have):** Trap focus inside modal overlays. LearnOverlay and ShortcutsHelp are modals (they have backdrop overlays that block interaction). Focus must cycle within these when open.

```typescript
// Focus trap utility
function useFocusTrap(containerRef: RefObject<HTMLElement>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    first?.focus();
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isOpen]);
}
```

**R4.5 (Must-Have):** When a node is selected on the canvas via keyboard (arrow key navigation), announce the selection. Move visual focus (the accent selection ring) to the node and pan the viewport to center it.

**R4.6 (Nice-to-Have):** When the model selector dropdown is open, arrow keys should navigate between options (roving tabindex pattern). Enter selects, Escape closes.

### How to Test

1. Tab through the entire interface -- verify the blue/red focus ring is visible on every interactive element
2. Open each panel/overlay and verify focus moves inside
3. Close each panel/overlay and verify focus returns to the trigger
4. In LearnOverlay, verify Tab cycles within the overlay and does not escape to the page behind
5. Windows High Contrast Mode: verify focus indicators remain visible (outlines survive, box-shadows do not)
6. Verify `document.activeElement` always points to a meaningful element (never `<body>` after a panel transition)

---

## 5. Motion and Animation

### Requirement

Respect `prefers-reduced-motion`. WCAG 2.3.3 (Animation from Interactions, AAA) requires that motion triggered by interaction can be disabled. No content should flash more than 3 times per second (WCAG 2.3.1, A).

### Why This Matters for Dreamcatcher

Dreamcatcher uses extensive animation: physics simulation (continuous node movement), entrance animations, streaming pulse effects, breathing selection rings, dash-offset animations on edges, panel slide transitions, ripple effects, drag trails, and canvas panning. For users with vestibular disorders, this much motion can trigger nausea, dizziness, and migraines.

### Current Animation Inventory

| Animation | Location | Type | Essential? |
|-----------|----------|------|-----------|
| Physics force layout | `simulation.ts` | Continuous | No -- nodes can be static |
| Node entrance scale | `effects.ts` | Triggered | No |
| Streaming pulse | `effects.ts` | Continuous loop | Partially -- state indication is essential, pulsing is not |
| Selection breathing ring | `GraphCanvas.tsx:436` | Continuous loop | No |
| Edge dash animation | `GraphCanvas.tsx:279` | Continuous loop | No |
| AI core pulsing | `GraphCanvas.tsx:372` | Continuous loop | No |
| Panel slide transitions | Inspector, Timeline | Triggered | No |
| Input expand/contract | `FloatingUI.tsx:259` | Triggered | No |
| Ripple effects | `effects.ts` | Triggered | No |
| Canvas pan/zoom | `GraphCanvas.tsx` | User-initiated | Partially |
| Viewport animateTo | `ui-store.ts:128` | Triggered | No |

### Rules

**R5.1 (Must-Have):** Detect `prefers-reduced-motion` and disable all non-essential animation.

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```typescript
// lib/motion.ts — runtime detection for JavaScript animations
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Listen for changes (user can toggle system setting while app is open)
export function onMotionPreferenceChange(callback: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
```

**R5.2 (Must-Have):** When reduced motion is preferred, replace continuous animations with static alternatives:

| Animation | Reduced-Motion Alternative |
|-----------|---------------------------|
| Physics force layout | Disable velocity, show nodes at final positions immediately |
| Node entrance scale | Instant appearance, no scale transition |
| Streaming pulse | Static indicator (solid ring, no pulse) |
| Selection breathing | Static ring, no oscillation |
| Edge dash animation | Static dashes, no offset animation |
| AI core pulse | Static opacity, no oscillation |
| Panel slides | Instant show/hide (opacity only, no transform) |
| Ripple effects | Disabled entirely |
| Canvas animateTo | Instant jump, no interpolation |

**R5.3 (Must-Have):** The streaming state must remain perceivable without animation. Replace the pulsing ring with a static visual indicator:

```typescript
// When reduced motion is active:
if (streamPulse !== null && prefersReducedMotion()) {
  // Static streaming indicator: solid accent ring + "(streaming)" text label
  s += `<circle cx="0" cy="0" r="${r + 5}" fill="none" stroke="${modelColor}" stroke-width="2" opacity="0.5"/>`;
  s += `<text x="0" y="${r + 32}" text-anchor="middle" fill="${modelColor}" font-size="9" opacity="0.7">streaming</text>`;
}
```

**R5.4 (Must-Have):** No content may flash more than 3 times per second. The streaming pulse (`sin(timeRef.current * 4)` at `GraphCanvas.tsx:390`) oscillates at ~0.64 Hz -- this is safe. But verify any future animations stay below 3 Hz.

**R5.5 (Nice-to-Have):** Provide an in-app toggle for reduced motion (not just OS-level). Store preference in localStorage. Some users want reduced motion in specific applications but not system-wide.

### How to Implement

Add a `reducedMotion` boolean to the UI store. Check it in the rAF render loop, the effects system, and all transition styles.

```typescript
// In GraphCanvas.tsx render loop:
const reduced = prefersReducedMotion();
const DURATION_MULT = reduced ? 0 : 1;

// In effects.ts:
export function tickEffects(state: EffectsState, dt: number, reduced: boolean): void {
  if (reduced) {
    // Skip all effect processing, clear active effects
    state.entrances.clear();
    state.ripples.length = 0;
    return;
  }
  // ... normal tick
}
```

### How to Test

1. macOS: System Preferences > Accessibility > Display > Reduce motion
2. Windows: Settings > Ease of Access > Display > Show animations
3. CSS: Use Chrome DevTools "Rendering" tab > Emulate CSS media feature `prefers-reduced-motion: reduce`
4. Verify all animations stop or reduce to instant transitions
5. Verify streaming state is still perceivable (static indicator, not pulse)
6. Verify the graph remains fully usable without any animation

---

## 6. Color Independence and Color Blindness

### Requirement

Color must not be the sole means of conveying information (WCAG 1.4.1, A). All information conveyed by color must also be available through other means: shape, pattern, position, label, or icon.

### Why This Matters for Dreamcatcher

Dreamcatcher uses a luminance-only palette with a single red accent. This is actually advantageous for color blind users -- luminance differences are preserved across all forms of color blindness. However, there are specific risks:

1. **Red accent (`#DD0000`):** Protanopia (red-blind) users see this as very dark -- nearly black against E[1]. The accent becomes invisible.
2. **Model-branded colors:** Anthropic amber (`#D4A574`), OpenAI green (`#10A37F`), Google blue (`#4285F4`), Qwen indigo (`#6366F1`) are used to distinguish AI providers. Under deuteranopia, the amber and green become indistinguishable.
3. **Edge types:** Reply, branch, and regeneration edges are differentiated partly by color (gray, gray, red). The red regeneration edges may be invisible to protanopic users.

### Rules

**R6.1 (Must-Have):** The ACCENT red must never be the sole indicator of state. Every use of red currently in the codebase must be paired with a non-color signal:

| Red Usage | Current | Required Non-Color Signal |
|-----------|---------|---------------------------|
| Selection ring | Red ring around node | Ring shape + "selected" sr-only label |
| Streaming indicator | Red pulse | Ring + "streaming" text label |
| Focus on input | Red border glow | Border shape change (wider) + focus outline |
| Learn mode header | "LEARN MODE" in red | Uppercase text + icon already present |
| Error text | Red text | Icon prefix (warning triangle) + text |
| Path trace ring | Red accent ring | Ring + step counter label |

**R6.2 (Must-Have):** Model identification must not rely solely on color. AI nodes currently use subtle chromatic tints that are indistinguishable under color blindness. Ensure the model icon (already rendered at LOD 2+) is the primary identifier, with the model name in the inspector providing the text fallback.

**R6.3 (Must-Have):** Edge types must be distinguishable without color. The current differentiation is:

| Edge Type | Distinguishing Features | Color-Blind Safe? |
|-----------|------------------------|-------------------|
| Reply | Solid line, arrowhead | Yes (shape) |
| Branch | Dashed (12 6), arrowhead | Yes (dash pattern) |
| Regeneration | Short dashed (2 6), arrowhead | Partially -- dash similar to branch |
| Summarizes | Micro-dashed (1 4) | Yes (unique pattern) |

Regeneration edges need a more distinct dash pattern or a marker shape different from branch edges to be distinguishable without relying on the red color.

**R6.4 (Nice-to-Have):** For protanopia safety, consider a secondary accent color that remains visible: a bright amber/orange (`#FF8800`) as an alternative. Offer a "High Visibility" accent mode that replaces `#DD0000` with `#FF8800`, which maintains ~5:1 contrast on E[1] and is visible to all color blind types except tritanopia (rare, ~0.003% of population).

### How to Test

1. Chrome DevTools: Rendering tab > Emulate vision deficiency > Protanopia, Deuteranopia, Tritanopia, Achromatopsia
2. Verify all information remains perceivable under each simulation
3. Specifically verify: node selection is visible, streaming state is detectable, edge types are distinguishable, model identity is readable
4. Sim-Daltonism (macOS app) for real-time full-screen color blindness simulation

---

## 7. Screen Reader Support

### Requirement

Dynamic content changes must be announced. Interactive elements must have accessible names. The application structure must be navigable by landmark roles.

### Why This Matters for Dreamcatcher

Dreamcatcher is a highly dynamic interface: nodes appear during streaming, the graph layout shifts continuously, panels open and close, and the canvas pans. Without ARIA live regions and proper labeling, screen reader users miss all dynamic content.

### Rules

**R7.1 (Must-Have):** Add ARIA landmark roles to the page structure.

```html
<main aria-label="Dreamcatcher conversation workspace">
  <section aria-label="Conversation graph" role="application">
    <!-- Canvas + sr-only tree -->
  </section>
  <form aria-label="Message input" role="search">
    <!-- Floating input -->
  </form>
  <aside aria-label="Node inspector" aria-hidden={!inspectorOpen}>
    <!-- Inspector panel -->
  </aside>
  <aside aria-label="Conversation timeline" aria-hidden={!timelineOpen}>
    <!-- Timeline panel -->
  </aside>
</main>
```

Note: `role="application"` on the canvas section tells screen readers to pass all keystrokes to the application, enabling the arrow-key graph navigation without screen reader interception.

**R7.2 (Must-Have):** Add an ARIA live region to announce streaming responses. When an AI node is streaming, announce completion.

```html
<div aria-live="polite" aria-atomic="false" class="sr-only" id="dc-announcer">
  <!-- Dynamically updated by React -->
</div>
```

Announcements to make:
- When a message is sent: "Message sent. Waiting for response from [model name]."
- When streaming completes: "Response received from [model name]. [first 100 characters of response]."
- When a branch is created: "Branch created from [parent node label]."
- When a node is selected: "[Role] node selected: [label]."
- When a panel opens/closes: "[Panel name] panel opened/closed."

Use `aria-live="polite"` -- never `"assertive"`. Streaming updates happen continuously and assertive announcements would make the interface unusable.

**R7.3 (Must-Have):** All interactive elements must have accessible names.

Current violations:
- `FloatingUI.tsx:52-54` -- Timeline toggle button has `title` but no `aria-label`. Add `aria-label="Toggle timeline panel"`.
- `FloatingUI.tsx:59-73` -- Model selector button has no accessible name. Add `aria-label={`Select AI model, currently ${model.name}`}`.
- `FloatingUI.tsx:82-99` -- Model dropdown items are `<div>` elements with `onClick`. These must be `<button>` elements or have `role="option"` with proper ARIA.
- `Inspector.tsx:54-72` -- Close button has no accessible name. Add `aria-label="Close inspector"`.
- `ContextMenu.tsx:186-237` -- Menu items are `<div>` elements. Must use `role="menu"` on container and `role="menuitem"` on items.
- `LearnOverlay.tsx:212-219` -- Close button has no accessible name. Add `aria-label="Close learn mode"`.
- `ShortcutsHelp.tsx:72-79` -- Close button has no accessible name. Add `aria-label="Close keyboard shortcuts"`.

**R7.4 (Must-Have):** The context menu must use proper menu ARIA roles.

```html
<div role="menu" aria-label="Node actions">
  <button role="menuitem">Branch from here</button>
  <button role="menuitem">Regenerate</button>
  <div role="separator"></div>
  <button role="menuitem">Inspect</button>
  <button role="menuitem">Copy text</button>
</div>
```

**R7.5 (Must-Have):** The model selector dropdown must use listbox/option ARIA pattern.

```html
<div role="listbox" aria-label="AI model" aria-activedescendant="model-current">
  <div role="option" id="model-claude" aria-selected="true">Claude Sonnet</div>
  <div role="option" id="model-gpt4" aria-selected="false">GPT-4</div>
</div>
```

**R7.6 (Must-Have):** Form inputs must have labels. The floating input (`FloatingUI.tsx:292-307`) uses `placeholder` as the only label. Placeholders disappear when text is entered and are not announced by all screen readers.

```html
<label for="dc-input" class="sr-only">
  Type a message to continue the conversation
</label>
<input id="dc-input" ... />
```

The follow-up input in LearnOverlay (`LearnOverlay.tsx:309-320`) has the same issue.

**R7.7 (Nice-to-Have):** When the inspector shows node content, mark it as a live region so content updates during streaming are announced progressively (not all at once at completion).

### How to Test

1. VoiceOver (macOS): Navigate every element, verify all have names
2. NVDA (Windows): Run through the full flow: type message, wait for response, navigate graph, open inspector
3. axe DevTools: scan for missing labels, roles, and ARIA violations
4. Lighthouse Accessibility audit: target 90+ score
5. Verify announcements: send a message, confirm the "Response received" announcement fires after streaming

---

## 8. Target Sizes

### Requirement

WCAG 2.5.8 (Target Size Minimum, AA) requires interactive targets to be at least 24x24 CSS pixels. WCAG 2.5.5 (Target Size Enhanced, AAA) recommends 44x44 CSS pixels.

### Why This Matters for Dreamcatcher

Small targets in a spatial interface are doubly problematic: users with motor impairments struggle to hit small buttons, and the canvas zoom level further reduces apparent target sizes. Graph nodes at low zoom levels become tiny hit targets.

### Current Target Size Audit

| Element | Current Size | Meets AA (24px)? | Meets AAA (44px)? |
|---------|-------------|-------------------|-------------------|
| Graph nodes (user) | 48px diameter (r=24) | Yes | Yes |
| Graph nodes (AI) | 56px diameter (r=28) | Yes | Yes |
| Inspector close button | 20x20px | FAIL | FAIL |
| ShortcutsHelp close button | ~14x14px (10x10 icon + 2px padding) | FAIL | FAIL |
| LearnOverlay close button | ~18x18px (14x14 icon + 4px padding) | FAIL | FAIL |
| Context menu items | ~36px height, full width | Yes | Partial (height) |
| Action buttons in Inspector | ~24px height, variable width | Borderline | FAIL |
| ToolBtn (canvas tools) | ~36px height, ~80px width | Yes | Partial |
| Timeline toggle button | ~36x36px | Yes | FAIL |
| Model selector button | ~36x40px | Yes | Partial |
| Learn mode buttons | ~40px height, variable width | Yes | Partial |

### Rules

**R8.1 (Must-Have):** All close buttons must be at least 24x24px interactive area. Currently the Inspector close button is 20x20 (`Inspector.tsx:55-56`), ShortcutsHelp close button is ~14x14 (`ShortcutsHelp.tsx:73`), and LearnOverlay close button is ~18x18.

Fix: increase padding to achieve at least 24x24 hit area:
```typescript
// Pattern for all close buttons:
style={{
  width: 32,
  height: 32,
  minWidth: 32,
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // ... existing styles
}}
```

**R8.2 (Must-Have):** Action buttons in the Inspector (`Inspector.tsx:177-195`) have `padding: '4px 9px'` with 10px font. The resulting height is approximately 22px. Increase padding to achieve 24px minimum height:

```typescript
padding: '6px 12px',  // yields ~26px height
```

**R8.3 (Must-Have):** At canvas zoom levels below 50%, node hit targets shrink below 24px apparent size. Implement a minimum hit area that does not scale below 24px regardless of zoom:

```typescript
// In mouse event handlers, use a minimum hit radius
const minHitR = Math.max(body.r * scale, 12); // 24px diameter minimum
```

**R8.4 (Nice-to-Have):** Target 44x44px for all primary action buttons (send, branch, close) to reach AAA and provide comfortable touch targets for future tablet support.

### How to Test

1. Chrome DevTools: measure element dimensions in the Elements panel
2. Use the "Tab Size Bookmarklet" (or similar) to visualize hit areas
3. Zoom the canvas to minimum zoom and verify nodes remain clickable
4. Test on a touch device or use Chrome DevTools touch emulation

---

## 9. Semantic Structure and ARIA

### Requirement

Use semantic HTML elements. Apply ARIA only when native semantics are insufficient. Never use ARIA to override correct native semantics.

### Why This Matters for Dreamcatcher

The current implementation uses `<div>` for most interactive elements (menu items, selectable options, toolbar buttons) and inline styles for all visual treatment. This is common in canvas-heavy applications but results in a flat, unlabeled accessibility tree.

### Rules

**R9.1 (Must-Have):** Use `<button>` for all clickable elements. The following `<div>` elements with `onClick` must become `<button>`:
- Model selector options (`FloatingUI.tsx:83-101`)
- Context menu items (`ContextMenu.tsx:249-270`)
- Learn mode category buttons (already `<button>` -- correct)

**R9.2 (Must-Have):** Set `lang="en"` on the `<html>` element (`layout.tsx`). Verify this is present.

**R9.3 (Must-Have):** Use semantic elements for structural layout:
- The Inspector panel: `<aside>` (already correct)
- The Timeline panel: should be `<aside>` or `<section>` with `aria-label`
- The floating input: should be wrapped in a `<form>` with `role="search"` or a descriptive label
- The canvas area: should be a `<section>` or use `role="application"`

**R9.4 (Must-Have):** The model selector must use the WAI-ARIA listbox pattern or the disclosure (show/hide) pattern. Currently it is a `<div>` with `onClick` toggle and `<div>` children. This is invisible to assistive technology.

```html
<button
  aria-haspopup="listbox"
  aria-expanded={modelOpen}
  aria-label={`AI model: ${model.name}`}
>
  {model.name}
</button>
{modelOpen && (
  <div role="listbox" aria-label="Available AI models">
    {MODELS.map(m => (
      <button
        key={m.id}
        role="option"
        aria-selected={m.id === selectedModelId}
        onClick={...}
      >
        {m.name}
      </button>
    ))}
  </div>
)}
```

**R9.5 (Must-Have):** The `disabled` state on the floating input during streaming must be communicated:

```html
<input
  aria-disabled={streaming}
  aria-describedby="input-status"
/>
<span id="input-status" class="sr-only">
  {streaming ? 'AI is generating a response. Please wait.' : ''}
</span>
```

**R9.6 (Nice-to-Have):** Heading hierarchy. Currently no headings exist in the application. For screen reader navigation, add visually hidden headings:

```html
<h1 class="sr-only">Dreamcatcher - Spatial Conversation Interface</h1>
<!-- In Inspector: -->
<h2 class="sr-only">Node Inspector</h2>
<!-- In Timeline: -->
<h2 class="sr-only">Conversation Timeline</h2>
<!-- In Memory Shelf: -->
<h2 class="sr-only">Memory Shelf</h2>
```

### How to Test

1. Chrome DevTools Accessibility Tree: verify the tree shows meaningful names and roles for all elements
2. axe DevTools: scan for ARIA violations, missing roles, and semantic issues
3. HTML validator: verify valid HTML5 (no `<div>` with `role="button"` when `<button>` would suffice)
4. Screen reader: navigate by headings (H key in NVDA/VoiceOver) and landmarks (D key)

---

## 10. Testing Protocol

### Automated Testing

Run before every deploy:

| Tool | What It Catches | Target Score |
|------|----------------|--------------|
| axe DevTools (browser extension) | Contrast, missing labels, ARIA violations | 0 critical, 0 serious |
| Lighthouse Accessibility | Overall compliance score | 90+ |
| eslint-plugin-jsx-a11y | Missing alt text, invalid ARIA in JSX | 0 errors |
| Pa11y CI | Automated regression testing | 0 errors |

### Manual Testing Checklist

Run before each release:

**Keyboard Testing (30 minutes)**
- [ ] Tab through entire interface -- all interactive elements reachable
- [ ] Arrow keys navigate graph nodes
- [ ] Enter selects node, Space sets active node
- [ ] Escape cascades correctly (innermost first)
- [ ] No keyboard traps anywhere
- [ ] Focus visible on every focused element
- [ ] Skip-to-content link works

**Screen Reader Testing (45 minutes)**
- [ ] VoiceOver (Safari): full flow -- type message, receive response, navigate graph, open inspector
- [ ] NVDA (Chrome on Windows): same flow if available
- [ ] Graph tree view navigable with arrow keys
- [ ] Dynamic announcements fire for: message sent, response received, node selected, panel opened/closed
- [ ] All buttons/inputs have accessible names
- [ ] Landmarks navigable

**Visual Testing (20 minutes)**
- [ ] 200% browser zoom -- all content visible, no overlap, no truncation
- [ ] Windows High Contrast Mode -- focus indicators visible, UI structure intact
- [ ] Color blindness simulation (Protanopia, Deuteranopia) -- all info perceivable
- [ ] Reduced motion -- all animations stopped, streaming state still visible

**Touch Testing (15 minutes, if applicable)**
- [ ] All targets >= 24px at default zoom
- [ ] Nodes clickable at minimum canvas zoom
- [ ] Panels scrollable
- [ ] No double-tap issues

### Regression Testing

Add these to the test suite:

```typescript
// __tests__/a11y/contrast.test.ts
import { T, E } from '@/lib/theme';

function contrastRatio(hex1: string, hex2: string): number {
  // Calculate relative luminance and contrast ratio
  // Implementation: WCAG 2.0 contrast algorithm
}

describe('Color Contrast', () => {
  test('body text tokens meet AA on canvas background', () => {
    expect(contrastRatio(T.tertiary, E[1])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(T.secondary, E[1])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(T.primary, E[1])).toBeGreaterThanOrEqual(4.5);
  });

  test('subtle text meets AA for large text on canvas', () => {
    expect(contrastRatio(T.subtle, E[1])).toBeGreaterThanOrEqual(3.0);
  });

  test('ghost text does NOT meet AA (decorative only)', () => {
    expect(contrastRatio(T.ghost, E[1])).toBeLessThan(4.5);
    // This is expected -- T.ghost must never carry semantic content
  });

  test('ACCENT meets 3:1 for UI components on canvas', () => {
    expect(contrastRatio('#DD0000', E[1])).toBeGreaterThanOrEqual(3.0);
  });
});
```

```typescript
// __tests__/a11y/target-size.test.ts (using Playwright)
test('close buttons meet 24px minimum', async ({ page }) => {
  // Open inspector
  // Measure close button dimensions
  const btn = page.locator('[aria-label="Close inspector"]');
  const box = await btn.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(24);
  expect(box?.height).toBeGreaterThanOrEqual(24);
});
```

---

## 11. Implementation Priority

### Phase 1: Beta Launch (Must-Have, ~5 days)

These are blocking for a public beta. Without them, the product is inaccessible to keyboard users, screen reader users, and users with low vision.

| # | Task | WCAG | Effort | Files |
|---|------|------|--------|-------|
| 1 | Add `sr-only` CSS class and skip-to-content link | 2.4.1 | 2h | `globals.css`, `page.tsx` |
| 2 | Fix all text contrast violations (promote T.ghost/T.dim usage) | 1.4.3 | 3h | `Inspector.tsx`, `GraphCanvas.tsx`, `ShortcutsHelp.tsx`, `StatusBar.tsx` |
| 3 | Add `:focus-visible` styles globally | 2.4.7 | 2h | `globals.css` |
| 4 | Add `aria-label` to all buttons and interactive elements | 4.1.2 | 4h | `FloatingUI.tsx`, `Inspector.tsx`, `ContextMenu.tsx`, `LearnOverlay.tsx`, `ShortcutsHelp.tsx` |
| 5 | Add `<label>` to floating input and learn overlay input | 1.3.1 | 1h | `FloatingUI.tsx`, `LearnOverlay.tsx` |
| 6 | Convert `<div onClick>` to `<button>` throughout | 4.1.2 | 3h | `FloatingUI.tsx`, `ContextMenu.tsx` |
| 7 | Add ARIA roles to context menu (`role="menu"`, `role="menuitem"`) | 4.1.2 | 2h | `ContextMenu.tsx` |
| 8 | Add ARIA roles to model selector (listbox pattern) | 4.1.2 | 3h | `FloatingUI.tsx` |
| 9 | Implement `prefers-reduced-motion` (CSS + JS detection) | 2.3.3 | 4h | `globals.css`, `GraphCanvas.tsx`, `effects.ts`, new `lib/motion.ts` |
| 10 | Add ARIA live region for announcements | 4.1.3 | 3h | `page.tsx`, `FloatingUI.tsx` |
| 11 | Add `aria-label` to SVG canvas with graph summary | 1.1.1 | 2h | `GraphCanvas.tsx` |
| 12 | Fix close button target sizes (24px minimum) | 2.5.8 | 1h | `Inspector.tsx`, `ShortcutsHelp.tsx`, `LearnOverlay.tsx` |
| 13 | Add landmark roles to page structure | 1.3.1 | 2h | `page.tsx`, `FloatingUI.tsx` |
| 14 | Focus management: move focus on panel open/close | 2.4.3 | 4h | `Inspector.tsx`, `LearnOverlay.tsx`, `ShortcutsHelp.tsx`, `ContextMenu.tsx` |
| 15 | Focus trap in LearnOverlay and ShortcutsHelp | 2.1.2 | 3h | `LearnOverlay.tsx`, `ShortcutsHelp.tsx` |

**Total Phase 1: ~39 hours (~5 days)**

### Phase 2: Post-Beta (Nice-to-Have, ~8 days)

These improve the experience significantly but are not blocking for an initial beta launch.

| # | Task | WCAG | Effort | Files |
|---|------|------|--------|-------|
| 16 | Canvas keyboard navigation (arrow keys between nodes) | 2.1.1 | 12h | New `hooks/useCanvasKeyboard.ts`, `GraphCanvas.tsx` |
| 17 | Screen-reader-only tree view of graph | 1.3.1 | 8h | New `components/a11y/GraphTreeView.tsx` |
| 18 | Reduced motion: disable physics simulation | 2.3.3 | 4h | `simulation.ts`, `GraphCanvas.tsx` |
| 19 | In-app reduced motion toggle | 2.3.3 | 3h | `ui-store.ts`, new settings UI |
| 20 | High-visibility accent mode for protanopia | 1.4.1 | 4h | `theme.ts`, `ui-store.ts` |
| 21 | Model selector keyboard navigation (arrow keys) | 2.1.1 | 3h | `FloatingUI.tsx` |
| 22 | Minimum canvas hit area (24px at any zoom) | 2.5.8 | 3h | `GraphCanvas.tsx` |
| 23 | Heading hierarchy (visually hidden) | 1.3.1 | 2h | All panel components |
| 24 | Streaming content live region in Inspector | 4.1.3 | 3h | `Inspector.tsx` |
| 25 | Contrast regression tests | 1.4.3 | 4h | New test file |
| 26 | Playwright a11y integration tests | All | 8h | New test files |

**Total Phase 2: ~54 hours (~8 days)**

### Phase 3: Premium Accessibility (AAA aspirational)

| # | Task | WCAG | Notes |
|---|------|------|-------|
| 27 | AAA contrast (7:1 for all body text) | 1.4.6 | May require palette adjustment |
| 28 | 44px targets on all interactive elements | 2.5.5 | Touch/tablet readiness |
| 29 | Extended keyboard shortcuts with customization | 2.1.1 | Power user feature |
| 30 | Graph sonification (audio representation of structure) | 1.1.1 | Research project |
| 31 | High contrast theme (not just high visibility accent) | 1.4.11 | Full theme variant |

---

## References

Research sources informing these guidelines:

- [Complete Accessibility Guide for Dark Mode and High Contrast (2026)](https://blog.greeden.me/en/2026/02/23/complete-accessibility-guide-for-dark-mode-and-high-contrast-color-design-contrast-validation-respecting-os-settings-icons-images-and-focus-visibility-wcag-2-1-aa/)
- [Dark Mode: Best Practices for Accessibility -- DubBot](https://dubbot.com/dubblog/2023/dark-mode-a11y.html)
- [The Designer's Guide to Dark Mode Accessibility](https://www.accessibilitychecker.org/blog/dark-mode-accessibility/)
- [WCAG 2.2 Understanding: Contrast Minimum (1.4.3)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [Contrast Requirements for WCAG 2.2 Level AA](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)
- [Using ARIA to Enhance SVG Accessibility -- TPGi](https://www.tpgi.com/using-aria-enhance-svg-accessibility/)
- [Accessible SVG and ARIA -- EU Data Visualization Guide](https://data.europa.eu/apps/data-visualisation-guide/accessible-svg-and-aria)
- [Creating Accessible SVGs -- Deque](https://www.deque.com/blog/creating-accessible-svgs/)
- [How to Build Accessible Graph Visualization Tools -- Cambridge Intelligence](https://cambridge-intelligence.com/build-accessible-data-visualization-apps-with-keylines/)
- [Rich Screen Reader Experiences for Accessible Data Visualization -- MIT](https://vis.csail.mit.edu/pubs/rich-screen-reader-vis-experiences/)
- [Developing a Keyboard Interface -- WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [Keyboard-Navigable JavaScript Widgets -- MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable_JavaScript_widgets)
- [Managing Focus and Visible Focus Indicators -- TPGi/Vispero](https://www.tpgi.com/managing-focus-and-visible-focus-indicators-practical-accessibility-guidance-for-the-web/)
- [A Guide to Designing Accessible Focus Indicators -- Sara Soueidan](https://www.sarasoueidan.com/blog/focus-indicators/)
- [WCAG 2.4.13 Focus Appearance -- W3C Understanding](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [prefers-reduced-motion -- MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)
- [C39: Using the CSS prefers-reduced-motion query -- W3C Techniques](https://www.w3.org/WAI/WCAG21/Techniques/css/C39)
- [WCAG 2.3.3 Animation from Interactions -- W3C Understanding](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [Design Accessible Animation and Movement -- Pope Tech](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- [Dark Mode Accessibility Myth Debunked -- Stephanie Walter](https://stephaniewalter.design/blog/dark-mode-accessibility-myth-debunked/)
- [Why Dark Mode Causes More Accessibility Issues Than It Solves -- H Locke](https://medium.com/@h_locke/why-dark-mode-causes-more-accessibility-issues-than-it-solves-54cddf6466f5)
- [Light Mode vs Dark Mode for Low Vision -- Perkins School for the Blind](https://www.perkins.org/resource/dark-mode-for-low-vision/)
- [Coloring for Colorblindness -- David Math Logic](https://davidmathlogic.com/colorblind/)
- [10 Essential Guidelines for Colorblind Friendly Design](https://www.colorblindguide.com/post/colorblind-friendly-design-3)
- [WCAG 2.5.8 Target Size Minimum -- W3C Understanding](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [ARIA Live Regions -- MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [ARIA-live Announcements Cheatsheet -- Right Said James](https://rightsaidjames.com/2025/08/aria-live-regions-when-to-use-polite-assertive/)
- [Switch Pattern -- WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
- [An Accessible Dark Mode Toggle in React -- DEV Community](https://dev.to/abbeyperini/an-accessible-dark-mode-toggle-in-react-aop)
- [Accessible Charts with ARIA -- Fizz Studio](https://fizz.studio/blog/accessible-charts-with-aria/)
- [Navigation Treeview Example -- WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/examples/treeview-navigation/)
