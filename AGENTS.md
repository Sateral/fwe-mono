# AGENTS.md — FWE Monorepo Guide

This repository contains the FWE meal-prep storefront and CMS in a Turborepo
monorepo. The CMS is the source of truth for data and authentication.

---

## Apps

- `apps/web` — customer storefront (ordering flow, Stripe checkout)
- `apps/cms` — admin dashboard + API (data + auth source of truth)

## Packages

- `packages/db` — Prisma schema, migrations, and Prisma Client
- `packages/validators` — shared Zod schemas and input types
- `packages/types` — shared API response types
- `packages/eslint-config` — shared lint rules
- `packages/typescript-config` — shared TypeScript configs

---

## Business Rules (Ordering Window)

- Ordering is open **Tuesday 12:00am → Monday 11:59pm** (local business time).
- Orders placed in the current window are **prepared and delivered next week**.
- While customers order for Week N, the chef prepares Week N-1.

---

## Data Flow

1. `apps/web` calls CMS endpoints with an internal API key.
2. `apps/cms` validates input with Zod and runs service logic.
3. Prisma writes to Postgres.
4. Admin dashboard surfaces prep, rotation, and reporting data.

---

## Auth & Security

- All auth and protected endpoints live in `apps/cms`.
- `apps/web` should use CMS APIs (no direct DB access).
- Internal API access uses `x-internal-api-key`.
- Do not leak internal errors to public clients.

---

## Environment Variables

**CMS**

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `INTERNAL_API_SECRET`

**Web**

- `CMS_API_URL`
- `INTERNAL_API_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET`

---

## Prisma (packages/db)

- Schema and migrations live in `packages/db/prisma`.
- Prisma Client is generated to `packages/db/src/generated/prisma`.
- The shared Prisma client is exported from `@fwe/db`.

Common commands (from repo root):

```sh
bun run db:generate
bun run db:migrate
bun run db:migrate:deploy
bun run db:studio
bun run db:seed
```

---

## Code Style & Conventions

- Imports: external → internal alias → relative.
- Prefer `@/` alias for app-local imports.
- Components: PascalCase. Functions/vars: camelCase.
- Files: kebab-case (or framework-required).
- Validate inputs with Zod before service calls.
- Keep server-only code out of client components.

---

## UI Strategy

- UI components remain app-specific (`apps/web`, `apps/cms`).
- Do not introduce a shared UI package unless styles converge.

---

## Turborepo Workflow

```sh
bun install
bun run dev
bun run build
bun run lint
bun run check-types
```

Run a single app:

```sh
bun run dev --filter=web
bun run dev --filter=cms
```

---

## Migration Plan (Phased)

1. Monorepo scaffold + move apps under `apps/`.
2. Extract Prisma into `packages/db` and update imports.
3. Extract shared Zod schemas and shared types.
4. Evaluate shared UI (only if styles converge).
5. Centralize ESLint/TS configs as needed.

---

## Agent Rules

- Always use Context7 when referencing external library docs.
- Prefer CMS as the single source of truth for data and auth.
- Avoid tRPC unless explicitly requested; REST + shared types is preferred.
- Run `bun run check-types` after structural changes.
- Do not introduce non-ASCII characters unless already used in a file.
