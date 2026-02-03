# FWE Monorepo

Turborepo workspace for the FWE storefront and CMS apps.

## Apps

- `apps/web`: customer storefront (formerly `fwe-clean`)
- `apps/cms`: admin/CMS and API (formerly `fwe-cms`)

## Commands

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

## Notes

- Auth and all APIs remain centralized in `apps/cms`.
- Prisma stays in the CMS for now; shared packages will be extracted in later phases.
