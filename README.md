# Dreamcacher

A spatial conversation interface where AI thinking becomes visible.

Linear chat collapses the structure of real thinking — which is non-linear,
spatial, accumulative, and visible. Dreamcacher restores that structure:
conversations become navigable, branchable, persistent graphs.

See [**PRODUCT.md**](./PRODUCT.md) for the full product spec — tiers, node
taxonomy, interaction vocabulary, and architecture. Supporting design and
research docs live in [`docs/`](./docs/).

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Zustand stores + IndexedDB persistence
- Custom SVG canvas with force-directed physics (off-main-thread worker)
- OpenRouter-backed chat API (mock fallback when no key)

## Development

```bash
pnpm install
pnpm dev       # http://localhost:3000
pnpm build     # production build
pnpm lint
```

### Environment

Optional — create `.env.local`:

```
OPENROUTER_API_KEY=sk-or-...
DEFAULT_MODEL=anthropic/claude-sonnet-4
```

Without a key, the chat route streams mock responses so the UI works end-to-end.

> **Build gotcha:** `NODE_ENV=development` in the shell or `.env` breaks
> `next build` via a Next 16 internal prerender bug ([#87719](https://github.com/vercel/next.js/issues/87719)).
> Unset it before building.

## Project Layout

```
src/
├── app/                 Next.js App Router (layout, page, API routes, error pages)
├── components/
│   ├── canvas/          GraphCanvas — SVG renderer + interaction
│   └── ui/              Inspector, MemoryShelf, FloatingUI, overlays
├── stores/              Zustand stores (graph, session, memory, UI)
├── lib/                 Physics, effects, theme, context builder, rate limiter
└── types/               Shared type definitions

docs/                    Design, visual, and strategy documentation
PRODUCT.md               Product spec — read this first
AGENTS.md                Notes for AI agents contributing to this repo
```

## Status

Concept validated with working physics prototype. See `PRODUCT.md` for scope
and `STRATEGY.md` for positioning.
