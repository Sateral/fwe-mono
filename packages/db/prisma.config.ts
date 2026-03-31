import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

// Prisma CLI cwd is packages/db; root `.env` lives two levels up.
const packageDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(packageDir, "../../.env") });

// Neon: pooler `DATABASE_URL` breaks `migrate deploy` ("migration persistence is not initialized").
// Prefer `DIRECT_URL` for CLI when set; apps still use `DATABASE_URL` at runtime via Prisma Client.
const databaseUrl =
  process.env.DIRECT_URL?.trim() || env("DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
