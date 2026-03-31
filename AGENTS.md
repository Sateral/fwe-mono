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
- CMS is admin-only; customers should never access CMS routes.
- Do not leak internal errors to public clients.

---

## Environment Variables

**CMS**

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `TRUSTED_ORIGINS`
- `INTERNAL_API_SECRET`
- `WEB_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET`
- `UPLOADTHING_TOKEN` (get from https://uploadthing.com/dashboard)
- `FAILED_ORDER_ALERT_WEBHOOK_URL` (optional; Slack/custom JSON webhook when order creation fails after payment)

**Web**

- `CMS_API_URL`
- `INTERNAL_API_SECRET`
- `NEXT_PUBLIC_AUTH_BASE_URL` (optional; defaults to `/api/auth` proxy)

---

## Prisma (packages/db)

- Schema and **versioned migrations** live in `packages/db/prisma`.
- Prisma Client is generated to `packages/db/src/generated/prisma`.
- The shared Prisma client is exported from `@fwe/db`.

**Workflow**

- **Apply pending migrations** (local, CI, production): `bun run db:migrate` or `bun run db:migrate:deploy` (both run `prisma migrate deploy`; no shadow DB). `packages/db` sets `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` on those commands to avoid Neon advisory-lock timeouts.
- On Neon, set `DIRECT_URL` to a **non-pooler** URL in `.env`; `prisma.config.ts` uses it for the CLI when present (pooler URLs can break migrate or hit “persistence not initialized”).
- **Create a new migration** after editing `schema.prisma`: from `packages/db`, run `bun run migrate:dev` (`prisma migrate dev`; needs a Postgres that allows Prisma’s shadow DB, e.g. local Docker).
- **Optional:** `bun run db:push` only for throwaway local experiments. Do not use `db push` against production.

Common commands (from repo root):

```sh
bun run db:generate
bun run db:migrate
bun run db:migrate:deploy
bun run db:seed
bun run db:studio
bun run db:reset
bun run db:up
bun run db:down
bun run db:logs
```

If a database already matches the schema but has no (or stale) `_prisma_migrations` rows, use Prisma’s [baselining](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) flow (e.g. `migrate resolve`) rather than re-applying SQL.

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

## Agent Rules

- Always use Context7 when referencing external library docs.
- Prefer CMS as the single source of truth for data and auth.
- Avoid tRPC unless explicitly requested; REST + shared types is preferred.
- Run `bun run check-types` after structural changes.
- Do not introduce non-ASCII characters unless already used in a file.
- Always use the brainstorm skill
- NEVER write raw SQL and do migrations outside of prisma. Only ever use prisma and prisma schema to modify the DB.
