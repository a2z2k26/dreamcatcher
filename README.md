```
 ____                                     _       _
|  _ \ _ __ ___  __ _ _ __ ___   ___ __ _| |_ ___| |__   ___ _ __
| | | | '__/ _ \/ _` | '_ ` _ \ / __/ _` | __/ __| '_ \ / _ \ '__|
| |_| | | |  __/ (_| | | | | | | (_| (_| | || (__| | | |  __/ |
|____/|_|  \___|\__,_|_| |_| |_|\___\__,_|\__\___|_| |_|\___|_|
```

# Dreamcatcher

[![CI](https://github.com/a2z2k26/dreamcatcher/actions/workflows/ci.yml/badge.svg)](https://github.com/a2z2k26/dreamcatcher/actions/workflows/ci.yml)

**A spatial AI conversation interface where thinking becomes visible.**

Dreamcatcher turns linear chat into a navigable graph. Prompts, responses,
branches, memories, and learning moments become spatial objects that can be
scrubbed through time, reorganized, revisited, and extended.

The project explores a different interface model for AI work: less transcript,
more terrain.

[Product spec](./PRODUCT.md) · [Documentation](./docs/) · [Contributing](./CONTRIBUTING.md)

## Why

Most AI interfaces flatten thought into a single scrolling feed. Real work is
messier: alternatives branch, context accumulates, useful fragments become
memory, and the path matters as much as the final answer.

Dreamcatcher preserves that structure by making conversation state visible,
branchable, and persistent.

## What It Does

- Spatial graph canvas for prompts, responses, branches, and memories
- Animated node and edge system with focused selection states
- Timeline scrubber for replaying and inspecting conversation evolution
- Branching from any point in the graph
- Memory capture and learning overlays
- Session picker, model selector, inspector, context menu, and export surfaces
- OpenRouter-compatible live model responses with mock fallback
- Local IndexedDB persistence through Zustand stores
- Green-Lane visual regression capture for desktop, laptop, and mobile

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Zustand for graph, session, memory, and UI state
- Custom SVG renderer with worker-backed graph physics
- GSAP for interaction choreography
- OpenRouter-compatible chat completions API
- Vitest, ESLint, GitHub Actions, and Green-Lane capture tooling

## Getting Started

```bash
corepack enable
corepack pnpm@10.24.0 install
cp .env.example .env.local
corepack pnpm@10.24.0 dev
```

The app runs at [http://localhost:3000](http://localhost:3000) by default.

## Environment

Live model responses require an OpenRouter API key:

```bash
OPENROUTER_API_KEY=<your-openrouter-api-key>
```

Optional model defaults:

```bash
DEFAULT_MODEL=anthropic/claude-sonnet-4
NEXT_PUBLIC_DEFAULT_MODEL=anthropic/claude-sonnet-4
```

Without `OPENROUTER_API_KEY`, the app streams mock responses so the interface can
still be exercised end to end.

Never commit `.env.local` or real API keys.

## Scripts

```bash
corepack pnpm@10.24.0 dev                 # local Next dev server
corepack pnpm@10.24.0 test                # Vitest test suite
corepack pnpm@10.24.0 lint                # ESLint
corepack pnpm@10.24.0 build               # production build
corepack pnpm@10.24.0 greenland:check     # tests, lint, production build
corepack pnpm@10.24.0 greenland:capture   # visual capture artifact
```

## Project Layout

```text
src/
  app/                 Next.js routes and API handlers
  components/canvas/   SVG renderer, graph interactions, and canvas orchestration
  components/ui/       Chrome, overlays, timeline, inspector, and input surfaces
  stores/              Graph, session, memory, and UI state
  lib/                 Physics, effects, theme, context, and model helpers
  types/               Shared domain types

docs/                  Design, engineering, and audit documentation
scripts/               Green-Lane capture tooling
public/fonts/          Bundled interface fonts
```

## Quality Gates

Before merging meaningful changes, run:

```bash
corepack pnpm@10.24.0 greenland:check
```

For visual changes, also run:

```bash
corepack pnpm@10.24.0 greenland:capture
```

Inspect the generated desktop, laptop, and mobile artifacts before publishing UI
changes.

## Repository Hygiene

- GitHub Actions runs tests, lint, and production build on pushes and pull requests.
- Dependabot is configured for npm and GitHub Actions updates.
- `.env.local`, generated captures, build output, coverage, and local design
  reference folders are ignored.
- `.env.example` documents the required local configuration.
- The tracked `.pen` files and `_reference/` assets are source/reference materials.

## License

No public license has been selected yet. Until a `LICENSE` file is added, all
rights are reserved by the project owner.
