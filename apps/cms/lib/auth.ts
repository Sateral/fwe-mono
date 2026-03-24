import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, createAuthMiddleware } from "better-auth/plugins";
import { Role } from "@fwe/db";
import prisma from "@/lib/prisma";
import { userService } from "./services/user.service";

export const auth = betterAuth({
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_BASE_URL ??
    "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: Role.USER,
      adminRoles: [Role.ADMIN],
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") {
        return;
      }

      // The web app proxies auth requests through the CMS and sets this header
      // to identify customer sign-ins. Only enforce the admin-only restriction
      // for direct CMS sign-in attempts (the admin dashboard).
      const authSource = ctx.headers?.get("x-auth-source");
      if (authSource === "web") {
        return;
      }

      const email = ctx.body?.email;

      if (email) {
        const user = await userService.findByEmail(email);
        if (!user || user.role !== Role.ADMIN) {
          throw new APIError("FORBIDDEN", {
            message: "You are not authorized to access this page",
          });
        }
      }
    }),
  },
  // Trusted origins from environment variable.
  // Supports either a CSV string or a JSON array string.
  // In production, set TRUSTED_ORIGINS=https://yourdomain.com,https://cms.yourdomain.com
  trustedOrigins: (() => {
    const raw = process.env.TRUSTED_ORIGINS;
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((origin) => String(origin).trim()).filter(Boolean);
      }
    } catch {
      // Fall back to CSV parsing.
    }

    return raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  })(),
});
