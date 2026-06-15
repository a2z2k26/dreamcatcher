# Green-Land Frontend Design Loop

Green-Land is the design improvement loop for Dreamcacher. It keeps the app in a green state while specialist agents push the frontend closer to the Dreamcatcher and Red Stripe design references.

The loop has four promises:

1. Capture the same product states every iteration.
2. Review screenshots against the local design references, not memory.
3. Let specialist agents critique from different angles before implementation.
4. Land only when tests, build, responsive screenshots, and the design rubric are green.

## Source Material

- Product app: `src/app`, `src/components`, `src/lib/theme.ts`
- Dreamcatcher design references: `Dreamcatcher Design/`
- Red Stripe system references: `Red Stripe Design System/`
- Capture fixture: `src/lib/greenland-fixture.ts`
- Capture hook: `?greenland=empty`, `?greenland=showcase`, `?greenland=showcase&state=inspector`, `?greenland=showcase&state=streaming`

## One-Time Setup

The capture harness uses Playwright when it is installed locally.

```bash
pnpm add -D playwright
pnpm exec playwright install chromium
```

## Run The Loop

```bash
pnpm greenland:capture
pnpm greenland:check
```

The capture script starts Next on `localhost` by default to match Next 16's dev-origin checks. If another host is required, run `GREENLAND_HOST=<host> pnpm greenland:capture` or point at an existing server with `GREENLAND_BASE_URL=http://localhost:3000 pnpm greenland:capture`.

`greenland:capture` writes a run folder under `artifacts/greenland/<timestamp>/` with:

- desktop, laptop, and mobile screenshots
- empty, showcase, input focus, model menu, session open, inspector, and streaming states
- copied reference images
- `manifest.json`
- `index.html` contact sheet

`greenland:check` runs unit tests, lint, and production build with `NODE_ENV` unset.

## Swarm Topology

Use a hierarchical swarm:

- `design-chief`: owns iteration scope and final design judgment.
- `design-system-architect`: checks token, material, type, and component consistency.
- `design-visual-designer`: pushes luster, atmosphere, objectness, and first-viewport product signal.
- `design-interaction-designer`: checks states, progressive disclosure, motion, and responsive ergonomics.
- `design-accessibility-specialist`: checks contrast, focus, keyboard, reduced motion, and readable density.
- `engineering-frontend-developer`: implements the selected slice.
- `qa-automation-engineer`: runs capture/check and reports regressions.

Agent briefs live in `docs/design/greenland/agents/`.

## Iteration Shape

1. **Capture baseline**: run `pnpm greenland:capture`.
2. **Dispatch design swarm**: give agents the latest contact sheet, `rubric.md`, and the relevant design references.
3. **Synthesize**: design-chief chooses one narrow implementation slice.
4. **Implement**: frontend agent or controller edits only that slice.
5. **Verify**: run `pnpm greenland:capture` and `pnpm greenland:check`.
6. **Compare**: inspect before/after contact sheets.
7. **Land or loop**: if any green gate fails, run another focused pass.

## Green Gates

A pass is green only when all are true:

- `pnpm greenland:check` exits 0.
- Desktop, laptop, and mobile screenshots have no chrome collisions.
- Showcase state is recognizably the product, not an empty themed canvas.
- Input reads as the primary jewel.
- Red appears only in active/earned states.
- Glass surfaces show visible top light, side falloff, and bottom weight.
- Node/edge atmosphere resembles the Dreamcatcher references.
- Mobile keeps primary actions reachable without hiding the core experience.

## Recommended First Loops

1. **P0: canvas atmosphere**: restore warm-black depth, smoky luminance zones, and active graph falloff. The app should stop reading as a flat black dot grid.
2. **P0: first-viewport product signal**: seeded/empty states must immediately say Dreamcatcher and spatial conversation, not anonymous dark tool.
3. **P0: input jewel**: composer should be the brightest, most polished object, with crisp top edge, warm bead/model mark, and clear send/stop affordance.
4. **P1: graph depth**: foreground/mid/background nodes, readable active path, visible rims/halos, and provider color quarantined to model identity.
5. **P1: glass edge lighting**: floating surfaces need top catchlight, side falloff, bottom weight, and elevation differences visible in grayscale.
6. **P1: text luminance**: no critical first-view copy at `T.dim`; primary labels must be readable without squinting.

## Specialist Findings To Preserve

- The current UI is not generic; it is over-muted.
- The references are dark too, but they earn luster through atmospheric haze, specular edge light, stronger graph material, and brighter type hierarchy.
- Streaming should be captured as a real pending request, not a fake static phase. The capture harness intercepts `/api/chat`, delays fulfillment, and screenshots while the app is pending.
- Every run should use a clean browser context so IndexedDB session data does not leak into the screenshot matrix.
