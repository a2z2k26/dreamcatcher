# Dreamcatcher

A spatial conversation interface where AI thinking becomes visible.

Linear chat collapses the structure of real thinking: non-linear, spatial,
accumulative, and contextual. Dreamcatcher restores that structure by turning
conversations into navigable, branchable, persistent graphs.

See [PRODUCT.md](./PRODUCT.md) for the product spec and [`docs/`](./docs/) for
design, engineering, and audit notes.

## Current Status

Dreamcatcher is a working Next.js prototype with:

- A custom SVG graph canvas with force-directed physics
- Branching conversation paths, timeline scrubbing, memory capture, and learning overlays
- OpenRouter-backed model responses with mock fallback when no API key is present
- Local IndexedDB persistence through Zustand stores
- Green-Lane visual regression capture for desktop, laptop, and mobile viewports

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Zustand stores with local persistence
- Custom SVG canvas and worker-backed graph physics
- GSAP for focused interaction choreography
- OpenRouter-compatible chat completions API
- Vitest, ESLint, and Green-Lane capture checks

## Getting Started

```bash
corepack enable
corepack pnpm@10.24.0 install
corepack pnpm@10.24.0 dev
```

The app runs at [http://localhost:3000](http://localhost:3000) by default.

## Environment

Copy the example file and fill in local secrets:

```bash
cp .env.example .env.local
```

Required for live model responses:

```bash
OPENROUTER_API_KEY=<your-openrouter-api-key>
```

Optional:

```bash
DEFAULT_MODEL=anthropic/claude-sonnet-4
NEXT_PUBLIC_DEFAULT_MODEL=anthropic/claude-sonnet-4
```

Without `OPENROUTER_API_KEY`, the chat route streams mock responses so the UI can
still be exercised end to end.

Do not commit `.env.local` or any real API keys.

## Scripts

```bash
corepack pnpm@10.24.0 dev                 # local Next dev server
corepack pnpm@10.24.0 test                # Vitest test suite
corepack pnpm@10.24.0 lint                # ESLint
corepack pnpm@10.24.0 build               # production build
corepack pnpm@10.24.0 greenland:check     # tests, lint, production build
corepack pnpm@10.24.0 greenland:capture   # visual capture artifact
```

Build note: `NODE_ENV=development` in the shell or `.env` can break `next build`
with current Next 16 prerender behavior. The Green-Lane check unsets `NODE_ENV`
for the build step.

## Project Layout

```text
src/
  app/                 Next.js App Router and API routes
  components/canvas/   SVG renderer, graph interactions, canvas orchestration
  components/ui/       Chrome, overlays, timeline, inspector, and input surfaces
  stores/              Graph, session, memory, and UI state
  lib/                 Physics, effects, theme, context builder, rate limiter
  types/               Shared domain types

docs/                  Design, engineering, and audit documentation
scripts/               Green-Lane capture tooling
public/fonts/          Bundled interface fonts
```

## Public Repository Hygiene

- `.env.local`, generated captures, build outputs, coverage, and local design
  reference folders are ignored.
- `.env.example` is safe to commit and documents required configuration.
- GitHub Actions runs tests, lint, and production build on pushes and PRs.
- The tracked `.pen` files and `_reference/` assets are project source/reference
  materials. Review them before publishing if the repository should exclude
  proprietary design artifacts.

## License

No public license has been selected yet. Until a `LICENSE` file is added, all
rights are reserved by the project owner.
