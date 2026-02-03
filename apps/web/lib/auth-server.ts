import "server-only";

import { createAuthClient } from "better-auth/client";
import { headers } from "next/headers";

const baseURL = process.env.CMS_API_URL ?? "http://localhost:3001";

const authClient = createAuthClient({
  baseURL,
});

export type ServerSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    createdAt?: string | Date;
  };
  session?: Record<string, unknown>;
} | null;

export async function getServerSession(): Promise<ServerSession> {
  const result = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!result || typeof result !== "object" || !("data" in result)) {
    return null;
  }

  const data = (result as { data?: ServerSession | null }).data;
  return data ?? null;
}
