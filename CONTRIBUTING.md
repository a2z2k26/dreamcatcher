# Contributing

Dreamcatcher is design-sensitive software. Small UI changes should preserve the
Red Stripe visual language: restrained neutral surfaces, narrow `#DD0000`
accents, readable hierarchy, and purposeful motion.

## Local Setup

```bash
corepack enable
corepack pnpm@10.24.0 install
cp .env.example .env.local
corepack pnpm@10.24.0 dev
```

## Before Opening a Pull Request

Run:

```bash
corepack pnpm@10.24.0 greenland:check
```

For visual changes, also run:

```bash
corepack pnpm@10.24.0 greenland:capture
```

Inspect the generated desktop, laptop, and mobile artifacts before requesting
review.

## Commit Style

Use conventional commits:

- `feat: add timeline scrub affordance`
- `fix: correct selected node focus state`
- `docs: clarify OpenRouter setup`
- `test: cover graph renderer selection rings`

## Public Data Hygiene

Do not commit local captures, `.env.local`, generated build output, private
screenshots, local design reference folders, or API keys.
