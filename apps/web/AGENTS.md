# AGENTS.md — FWE Workspace Guide

This workspace contains two Next.js apps that power a chef's meal-prep business:

- `web` (customer-facing storefront)
- `cms` (admin/CMS dashboard + data/API source of truth)

The long-term goal is to merge both into a single TurboRepo monorepo with shared
packages (Prisma/db, shared types, UI, validation, config).

---

## Project Goal & Business Rules

This is a website for a single chef. Customers sign up, browse meals, and place
meal-prep orders. Meals can be:

- **Signature meals**: always available.
- **Weekly meals**: only available for a specific rotation window.

**Ordering Window (n / n+1 model):**

- Ordering is open **Wednesday 12:00am → Tuesday 11:59pm** (local business time).
- Orders placed in the current window are **prepared and delivered next week**.
- While users order for Week N, the chef prepares Week N-1.

**Admin CMS:**

- Secure admin-only dashboard.
- Manage meals, tags, and weekly rotations.
- Plan upcoming rotations ahead of time; system auto-flips after cutoff.
- Orders pages provide prep summaries, customer breakdowns, and delivery needs.

---

## Workspace Index (Current State)

### `cms` (Admin/CMS + API)

**Purpose:** Source of truth for meals, rotations, orders, and reporting.

**Entry points**

- `app/layout.tsx`: Providers (Theme, Query, Toaster).
- `app/dashboard/*`: Admin dashboard UI.
- `app/api/*`: REST handlers (data layer entry).
- `prisma/schema.prisma`: Database schema.

**Key directories**

- `app/dashboard/`: Admin pages.
  - `menu/`: Meal + tag CRUD.
  - `orders/`: Order tables, summaries, prep sheets.
  - `rotation/`: Weekly rotation planning.
- `app/api/`: API routes.
  - `meals`, `orders`, `rotation`, `failed-orders`, `dashboard/metrics`,
    `reports/prep-sheet`, `cron/rotation-flip`.
- `lib/services/`: Business logic (service layer).
- `lib/actions/`: Server actions (thin wrappers).
- `packages/validators`: shared Zod schemas (input validation).
- `lib/constants/`: Query keys, status flow, enums.
- `hooks/`: React Query hooks.
- `components/ui/`: Shared UI components.

**Notable files**

- `lib/prisma.ts`: Prisma client singleton.
- `lib/api-auth.ts`: Internal API key guard (`x-internal-api-key`).
- `lib/auth.ts`: Better Auth config (admin access).
- `scripts/fix-rotation-cutoffs.ts`: Maintenance script.

---

### `web` (Customer storefront)

**Purpose:** Public ordering flow and Stripe checkout. Uses CMS APIs.

**Entry points**

- `app/layout.tsx`: Global providers.
- `app/page.tsx`: Landing page.
- `app/menu/page.tsx`: Signature + weekly meals.
- `app/order/[slug]/page.tsx`: Meal customization + checkout.

**Key directories**

- `components/`: Marketing + ordering UI.
- `app/api/`: Stripe checkout, webhooks, cron sync, auth.
- `lib/`: CMS API client, Stripe utilities, caching, auth.
- `actions/meal-services.ts`: Cached meal fetches.

**Notable files**

- `lib/cms-api.ts`: Typed client for CMS endpoints.
- `lib/order-service.ts`: Order orchestration (checkout + fulfillment).
- `lib/rate-limit.ts`: Rate limiting for public API routes.

---

## Data Flow (Current)

1. Customer app (`web`) calls CMS endpoints with internal API key.
2. CMS (`cms`) validates input with Zod and executes services.
3. Prisma writes to DB.
4. Admin dashboard surfaces data for prep and planning.

---

## Tech Stack (Current)

**Both apps**

- Next.js App Router (v16)
- React 19
- TypeScript (strict)
- Tailwind CSS 4 + Radix + shadcn/ui
- Zod validation
- React Hook Form

**CMS-specific**

- Prisma + Postgres
- TanStack Query
- Better Auth

**Customer app**

- Stripe (checkout + webhooks)
- CMS API client
- Rate limiting + webhook deduping

---

## Local Development

From the monorepo root:

- `bun run dev` (all apps)
- `bun run dev --filter=web` (web only)
- `bun run dev --filter=cms` (CMS only)
- `bun run build`
- `bun run lint`
- `bun run check-types`

Prisma (from monorepo root):

- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:seed`

---

## Environment Variables (High-level)

**CMS**

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `INTERNAL_API_SECRET`

**Customer app**

- `CMS_API_URL`
- `INTERNAL_API_SECRET`
- `NEXT_PUBLIC_AUTH_BASE_URL` (optional; defaults to `/api/auth` proxy)

---

## Code Style & Best Practices

### Imports

- Prefer absolute imports via `@/` (when configured).
- Order imports: external → internal alias → relative.
- Avoid unused imports.

### Types & Validation

- Prefer Zod schemas for API input validation.
- Use shared schemas from `packages/validators` for API input validation.
- Validate whenever possible before service calls.

### Naming

- Components: `PascalCase`.
- Functions/vars: `camelCase`.
- Files: `kebab-case` (or framework-required patterns).

### Error Handling

- Fail fast with helpful messages.
- Do not leak internal errors to client UIs.
- Use clear error boundaries in the UI.

### Server/Client Boundaries

- No server-only code in client components.
- Use server actions or API routes for mutations.

---

## Agent Workflow Rules

### Documentation Rule (Context7)

- Always use the Context7 MCP when referencing library docs, setup steps, or
  configuration details. Do this proactively.

### MCP Best Practices

- Prefer MCP tools over ad hoc knowledge for external APIs.
- Summarize findings and cite sources in commit/PR summaries.

### Cursor Rules

- Existing Cursor rules live in `.cursor/rules/`.

---

## Migration Plan: TurboRepo Monorepo

**Current structure (implemented)**

```
apps/
  cms/        (admin dashboard + API)
  web/        (customer storefront)
packages/
  db/         (Prisma schema + client)
  validators/ (Zod schemas)
  types/      (shared API response types)
  utils/      (shared helpers: formatting, cn())
  ui/         (placeholder; unused)
  eslint-config/  (shared ESLint rules)
  typescript-config/ (shared TS configs)
```

**Completed phases**

1. ~~Scaffold TurboRepo with both apps under `apps/`.~~ Done.
2. ~~Extract Prisma to `packages/db`, update imports.~~ Done.
3. ~~Extract shared Zod + types to `packages/validators` and `packages/types`.~~ Done.

**Remaining**

4. **Keep UI app-specific** unless styles converge.
5. **Centralize config** further as needed.

---

## Suggested Next Tasks (Update After Each Task)

- Build `/about` and `/contact` pages.
- Replace mock landing page data with CMS API calls.
- Add `error.tsx`, `loading.tsx`, `not-found.tsx` files.
- Migrate `Float` to `Decimal` for monetary fields (requires Prisma migration).
- Add test infrastructure.
- Evaluate shared UI package (only if styles converge).
