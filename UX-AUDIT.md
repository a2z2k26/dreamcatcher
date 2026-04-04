# Dreamcacher UX Audit

**Date**: 2026-03-25
**Reviewer**: UX Research (Bumba Agent Team)
**Scope**: Complete front-end application code review — all components, stores, and interaction patterns
**Method**: Heuristic evaluation against Nielsen's 10 usability heuristics, cognitive walkthrough of first-time and expert user flows, interaction pattern analysis

---

## Executive Summary

Dreamcacher has a well-conceived spatial metaphor and a rich feature set that covers branching, clipping, memory, path tracing, learning, and session management. The underlying architecture is sound — clean state management, LOD-aware rendering, and thoughtful visual hierarchy.

The critical gaps are all about surfacing what already exists. The application drops a first-time user onto a blank canvas with zero guidance, hides its most powerful features behind right-click and keyboard shortcuts that have no visual affordance, and provides minimal feedback when key actions succeed or fail. The result is a tool that rewards the expert who learns its vocabulary but punishes the newcomer who doesn't know the vocabulary exists.

The recommendations below are ordered by impact. Implementing the top three would materially change the first-session retention curve.

---

## 1. First-Time User Experience

### Current State

When the application loads, `SessionInit` runs `initialize()` which creates a default session and loads an empty graph. The user sees:

- A dark canvas with a dot grid
- A collapsed input bar at the bottom ("Ask anything...")
- A "DC" session pill at the top center
- A model selector and timeline toggle at the top right
- A memory shelf toggle button at the left (just an icon)
- A status bar at the bottom showing "Empty" phase, 0 nodes, 0 edges

There is no onboarding, no tooltip, no welcome message, no empty-state illustration, and no explanation of what this tool is or how it differs from a standard chat interface. The `ShortcutsHelp` overlay exists but requires pressing `?` to open — a shortcut the user would need to already know about.

### Analysis

The blank canvas communicates nothing about the spatial paradigm. A user coming from ChatGPT or Claude will type into the input bar, get a response, and see it appear as two dots connected by a line. They will have no mental model for why this is a graph instead of a chat thread, and no reason to explore branching, clipping, or path tracing. The entire value proposition of Dreamcacher — that conversations are explorable, branchable, and spatially navigable — is invisible until the user accidentally discovers it.

The `LearnOverlay` component, which is one of the most differentiated features, is only accessible via right-click context menu on AI nodes. There is no hint anywhere in the UI that this feature exists.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| F1 | CRITICAL | Add a first-run experience. On the first session (detect via localStorage or session count), show a brief (~3 step) contextual walkthrough: (1) "Type here to start a conversation" pointing at the input, (2) "Right-click any response to branch, learn, or save" with a visual hint, (3) "Your conversation grows as a graph you can explore" with an illustration of a branched graph. Dismiss on first message sent. |
| F2 | HIGH | Add a canvas empty state. When the graph has zero nodes, render a centered illustration or text on the canvas itself — something like "Start a conversation below. It grows into a graph you can branch and explore." This replaces the blank void. |
| F3 | HIGH | Show the keyboard shortcuts hint on first load. A small, dismissible badge near the input like "Press ? for shortcuts" that disappears after the user dismisses it or after first use. |
| F4 | MEDIUM | Add a "What is Dreamcacher?" link or tooltip in the session pill's open state. One sentence: "Spatial conversations you can branch, save, and trace." |

---

## 2. Feature Discoverability

### Current State

Feature discovery relies almost entirely on two mechanisms:

1. **Right-click context menu on nodes**: Branch, Regenerate, Learn, Save as memory, Inspect, Copy, Show all paths. This is the primary discovery surface for 6 out of 8 core actions.
2. **Keyboard shortcuts**: `/` (focus input), `Space` (fit view), `T` (path trace), `I` (inspector), `L` (timeline), `M` (memory shelf), `?` (shortcuts help), `Shift+Click` (multi-select), `Escape` (exit mode).

There is also a `CanvasTools` floating toolbar that appears when a node is selected, but it only exposes 3 of the 8 context menu actions (Branch, Clip, Inspect), and the Clip button's `onClick` is currently a no-op (`() => {}`).

The drag-to-hotspot pattern (drag a node to the left edge to trigger Learn or Remember) has zero discoverability. The hotspot zones only appear while dragging, labeled in faint vertical text. A user would need to accidentally drag a node to the edge of the screen to discover this.

### Analysis

Right-click is a power-user convention. On touch devices it doesn't exist. On desktop, many users never right-click inside web applications. This means the application's entire feature surface — branching, regeneration, learning, memory saving, path comparison — is behind an interaction pattern that a large segment of users will never perform.

The keyboard shortcuts are well-chosen but entirely undiscoverable. The `ShortcutsHelp` overlay requires pressing `?` which is itself undiscoverable.

The `CanvasTools` toolbar is the right pattern — it surfaces actions in context when a node is selected. But it only appears for single selection and is missing 5 of the 8 actions.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| D1 | CRITICAL | Expand the CanvasTools floating toolbar to include all primary actions for the selected node — not just Branch/Clip/Inspect, but also Regenerate (for AI nodes), Learn (for AI nodes), and Save as Memory. This toolbar is the most discoverable surface for node actions. |
| D2 | CRITICAL | Wire up the Clip button in CanvasTools. Currently `onClick={() => {}}` is a dead end. It should either initiate multi-select mode with a prompt ("Shift+click to select nodes, then clip") or start clipping the selected node's subgraph. |
| D3 | HIGH | Add a persistent "?" button to the UI chrome — either in the status bar or near the top controls. Users need a visible entry point to the shortcuts reference. |
| D4 | HIGH | Add touch support for the context menu. Long-press on a node should open the same context menu that right-click opens. Without this, the app is effectively unusable on tablets. |
| D5 | MEDIUM | Add tooltips to all icon-only buttons. The timeline toggle, model selector icon, and memory shelf toggle have no visible labels. Title attributes exist on some (`title="Toggle timeline (L)"`) but tooltips should be rendered as visible UI on hover, not just native browser tooltips. |
| D6 | MEDIUM | Replace the drag-to-hotspot pattern with explicit actions. Drag-to-zone is a novel interaction with no precedent the user would recognize. The same actions (Learn, Remember) are already available through the context menu and should be the primary path. If the hotspot pattern is kept, it should be documented in the onboarding and shortcuts help. |
| D7 | LOW | Add inline hints in the Inspector panel. When the Inspector opens showing a node, the "Actions" section at the bottom could include brief descriptions: "Branch: continue the conversation from this point" rather than bare button labels. |

---

## 3. Information Architecture

### Current State

The application has four panel-like surfaces:

| Panel | Position | Toggle | Purpose |
|-------|----------|--------|---------|
| Inspector | Right, 280px | Click node or press `I` | Node details, metadata, actions |
| Timeline | Right, 400px | Top-right button or `L` | Linear reading of the active conversation path |
| Memory Shelf | Left, 280px | Left toggle button or `M` | Saved memories (clips, nodes, paths) |
| Learn Overlay | Center modal | Right-click node > "Learn about this" | Educational deep-dive on a node |

The Inspector and Timeline both slide in from the right. If both are open simultaneously, the Timeline (z-index 70) overlaps the Inspector (z-index 60), and the Inspector positions at `right: 0` with `top: 36` while the Timeline positions at `right: 0` from `top: 0`. They will overlap visually.

The Session Pill at the top center manages sessions. The StatusBar at the bottom shows model, phase, and statistics.

### Analysis

The right-side collision between Inspector and Timeline is a layout problem. These panels serve different purposes — the Inspector is about a single node, the Timeline is about the conversation thread — but they fight for the same screen real estate with no coordination.

The Memory Shelf on the left is well-positioned and doesn't conflict with anything. Its empty state ("No memories saved yet. Right-click a node > Save as memory") is one of the few good empty-state implementations in the app.

The Session Pill's three-state interaction (collapsed > peek on hover > open on click) is elegant but the 600ms hover delay before peek may feel unresponsive. Users may click immediately and jump straight to the open state, bypassing the peek preview entirely.

The StatusBar provides good ambient information (model, phase, node count, token estimate) but at 9px font size it may be too subtle to notice.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| A1 | HIGH | Resolve the Inspector/Timeline overlap. When the Timeline opens, either: (a) close the Inspector automatically and show a way to reopen it, (b) dock the Inspector inside the Timeline as a collapsible section, or (c) shift the Inspector leftward by the Timeline's width. Option (a) is simplest. |
| A2 | MEDIUM | Reduce the Session Pill hover-to-peek delay from 600ms to 300ms. 600ms is long enough that most users will click before it triggers. |
| A3 | MEDIUM | Consider making the StatusBar slightly taller (28-32px) with 10-11px text. At 24px/9px, the useful information it carries (token count, phase) is easy to miss. |
| A4 | LOW | Group the top-right controls (model selector + timeline toggle) with labels. Currently they are two small glass-effect buttons with minimal visual differentiation. Adding a tiny text label below or beside each would help. |

---

## 4. Interaction Patterns

### Current State

**Branching**: Right-click > "Branch from here" sets the node as activeNodeId and focuses the input. The input bar shows a "BRANCH" label in blue. The next message creates a new branch edge. Alternatively, click a node to select it, then the CanvasTools "Branch" button does the same.

**Clipping**: Shift+click multiple nodes to build a multi-selection. When 2+ nodes are selected, the `ClipCreator` floating pill appears above the canvas tools with "[N] nodes" count and a "Clip" button. Clicking Clip prompts for a name, then saves to memory store.

**Path Trace**: Press `T` with a node selected. A `PathTrace` floating bar appears at the bottom with step counter, previous/next buttons, and keyboard arrows for navigation. The canvas auto-pans and dims non-path nodes.

**Regeneration**: Right-click AI node > "Regenerate". Creates a sibling AI node offset 140px to the right, calls the API with temperature 1.0.

**Learning**: Right-click AI node > "Learn about this". Opens the LearnOverlay modal with four educational prompts (Explain, Why this decision, Background, Alternatives).

**Multi-select**: Shift+click nodes. Selection shown with dimmer dashed rings. The `ClipCreator` appears when 2+ are selected.

**Drag**: Click-and-drag a node repositions it with physics, creates drag trail effects. Drag to left-edge hotspots triggers Learn (top half) or Remember (bottom half).

### Analysis

**Branching is well-designed.** The flow from right-click > Branch > input focus > "BRANCH" indicator is a clean state transition with good feedback. The input bar changes its placeholder text to "Branch from this point..." and shows the label. This is the strongest interaction pattern in the app.

**Clipping requires too many steps and Shift+click is undiscoverable.** A user would need to know that Shift+click exists, select multiple nodes one by one (which requires knowing which nodes are connected), then find the clip button, name it, and save. There is no visual hint that Shift+click is available, and the ClipCreator only appears after 2+ nodes are selected — before that, there is no UI state indicating that multi-select mode is even possible.

**Path Trace is excellent once activated** — the floating bar with step counter, keyboard navigation, and auto-pan is well-executed. But the entry point (press `T` with a node selected) is invisible without the shortcuts reference.

**Regeneration feedback is inadequate.** When you regenerate, a new node appears offset to the right with "..." label and a streaming animation. But there is no toast, no status change in the input bar, and the user's attention may not follow the new node. The auto-pan (`animateTo`) targets the new AI node in the main `sendMessage` flow but I do not see it in the `handleRegenerate` flow in ContextMenu.tsx — the regenerated node may appear off-screen without the viewport following it.

**The drag-to-hotspot interaction is a hidden gesture.** The hotspot zones (LEARN, REMEMBER) appear during drag with very low-contrast vertical text. Their purpose is unclear even when visible. "REMEMBER" in particular is ambiguous — does it save to memory? Bookmark? Pin? The labels need to be more descriptive and the zones need stronger visual signaling.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| I1 | HIGH | Add auto-pan to the regenerated node. In `ContextMenu.tsx` `handleRegenerate`, call `useUIStore.getState().animateTo(regenPos.x, regenPos.y)` after creating the node, matching the behavior in `sendMessage`. Without this, the regenerated node may spawn off-screen. |
| I2 | HIGH | Make multi-select mode more discoverable. When a single node is selected, show a subtle hint in the CanvasTools toolbar: "Shift+click to select more." Or add a "Select subgraph" action in the context menu that auto-selects all descendants of the clicked node, bypassing manual Shift+clicking entirely. |
| I3 | HIGH | Add path trace entry to the CanvasTools toolbar and context menu. A "Trace path" button alongside Branch/Clip/Inspect would make this feature visible without requiring the keyboard shortcut. The context menu already has "Show all paths" for branch points but not "Trace path to root" for any node. |
| I4 | MEDIUM | Rename the "REMEMBER" hotspot to "SAVE TO MEMORY" or remove the hotspot pattern entirely (see D6). |
| I5 | MEDIUM | Add a "Select descendants" or "Select branch" option to the context menu. This would let users clip an entire branch in two clicks (select branch > clip) instead of manually Shift+clicking each node. |
| I6 | LOW | Consider adding a "Branch" indicator on the canvas when a branch point is active. Currently the input bar shows "BRANCH" text, but a visual on the canvas connecting the active branch point to the input location would reinforce the spatial metaphor. |

---

## 5. Empty States

### Current State

| Panel | Empty State | Quality |
|-------|-------------|---------|
| Canvas (no nodes) | Blank dot grid with input bar | POOR — no guidance |
| Inspector (no node selected) | Slides off-screen (hidden) | OK — no content is appropriate |
| Memory Shelf (no memories) | "No memories saved yet. Right-click a node > Save as memory" | GOOD — tells the user what to do |
| Timeline (no messages) | "No messages yet" | ADEQUATE — text only, no call to action |
| Session Pill (no session) | Shows "No session" text | ADEQUATE |
| Learn Overlay (no mode selected) | Shows 4 mode buttons | GOOD — clear options to choose from |
| Path Trace (not active) | Hidden | OK |
| Clip Creator (< 2 nodes selected) | Hidden | OK |
| Branch Preview (no branch point hovered) | Hidden | OK |

### Analysis

The canvas empty state is the most critical gap. Every other empty state either handles the situation reasonably or is appropriately hidden. The canvas is the only surface that is always visible and currently communicates nothing.

The Timeline's empty state of "No messages yet" is functional but misses an opportunity to explain what the Timeline is. A user who opens it on a blank session gets no context about what would appear here.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| E1 | CRITICAL | Canvas empty state (see F2 above). |
| E2 | LOW | Improve the Timeline empty state to "No messages yet. Start a conversation and it will appear here as a linear thread." |
| E3 | LOW | Improve the Inspector panel's behavior when no node is selected but the inspector was manually toggled open with `I`. Currently it slides off-screen if `node` is null, but the user pressed `I` expecting to see something. Show an empty state: "Click a node to inspect it." |

---

## 6. Error States

### Current State

There are two error handling paths in the codebase:

1. **Main chat (`FloatingInput.sendMessage`)**: On API failure, updates the AI node text to `'[Error: failed to get response]'` and logs to console.
2. **Regeneration (`ContextMenu.handleRegenerate`)**: On API failure, updates the node text to `'[Error: regeneration failed]'`.
3. **Learn Overlay (`generateContent` and `sendFollowUp`)**: On failure, updates the last message to `'[Error generating educational content]'` or silently fails (sendFollowUp only logs to console).

There is no:
- Retry mechanism for any failed request
- User-facing error toast or notification system
- Network connectivity detection
- Timeout handling (the streaming read loop runs until `done` — a stalled stream hangs indefinitely)
- Rate limiting feedback
- API key validation or missing configuration feedback

### Analysis

The error messages are rendered as node text, which means they appear inside the graph as permanent nodes. A failed response creates a node that says "[Error: failed to get response]" with no way to retry, dismiss, or remove it. This pollutes the graph with error artifacts.

There is no timeout on the streaming read loop. If the server connection stalls (neither closes nor sends data), the UI will show the streaming animation indefinitely with no escape besides refreshing the page.

The `sendFollowUp` error handler in LearnOverlay doesn't update the message content at all — it just calls `console.error`. The user sees a blank message with no indication of failure.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| R1 | CRITICAL | Add a retry button to error nodes. When an AI node contains an error message, render a small "Retry" action button on the node or in the inspector. The retry should re-issue the same request. |
| R2 | HIGH | Add a streaming timeout. If no data arrives within 30 seconds, abort the request and show an error with a retry option. The current implementation will hang indefinitely on a stalled connection. |
| R3 | HIGH | Add a transient notification/toast system for non-graph errors. Actions like "Save as memory", "Copy text", and clipboard operations should show brief confirmation. Errors from the Learn Overlay should show inline error messages, not silent failures. |
| R4 | MEDIUM | Handle the `sendFollowUp` error path in LearnOverlay. Currently it silently fails. Update the last message to `'[Error: could not generate response. Try again.]'`. |
| R5 | MEDIUM | Add a "cancel streaming" button. During an active stream, the user should be able to abort. Currently the input bar shows "Thinking..." but there is no cancel control. |
| R6 | LOW | Add startup validation. If the API route is misconfigured or API keys are missing, show a clear error on load rather than failing silently on first message. |

---

## 7. Feedback Loops

### Current State

| Action | Feedback | Quality |
|--------|----------|---------|
| Send message | Input clears, nodes appear on canvas, streaming animation on AI node, auto-pan to new node | GOOD |
| Branch | Input shows "BRANCH" label, placeholder changes, focus moves to input | GOOD |
| Regenerate | New node appears with streaming animation | ADEQUATE — no auto-pan, no toast |
| Save as memory | No feedback | POOR |
| Copy text | No feedback | POOR |
| Clip saved | Selection clears, clip appears in memory shelf | ADEQUATE — no confirmation |
| Path trace started | Trace bar appears, nodes dim, active node highlights | GOOD |
| Learn mode opened | Modal overlay appears with educational options | GOOD |
| Session created | Session pill collapses, new session becomes active | ADEQUATE |
| Session deleted | Session removed from list | ADEQUATE — no confirmation dialog |
| Node dragged to hotspot | Node saved as memory or Learn overlay opens | POOR — no feedback for memory save |

### Analysis

The application is strongest at giving feedback for the core conversation flow (send message, see response stream in). It is weakest at confirming secondary actions — particularly memory/clip saves, copy operations, and regeneration.

The lack of any feedback when saving a node as memory (via context menu or drag-to-hotspot) is a significant gap. The user performs the action and gets no visible confirmation. The memory appears in the Memory Shelf, but the shelf is likely closed when this happens, so there is no visible change anywhere on screen.

Deleting a session has no confirmation dialog. Since sessions contain entire conversation graphs, accidental deletion could lose significant work.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| B1 | HIGH | Add a transient toast notification for: "Saved to memory", "Copied to clipboard", "Clip saved", "Session created". These should be brief (2-3 seconds), non-blocking, and positioned near the status bar or at a consistent location. |
| B2 | HIGH | Add a confirmation step before deleting a session. A simple "Delete this session? This cannot be undone." prompt before calling `deleteSession`. |
| B3 | MEDIUM | Add auto-pan to regenerated nodes (same as I1). |
| B4 | MEDIUM | Flash the Memory Shelf toggle button when a new memory is saved (while the shelf is closed). A brief color pulse or badge increment animation would signal that something was saved even if the shelf is hidden. |
| B5 | LOW | After a clip is saved, briefly highlight the new clip in the Memory Shelf (if it is open) or pulse the shelf toggle button (if closed). |

---

## 8. Cognitive Load

### Current State

At maximum complexity, the user could have visible simultaneously:
- The canvas with dozens of nodes and edges
- The Inspector panel (right, 280px)
- The Timeline panel (right, 400px)
- The Memory Shelf (left, 280px)
- The floating input bar (bottom center)
- The CanvasTools toolbar (bottom center, above input)
- The ClipCreator (bottom center, above tools)
- The SessionPill (top center)
- The Model Selector dropdown (top right)
- The StatusBar (bottom)
- The PathTrace bar (bottom center — conflicts with input bar positioning)
- Branch Preview popover (floating near a branch node)
- Context Menu (floating at right-click position)
- Learn Overlay (center modal)

The floating bottom area is particularly crowded. The FloatingInput, CanvasTools, ClipCreator, and PathTrace all use `position: fixed; bottom: [20-120px]; left: 50%; transform: translateX(-50%)`. These can overlap vertically:
- FloatingInput: `bottom: 20`
- CanvasTools: `bottom: 80`
- ClipCreator: `bottom: 120`
- PathTrace: `bottom: 20` (same as FloatingInput)

When Path Trace is active, it occupies the exact same position as the FloatingInput. Both render with `z-index` that would cause overlap (PathTrace at z-index 90, FloatingUI at z-index 50). The PathTrace would render on top, but the input bar would still be underneath, creating visual clutter.

### Analysis

The application has a lot of UI surfaces but they are generally well-layered — most panels are toggleable and start hidden. The cognitive load issue is not about the total number of features but about the convergence of floating elements at the bottom center and the right side of the screen.

The node graph itself handles complexity well through the LOD system (4 levels of detail that progressively reveal more information as you zoom in). This is a strong design decision that scales with graph size.

The real cognitive load concern is conceptual, not visual: the user needs to understand nodes, edges, branches, branch points, paths, clips, memories, sessions, and the difference between "active node" and "selected node" — all without documentation. The distinction between `activeNodeId` (the node you're "talking at") and `selectedNodeId` (the node shown in the Inspector) is important for understanding branching behavior but is never explained.

### Recommendations

| ID | Priority | Recommendation |
|----|----------|---------------|
| C1 | HIGH | Resolve the PathTrace/FloatingInput overlap. When PathTrace is active, either hide the FloatingInput (since the user is in exploration mode, not conversation mode) or move the FloatingInput above the PathTrace bar. |
| C2 | MEDIUM | Clarify the "active node" concept. Show a persistent, subtle indicator on the canvas near the active node (or in the input bar) that says what you're replying to. The current behavior — clicking a node both selects it and makes it the active reply target — conflates two distinct concepts. A user may click a node just to inspect it, not intending to change their reply target. |
| C3 | MEDIUM | Consider progressive disclosure for the CanvasTools. Show only the most common action (Branch) by default, with a "..." expander for the full toolbar. This reduces initial visual complexity while keeping everything accessible. |
| C4 | LOW | Group the bottom-center floating elements into a single coordinated stack with consistent spacing, rather than three independently positioned absolute elements. |

---

## Prioritized Summary

### CRITICAL (fix before any external user testing)

| ID | Finding |
|----|---------|
| F1 | No first-run experience — users land on a blank canvas with no guidance |
| E1/F2 | Canvas empty state is a void — no illustration, no direction |
| D1 | CanvasTools toolbar only surfaces 3 of 8 node actions — most features are hidden behind right-click |
| D2 | Clip button in CanvasTools is a dead no-op |
| R1 | Error nodes have no retry mechanism — errors become permanent graph artifacts |

### HIGH (fix before launch)

| ID | Finding |
|----|---------|
| F3 | Shortcuts help has no visible entry point |
| D3 | No persistent "?" help button in the UI |
| D4 | No touch/long-press support for context menu |
| A1 | Inspector and Timeline panels overlap on the right side |
| I1 | Regenerated nodes have no auto-pan — they may spawn off-screen |
| I2 | Multi-select (Shift+click) is completely undiscoverable |
| I3 | Path trace has no visual entry point — requires `T` keyboard shortcut |
| R2 | No streaming timeout — stalled connections hang indefinitely |
| R3 | No toast/notification system for secondary actions |
| B1 | No confirmation feedback for memory saves, copies, clip saves |
| B2 | Session deletion has no confirmation dialog |
| C1 | PathTrace and FloatingInput occupy the same screen position |

### MEDIUM

| ID | Finding |
|----|---------|
| A2 | Session Pill hover delay (600ms) is too long |
| A3 | StatusBar is too small (9px text, 24px height) for the information it carries |
| C2 | "Active node" vs "selected node" distinction is invisible and confusing |
| D5 | Icon-only buttons lack visible labels |
| D6 | Drag-to-hotspot pattern is a hidden gesture with no precedent |
| I4 | "REMEMBER" hotspot label is ambiguous |
| I5 | No "Select branch/descendants" action for efficient clipping |
| R4 | Learn Overlay's sendFollowUp error handler is silent |
| R5 | No cancel-streaming button |
| C3 | CanvasTools could use progressive disclosure |
| B3 | Regeneration needs auto-pan (duplicate of I1) |
| B4 | Memory Shelf toggle should pulse when a new memory is saved while closed |
| F4 | No "What is Dreamcacher?" explanation in the session manager |

### LOW

| ID | Finding |
|----|---------|
| A4 | Top-right controls could use labels |
| D7 | Inspector action buttons lack descriptions |
| E2 | Timeline empty state is minimal |
| E3 | Inspector shows nothing when toggled with `I` but no node is selected |
| R6 | No startup validation for API configuration |
| I6 | No visual canvas indicator connecting active branch point to input |
| B5 | Saved clips should highlight in Memory Shelf |
| C4 | Bottom-center floating elements should be a coordinated stack |

---

## Metrics to Track (Post-Implementation)

| Metric | Current (estimated) | Target |
|--------|-------------------|--------|
| First-message rate (% of sessions that send at least 1 message) | Unknown | > 90% |
| Branch usage rate (% of sessions that create at least 1 branch) | Unknown (likely < 10% given discoverability) | > 30% |
| Feature discovery rate (% of users who open context menu in first session) | Unknown | > 50% |
| Memory save rate (% of sessions with at least 1 saved memory) | Unknown | > 20% |
| Session-level error rate (% of sessions encountering an unrecoverable error) | Unknown | < 5% |
| Time to first branch (seconds from first message to first branch action) | Unknown | < 120s |

---

## Appendix: Interaction Model Reference

For context during implementation, here is the current interaction surface map:

```
Entry Points for Key Features:

BRANCH:
  - Right-click node > "Branch from here"
  - CanvasTools > Branch button (when node selected)
  - Inspector > Actions > Branch button

CLIP:
  - Shift+click 2+ nodes > ClipCreator > Clip > Name > Save
  - CanvasTools > Clip button (currently broken)

LEARN:
  - Right-click AI node > "Learn about this"
  - Drag node to left-edge top-half hotspot

MEMORY SAVE:
  - Right-click node > "Save as memory"
  - Drag node to left-edge bottom-half hotspot

REGENERATE:
  - Right-click AI node > "Regenerate"
  - Inspector > Actions > Regen button

PATH TRACE:
  - Select node + press T

INSPECT:
  - Click node (auto-opens inspector)
  - Right-click node > "Inspect"
  - CanvasTools > Inspect button
  - Press I to toggle

SHOW ALL PATHS:
  - Right-click branch point > "Show all paths"
  - Hover branch point for 500ms > Branch Preview popover

TIMELINE:
  - Press L
  - Top-right toggle button
```

File path: `/Users/az/Desktop/Code  - Node Based Design System/dreamcacher/UX-AUDIT.md`
