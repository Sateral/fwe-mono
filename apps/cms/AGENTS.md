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

- Ordering is open **Tuesday 12:00am → Monday 11:59pm** (local business time).
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
- `lib/stripe-service.ts`: Order fulfillment (triple-check pattern).
- `app/api/webhooks/stripe/route.ts`: Stripe webhook handler.
- `lib/price-utils.ts`: Server-side pricing.

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

From each repo root:

- `npm run dev`
- `npm run lint`
- `npm run build`

Prisma (CMS):

- `npx prisma migrate dev`
- `npx prisma db seed`

---

## Environment Variables (High-level)

**CMS**

- `DATABASE_URL`
- `BETTER_AUTH_URL`
- `INTERNAL_API_SECRET`

**Customer app**

- `CMS_API_URL`
- `INTERNAL_API_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET`

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

**Target structure (proposed)**

```
apps/
  cms/        (current cms)
  web/        (current web)
packages/
  db/         (Prisma schema + client)
  validators/ (Zod schemas)
  types/      (shared types)
  ui/         (optional; only if styles converge)
  config/     (eslint, tsconfig, prettier)
  utils/      (shared helpers)
```

**Phased approach**

1. **Scaffold TurboRepo** with both apps under `apps/`.
2. **Extract Prisma** to `packages/db`, update imports.
3. **Extract shared Zod + types** to `packages/validators` and `packages/types`.
4. **Keep UI app-specific** unless styles converge.
5. **Centralize config** (TS/ESLint/Prettier) in `packages/config`.

---

## Suggested Next Tasks (Update After Each Task)

- Finalize TurboRepo scaffold and move both apps into `apps/`.
- Extract Prisma schema/client into `packages/db`.
- Consolidate Zod schemas and shared types.
- Keep UI app-specific (revisit only if styles converge).
