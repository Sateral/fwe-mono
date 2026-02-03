# FWE Monorepo

Turborepo workspace for the FWE storefront and CMS apps.

## Apps

- `apps/web`: customer storefront
- `apps/cms`: admin/CMS and API

## Commands

```sh
bun install
bun run dev
bun run build
bun run lint
bun run check-types
```

Local database (Docker):

```sh
bun run db:up
bun run db:migrate
```

Run a single app:

```sh
bun run dev --filter=web
bun run dev --filter=cms
```

## Notes

- Auth and all APIs remain centralized in `apps/cms`.
- Prisma lives in `packages/db` and is imported by the CMS.
