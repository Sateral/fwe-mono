import "dotenv/config";
import { defineConfig, env } from "prisma/config";

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
