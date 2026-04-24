# Dreamcacher Guiding Principles

Design quality checklist for a spatial conversation interface with graph-based navigation, multi-panel layout, and canvas-based interactions. Every principle below was extracted from peer-reviewed research, practitioner literature, and pattern libraries specific to the domains Dreamcacher occupies. Each one is a rule that governs future design decisions -- not aspirational, enforced.

Last updated: 2026-03-25

---

## I. SPATIAL CANVAS

### 1. Infinite Canvas Grows With Thinking

**Rule**: The canvas must expand in every direction as content is added, never constraining the user to predetermined dimensions.

**Why it matters**: An infinite canvas grows with the user's thinking rather than constraining it to a predetermined format. Dreamcacher conversations are non-linear explorations -- a fixed viewport would force artificial boundaries on what is inherently unbounded.

**How to measure**: No node placement attempt hits an artificial boundary. Pan and zoom remain smooth at 60fps with 500+ visible nodes. Users never report "running out of space."

**Source**: [Bookmarkify -- What Is an Infinite Canvas?](https://www.bookmarkify.io/blog/what-is-an-infinite-canvas-designers-guide); [Codrops -- Infinite Canvas](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/)

---

### 2. Dual Coordinate Fidelity

**Rule**: The camera system must maintain two clean coordinate spaces -- screen coordinates and canvas coordinates -- with a single source of truth for the transform between them.

**Why it matters**: A zoom UI has two coordinate systems: screen coordinates and canvas coordinates. A certain point on the screen will always refer to a certain point on the canvas, and the actual canvas point depends on the camera's point and zoom. Bugs in spatial interfaces almost always trace back to coordinate confusion between these two spaces.

**How to measure**: Hit testing, selection, drag, and tooltip positioning remain pixel-accurate at every zoom level from 10% to 400%. No "jitter" on zoom transitions.

**Source**: [Steve Ruiz -- Creating a Zoom UI](https://www.steveruiz.me/posts/zoom-ui)

---

### 3. Semantic Zoom Over Uniform Zoom

**Rule**: Zooming must alter the information density of nodes, not merely their pixel size.

**Why it matters**: Semantic zooming abstracts and simplifies the underlying graph structure by separating information into discrete levels of detail. Zoomed out, nodes become dots with no labels. Zoomed to mid-range, they show type and truncated content. Zoomed in, they reveal full text, metadata, and interaction affordances. Performance analysis reveals that semantic zoom delivers improved legibility and compactness at all levels compared to uniform zooming.

**How to measure**: Three or more distinct detail tiers triggered by zoom threshold. Zoomed-out view renders 1000+ nodes without label overlap. Transition between tiers completes in under 200ms.

**Source**: [EmergentMind -- Semantic Zoom: Interactive Multi-Level Visualization](https://www.emergentmind.com/topics/semantic-zoom); [ResearchGate -- Semantic Zooming for Ontology Graph Visualizations](https://www.researchgate.net/publication/321894105_Semantic_Zooming_for_Ontology_Graph_Visualizations)

---

### 4. Geometric and Semantic Stability

**Rule**: Once a node is placed on the canvas, its position must not change unless the user explicitly moves it or a layout algorithm is intentionally triggered.

**Why it matters**: A defining attribute of semantic zoom is that once elements are introduced, their positions and connections do not change during subsequent pan or zoom, preventing disorientation. Force-directed layouts should settle; they should not perpetually twitch. Stability is the foundation of spatial memory.

**How to measure**: After the force simulation cools (alpha < 0.001), no node moves more than 0.5px per frame without user input. Users can return to a conversation and recognize its spatial shape.

**Source**: [NSF -- Multi-level tree based approach for interactive graph visualization with semantic zoom](https://par.nsf.gov/servlets/purl/10109414)

---

## II. GRAPH VISUALIZATION

### 5. Progressive Disclosure of Graph Complexity

**Rule**: Show the minimum graph structure needed for the current task, revealing detail on demand through zoom, hover, selection, and expansion.

**Why it matters**: Overcrowding can be managed through progressive disclosure, giving "detail on demand" controlled by interactive zooming, filtering, and clustering. Dreamcacher graphs will grow to hundreds of nodes. Showing everything at once makes the graph unreadable; hiding everything makes it useless. The answer is layers of detail gated by user intent.

**How to measure**: Default view of a 200-node conversation is readable without scrolling the node list. Hover reveals metadata within 150ms. Expand/collapse of branches completes in under 300ms with animation.

**Source**: [Cambridge Intelligence -- Graph Visualization UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/)

---

### 6. Labels Are Earned, Not Given

**Rule**: Apply smart label truncation by default and reveal full text on hover or zoom; never repeat information that position, color, or shape already communicates.

**Why it matters**: Apply smart truncation and tooltips, and try to avoid repeating words if they appear across most nodes, especially if other styling or position can represent the same information. In a conversation graph, every node is a message -- labeling each one "Message" wastes space. The node's role (user, AI, system), its position in the tree, and its visual treatment should carry most of the information.

**How to measure**: No label exceeds the node's visual boundary at any zoom level. Tooltips appear in under 150ms on hover. Full content is accessible via click or keyboard.

**Source**: [Cambridge Intelligence -- Graph Visualization UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/); [Medium/Kineviz -- Visualizing Node-Link Graphs](https://medium.com/kineviz-blog/visualizing-node-link-graphs-84a40a9b2fcc)

---

### 7. Color Encodes Meaning, Not Decoration

**Rule**: Every color in the graph must map to a semantic dimension (speaker, depth, branch state, recency) and be distinguishable by colorblind users.

**Why it matters**: The choice of colors can significantly impact the effectiveness of a graph, and colors should be selected based on principles of color theory and with consideration for color blindness. Dreamcacher's five semantic colors (defined in the design DNA) exist for a reason: they are data channels, not paint.

**How to measure**: Removing all color still allows graph comprehension via shape and position alone. Protanopia/deuteranopia simulation shows no information loss. No more than 5 categorical hues in simultaneous use.

**Source**: [NumberAnalytics -- The Power of Graphs in UI/UX](https://www.numberanalytics.com/blog/power-of-graphs-ui-ux-design); [GuidelineExplorer -- Graph Visualization Guidelines](https://arxiv.org/html/2406.05558)

---

### 8. Conversation Tree Legibility

**Rule**: The user must be able to see where a conversation branches, how long those branches are, where they merge, and the full flow structure at a glance.

**Why it matters**: An editor needs to let the user view the structure of the conversation as a whole. Branching dialogue is difficult enough when viewed one line at a time; seeing the flow, where it branches, how long those branches are, where they merge, is necessary to good craft. Dreamcacher's entire value proposition is making conversation structure visible.

**How to measure**: In a 5-branch conversation, a new user can identify all branch points within 10 seconds. Branch depth is visually distinguishable up to 6 levels.

**Source**: [Game Developer -- Branching Conversation Systems](https://www.gamedeveloper.com/design/branching-conversation-systems-and-the-working-writer-part-3-building-a-conversation-tree); [arXiv -- Conversation Tree Architecture](https://arxiv.org/html/2603.21278)

---

## III. DARK MODE AND INFORMATION DENSITY

### 9. Dark Gray Over Pure Black

**Rule**: Background surfaces must use dark grays or warm near-blacks, never pure #000000.

**Why it matters**: Avoid pure black (#000000) backgrounds, which create harsh contrasts. Instead use dark grays or navy tones. Pure black with pure white text creates a stark contrast that increases eye strain over extended sessions. Dreamcacher is a sustained-use tool -- users will stare at this canvas for hours.

**How to measure**: No background surface in the application uses #000000. Primary background luminance is between 8-15% (e.g., #141414-#262626). White text passes WCAG AA (4.5:1) contrast against the darkest surface.

**Source**: [QodeQuay -- Dark Mode Design Principles for Data-Heavy Dashboards](https://www.qodequay.com/dark-mode-dashboards); [CleanChart -- Dark Mode Charts Best Practices](https://www.cleanchart.app/blog/dark-mode-charts)

---

### 10. Luminance Hierarchy Over Color Hierarchy

**Rule**: Establish visual importance through brightness levels first, hue second.

**Why it matters**: Dark mode interfaces must maintain visual hierarchy primarily through controlled luminance steps rather than relying on saturated color. In dark mode, the fundamental principle is to ensure sufficient contrast while avoiding excessive brightness that causes strain. The Bumba-Dark palette already encodes this: ghost, dim, secondary, primary, accent form a luminance ladder.

**How to measure**: Five distinct luminance steps are identifiable by the user (confirmed via grayscale screenshot test). Primary interactive elements are the brightest non-accent surface. Decorative elements never exceed 30% opacity.

**Source**: [Medium/Ananya Deka -- Dark Mode for Data Visualizations](https://ananyadeka.medium.com/implementing-dark-mode-for-data-visualizations-design-considerations-66cd1ff2ab67); [Data Europa -- Dark Mode Guide](https://data.europa.eu/apps/data-visualisation-guide/dark-mode)

---

### 11. Typography Weight Compensates for Darkness

**Rule**: Use medium or semi-bold weights for body text on dark backgrounds; reserve thin/light weights for large display text only.

**Why it matters**: Use semi-bold or medium weights rather than ultra-thin fonts, which fade against dark backgrounds. Increase line spacing slightly to reduce visual density. Thin text on dark backgrounds appears to vibrate or blur -- a physiological effect of how human eyes process light text on dark fields.

**How to measure**: No text below 14px uses a weight lighter than 400. Body text line-height is at least 1.5. All text passes WCAG 2.1 AA contrast ratio of 4.5:1.

**Source**: [QodeQuay -- Dark Mode Design Principles](https://www.qodequay.com/dark-mode-dashboards); [Influencers Time -- Dark Mode Design Principles](https://www.influencers-time.com/dark-mode-design-enhance-ui-with-cognitive-psychology-insights/)

---

## IV. INTERACTION PATTERNS

### 12. Keyboard-First, Mouse-Enhanced

**Rule**: Every action achievable by mouse must also be achievable by keyboard, and the keyboard path should be faster for frequent operations.

**Why it matters**: Support keyboard shortcuts for navigation and interaction. If you can navigate your graph entirely through the keyboard, you are on the right track. Power users spend hours in spatial tools. Every mouse trip to a menu is a context switch. The safest path is to echo conventions already established as muscle memory, then fence off novel shortcuts to the context where they are needed.

**How to measure**: Full node navigation via Tab/Arrow keys. All CRUD operations available via keyboard. Shortcut cheat sheet accessible via a single keystroke (?). Zero actions that are mouse-only.

**Source**: [Cambridge Intelligence -- Accessible Graph Visualization](https://cambridge-intelligence.com/build-accessible-data-visualization-apps-with-keylines/); [Knock -- How to Design Great Keyboard Shortcuts](https://knock.app/blog/how-to-design-great-keyboard-shortcuts); [ui-patterns.com -- Keyboard Shortcuts](https://ui-patterns.com/patterns/keyboard-shortcuts)

---

### 13. Drag Affordances Are Explicit

**Rule**: Every draggable element must have a visible handle or hover-state cursor change, and every drop zone must light up during drag.

**Why it matters**: Use appropriate signifiers such as handle icons and hover-state cursor changes, provide clear feedback throughout the interaction. Having only drag and drop in place to achieve a goal is fragile, because if it is not usable by someone, that is a blocker. In enterprise, always design alternatives to drag and drop.

**How to measure**: Draggable nodes show grab cursor on hover. Drop zones highlight within 50ms of drag entering their bounds. Every drag operation has a non-drag alternative (context menu, keyboard shortcut, or button).

**Source**: [NN/g -- Drag and Drop: How to Design for Ease of Use](https://www.nngroup.com/articles/drag-drop/); [Pencil & Paper -- Drag and Drop UX Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop)

---

### 14. Direct Manipulation With Live Preview

**Rule**: When a user drags a node, the graph must respond in real time -- edges follow, nearby nodes shift, and the final state is previewed before release.

**Why it matters**: When drag-and-drop is used to reorder items, show background objects moving out of the way before the user releases. This short animation (roughly 100ms) gives a preview of what will happen and makes the motion feel natural. Direct manipulation means the user is touching the thing, not a proxy for the thing.

**How to measure**: Edge rubber-banding during node drag at 60fps. Sibling nodes animate to new positions within 100ms. No state change occurs until mouse release (cancel by pressing Escape).

**Source**: [UX Studio Team -- 7 Commandments of Drag and Drop](https://www.uxstudioteam.com/ux-blog/drag-and-drop-interface); [Pencil & Paper -- Drag and Drop UX](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop)

---

### 15. Non-Linear Undo History

**Rule**: Undo/redo must be tree-structured, not stack-structured, matching the branching nature of the conversation graph itself.

**Why it matters**: In most applications the stored history is linear, meaning that after doing a few undos, if you perform a new action, all previous redos are lost. Graphs or trees can be used for non-linear undo/redo, allowing branching histories. Dreamcacher already models conversation as a tree -- the undo system should mirror this mental model rather than fighting it.

**How to measure**: Undoing past a branch point does not destroy the branch. History tree is inspectable via a panel or shortcut. All operations (node creation, deletion, edge modification, branch, clip) are undoable.

**Source**: [VGC -- Non-Linear Undo/Redo](https://www.vgc.io/news/non-linear-undo-redo-graphics-engine-ui-library-and-roadmap); [DEV Community -- You Don't Know Undo/Redo](https://dev.to/isaachagoel/you-dont-know-undoredo-4hol)

---

## V. MOTION AND ANIMATION

### 16. Motion Communicates State, Not Style

**Rule**: Every animation must answer a question: "What changed? Where did it go? What should I look at now?" If it answers none, remove it.

**Why it matters**: Functional animation should be intermediaries between different UI states. Motion indicates that the interface switched to a different state, making mode changes noticeable while providing conceptual metaphors for the transition. Decorative animation is noise; functional animation is information.

**How to measure**: Every animation in the system can be annotated with which of the three questions it answers. No animation exceeds 500ms for transitions or 800ms for attention-directing sequences. Disabling all animation does not prevent any task completion.

**Source**: [NN/g -- The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/); [Adobe -- Six Principles of Using Animation in UX Design](https://blog.adobe.com/en/publish/2019/06/19/designing-animation-six-principles-using-animation-ux)

---

### 17. Easing Is Physics, Not Decoration

**Rule**: All transitions must use easing curves that match physical metaphors (spring for snapping, ease-out for settling, ease-in-out for repositioning). Linear easing is banned for user-facing motion.

**Why it matters**: Easing gives animation a natural and organic feel. By choosing the right easing function, you create animations that are natural and engaging. Dreamcacher's force-directed simulation already speaks the language of physics -- springs, attraction, friction. UI transitions should speak the same language.

**How to measure**: Every CSS/JS transition uses a named easing function from the design system. No `linear` timing in user-facing animations. Spring-based animations use consistent mass/stiffness/damping values from a shared config.

**Source**: [Mockplus -- 20 Motion Design Principles](https://www.mockplus.com/blog/post/20-motion-design-principles-with-examples); [Microsoft Fluent 2 -- Motion](https://fluent2.microsoft.design/motion)

---

### 18. Duration Scales With Distance

**Rule**: Animation duration must be proportional to the distance traveled on screen, with a floor of 150ms and a ceiling of 500ms.

**Why it matters**: Medium durations of 200-500 milliseconds fit transitions between screens or states. Micro-interactions (button press, toggle) need 100-200ms. Large canvas pans need longer. Fixed durations create jarring inconsistencies -- a node moving 20px at the same speed as one moving 2000px feels wrong.

**How to measure**: Duration formula is documented and consistently applied. No user-facing animation is shorter than 100ms or longer than 800ms. Camera transitions use duration = clamp(150, distance * 0.3, 500).

**Source**: [DesignerUp -- Complete Guide to UI Animations](https://designerup.co/blog/complete-guide-to-ui-animations-micro-interactions-and-tools/); [IxDF -- What Is UI Animation?](https://ixdf.org/literature/topics/ui-animation)

---

## VI. NAVIGATION AND WAYFINDING

### 19. Minimap as Spatial Memory Aid

**Rule**: A persistent minimap must show the full graph topology, the current viewport position, and allow click-to-navigate.

**Why it matters**: Minimaps provide condensed, navigable overviews helping users maintain context and move efficiently. They are especially valuable in platforms for visualizing and managing intricate flows containing hundreds of interconnected nodes. The minimap is an external memory aid reducing mental effort required to track position within large systems.

**How to measure**: Minimap is visible by default (dismissible). Viewport rectangle updates in real time during pan/zoom. Click-to-navigate lands on target within one interaction. Minimap renders at <2ms per frame even with 1000+ nodes.

**Source**: [SmartWeb -- Minimap](https://www.smartweb.jp/en/glossary/minimap/); [Springer -- Wayfinding Performance Using Mobile Maps](https://link.springer.com/chapter/10.1007/978-3-030-80091-8_110)

---

### 20. Breadcrumb Trail for Branch Depth

**Rule**: When a user navigates deep into a conversation branch, a persistent breadcrumb or path indicator must show the route from root to current focus.

**Why it matters**: Non-linear conversation flows allow discussion to take various routes during the conversation including moving backward or steering toward another topic. Without a visible trail, users lose track of how they arrived at the current node, which undermines Dreamcacher's Decision Transparency tier.

**How to measure**: Breadcrumb updates within 100ms of focus change. Clicking any breadcrumb segment navigates to that node and centers the view. Path from root is always visible, even at maximum branch depth.

**Source**: [arXiv -- Conversation Tree Architecture](https://arxiv.org/html/2603.21278); [Game Developer -- Branching Conversation Systems](https://www.gamedeveloper.com/design/branching-conversation-systems-and-the-working-writer-part-1-introduction)

---

## VII. MULTI-PANEL LAYOUT

### 21. Panels Serve the Canvas, Not the Other Way Around

**Rule**: Side panels (inspector, chat input, history, settings) must never obscure the canvas unless explicitly invoked, and must collapse to a minimal state by default.

**Why it matters**: 20% of cognitive capacity is lost on each context switch. Interrupted tasks take twice as long and contain twice as many errors. Panels that fight the canvas for attention fragment the user's focus on the spatial model that is Dreamcacher's core value.

**How to measure**: Canvas occupies at least 60% of viewport width at all times. Panels collapse to icon-only rail at widths below 1200px. Opening/closing a panel does not cause canvas content to reflow or jump.

**Source**: [Atlassian -- Cost of Context Switching](https://www.atlassian.com/blog/loom/cost-of-context-switching); [BasicOps -- Hidden Cost of Context Switching](https://www.basicops.com/blog/the-hidden-cost-of-context-switching)

---

### 22. Resizable With Constraints

**Rule**: All panel boundaries must be user-resizable with drag handles, but enforce minimum and maximum widths to prevent unusable states.

**Why it matters**: Splitter components provide resizable, expandable, collapsible, and nestable panes. Pane sizes can be specified with min and max range values. Users have different monitors, different workflows, and different preferences -- but no user benefits from a 30px-wide inspector panel.

**How to measure**: All panel dividers show resize cursor on hover. Minimum panel width is 240px. Maximum panel width is 50% of viewport. Resize is smooth at 60fps with no layout thrashing.

**Source**: [Syncfusion -- React Splitter](https://www.syncfusion.com/react-components/react-splitter); [Shoelace -- Split Panel](https://shoelace.style/components/split-panel)

---

### 23. Panel State Persists Across Sessions

**Rule**: Panel sizes, visibility, and arrangement must be saved to local storage and restored on return.

**Why it matters**: Users invest time configuring their workspace. Resetting it on every session load wastes that investment and forces re-orientation. Consistency reduces cognitive load on return visits.

**How to measure**: Panel configuration survives browser refresh. Configuration survives browser close/reopen. Default configuration is sensible for first-time users.

**Source**: [Reclaim AI -- Context Switching Guide](https://reclaim.ai/blog/context-switching); [Monitask -- Task Switching Cost](https://www.monitask.com/en/business-glossary/task-switching-cost)

---

## VIII. PERFORMANCE

### 24. Render Only What Is Visible

**Rule**: Nodes, edges, and labels outside the current viewport must not be rendered to the DOM or painted to canvas.

**Why it matters**: Virtualization -- rendering only viewport contents -- prevents performance issues during rapid interaction. Layering items using multiple canvas elements is an optimization technique where only changing layers require frequent updates. Dreamcacher graphs will grow unboundedly; rendering all 500 nodes when 30 are visible is a performance tax that compounds.

**How to measure**: DOM element count stays proportional to visible nodes, not total nodes. Frame time stays under 16ms during pan/zoom with 1000+ total nodes. Memory usage does not grow linearly with off-screen node count.

**Source**: [MDN -- Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas); [web.dev -- Improving HTML5 Canvas Performance](https://web.dev/articles/canvas-performance)

---

### 25. Separate Render Layers by Update Frequency

**Rule**: Background (static substrate), graph edges (change on layout), nodes (change on interaction), and UI overlays (change on every frame) must live on separate render layers.

**Why it matters**: Separating concerns across layers for rendering, interaction, state management, and UI logic independently improves performance and makes applications easier to scale and debug. The canvas background vignette changes never. Edges change when the simulation ticks. Nodes change when selected. The cursor overlay changes every frame. Conflating these means redrawing everything when anything changes.

**How to measure**: Background layer redraws zero times during normal interaction. Edge layer redraws only on layout change or node move. Node layer redraws only on selection or content change. UI overlay can update at 60fps independently.

**Source**: [ag-Grid -- Optimising HTML5 Canvas Rendering](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/); [web.dev -- Canvas Performance](https://web.dev/articles/canvas-performance)

---

### 26. Animation Budget Is Fixed

**Rule**: Total animation cost per frame must stay under 8ms, leaving 8ms for layout, paint, and garbage collection within a 16ms frame budget.

**Why it matters**: If it takes 8 seconds to load, users are already gone. Speed equals satisfaction. Performance is not a developer concern -- it is a core UX issue. Ambient node animations (orbit rings, particle fields, breathing auras from the rarity system) must be budgeted collectively, not individually.

**How to measure**: requestAnimationFrame callback averages under 8ms (measured via Performance API). No animation causes frame drops below 55fps on a mid-range device. Ambient animations are the first thing throttled when frame budget is exceeded.

**Source**: [MDN -- Performance Fundamentals](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Fundamentals); [Zigpoll -- Optimizing Frontend Data Visualizations](https://www.zigpoll.com/content/how-can-i-optimize-the-performance-of-a-web-application%E2%80%99s-frontend-to-handle-largescale-data-visualizations-more-efficiently)

---

## IX. ONBOARDING AND EMPTY STATES

### 27. Empty Canvas Is a Teacher

**Rule**: The first-time empty state must teach the user how to create their first conversation node through in-context guidance, not a modal tutorial.

**Why it matters**: In-context learning cues displayed when the user has started a task help users understand how to use an application in real time, and this approach is generally more successful than forced tutorials shown at initial use because in-context help is more memorable. A well-designed empty state is very crucial at the onboarding stage, as it can make or break your product's key metrics.

**How to measure**: First-time user creates their first node within 30 seconds of landing. No modal or overlay blocks the canvas on first load. Empty state includes a single, clear call to action.

**Source**: [NN/g -- Designing Empty States in Complex Applications](https://www.nngroup.com/articles/empty-state-interface-design/); [Smashing Magazine -- Empty States in User Onboarding](https://www.smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps/)

---

### 28. Sample Data Over Blank Slate

**Rule**: Offer a pre-built sample conversation graph that demonstrates branching, clips, and decision transparency so users can explore before committing.

**Why it matters**: Providing pre-built content allows new users to get started quickly, letting them dive in and learn about primary features and functions with sample data while being able to tinker and delete content without serious consequences. Dreamcacher's value is invisible until the graph has structure -- showing structure immediately communicates the product's purpose.

**How to measure**: Sample graph is one click to load. Sample demonstrates all three MVP tiers (Backtrack, Clip and Spawn, Decision Transparency). Sample can be dismissed or deleted without friction.

**Source**: [NN/g -- Empty State Interface Design](https://www.nngroup.com/articles/empty-state-interface-design/); [UXPin -- Designing the Overlooked Empty States](https://www.uxpin.com/studio/blog/ux-best-practices-designing-the-overlooked-empty-states/)

---

## X. ACCESSIBILITY

### 29. Canvas Has a Text Shadow

**Rule**: Every visual element on the canvas must have an equivalent text representation accessible to screen readers via ARIA attributes or fallback content.

**Why it matters**: Canvas rendered elements do not have accessible attributes and tags -- assistive technology does not understand what the pixels represent, creating a black box for users who do not rely on visuals. With canvas, accessibility has to be added with ARIA attributes on the canvas element or using internal fallback content.

**How to measure**: Screen reader announces node type, content preview, and connection count on focus. Full conversation is navigable as a list/tree structure via assistive technology. All interactive canvas elements have ARIA roles and labels.

**Source**: [Cambridge Intelligence -- Accessible Graph Visualization](https://cambridge-intelligence.com/build-accessible-data-visualization-apps-with-keylines/); [216digital -- Creating Accessible Data for Charts and Graphs](https://216digital.com/creating-accessible-data-for-charts-and-graphs/)

---

### 30. Reduce Motion Respects System Preference

**Rule**: When the operating system `prefers-reduced-motion` flag is set, all ambient animations (orbit rings, particle fields, breathing auras, edge pulses) must stop, and transitions must complete instantly.

**Why it matters**: WCAG 2.2 standards require respecting user preferences for motion reduction. Dreamcacher's rarity system includes multiple layers of ambient animation -- these are delightful for most users but can trigger vestibular discomfort or seizures for others. The rarity system must degrade gracefully to static visual treatments.

**How to measure**: `prefers-reduced-motion: reduce` media query is checked and respected globally. All ambient animations cease. Transitions complete in under 100ms. No information is lost when animation is disabled -- rarity is still communicated via static visual cues (stroke weight, glow opacity, color).

**Source**: [W3C WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/); [Infogram -- WCAG 2.2 Compliance](https://infogram.com/blog/wcag-22-compliance/)

---

## HOW TO USE THIS DOCUMENT

**During design**: Before proposing a new feature or visual treatment, check it against every relevant principle. If it violates one, articulate why the violation is justified or change the proposal.

**During code review**: Use the "How to measure" field as acceptance criteria. If a PR touches canvas rendering, check principles 1-4, 24-26. If it touches interaction, check 12-15. If it touches visual design, check 9-11, 16-18.

**During QA**: The measurement criteria are testable assertions. Automate what can be automated (contrast ratios, frame timing, DOM element counts). Manual-test what cannot (spatial memory, first-use comprehension, visual hierarchy clarity).

**When principles conflict**: Performance (24-26) trumps visual richness (rarity system). Accessibility (29-30) trumps animation fidelity (16-18). Stability (4) trumps layout aesthetics. User control always wins.

---

## SOURCES INDEX

- [Apple -- Spatial Layout HIG](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)
- [Cambridge Intelligence -- Graph Visualization UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/)
- [Cambridge Intelligence -- Accessible Graph Visualization](https://cambridge-intelligence.com/build-accessible-data-visualization-apps-with-keylines/)
- [Cygnis -- Web App UI/UX Best Practices 2025](https://cygnis.co/blog/web-app-ui-ux-best-practices-2025/)
- [Figma -- Web Development Trends 2026](https://www.figma.com/resource-library/web-development-trends/)
- [Golden Flitch -- Guidelines of Spatial UI Design](https://www.goldenflitch.com/blog/guidelines-of-spatial-ui-design)
- [IxDF -- Progressive Disclosure](https://ixdf.org/literature/topics/progressive-disclosure)
- [MDN -- Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [Microsoft Fluent 2 -- Motion](https://fluent2.microsoft.design/motion)
- [NN/g -- Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
- [NN/g -- Drag and Drop](https://www.nngroup.com/articles/drag-drop/)
- [NN/g -- Empty State Interface Design](https://www.nngroup.com/articles/empty-state-interface-design/)
- [NN/g -- Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/)
- [NN/g -- UI Accelerators](https://www.nngroup.com/articles/ui-accelerators/)
- [React Flow](https://reactflow.dev)
- [Steve Ruiz -- Creating a Zoom UI](https://www.steveruiz.me/posts/zoom-ui)
- [Tokens Studio -- Node-Based Design Systems](https://tokens.studio/blog/revolutionising-design-systems-the-future-of-ui-design-using-graphs-node-based-design)
- [VGC -- Non-Linear Undo/Redo](https://www.vgc.io/news/non-linear-undo-redo-graphics-engine-ui-library-and-roadmap)
- [xyflow -- Awesome Node-Based UIs](https://github.com/xyflow/awesome-node-based-uis)
