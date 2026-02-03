import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, createAuthMiddleware } from "better-auth/plugins";
import prisma from "@/lib/prisma";
import { userService } from "./services/user.service";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") {
        return;
      }

      const email = ctx.body?.email;

      if (email) {
        const user = await userService.findByEmail(email);
        if (!user || user.role !== "admin") {
          throw new APIError("FORBIDDEN", {
            message: "You are not authorized to access this page",
          });
        }
      }
    }),
  },
  // Trusted origins from environment variable
  // In production, set TRUSTED_ORIGINS=https://yourdomain.com,https://cms.yourdomain.com
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",").map(origin => origin.trim()) || [],
});
