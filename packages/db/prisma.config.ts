import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

// `turbo run migrate` cwd is packages/db; root `.env` lives two levels up.
const packageDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(packageDir, "../../.env") });

const databaseUrl = env("DATABASE_URL");
const shadowDatabaseUrl = (() => {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", "shadow");
  return url.toString();
})();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    shadowDatabaseUrl,
  },
});
