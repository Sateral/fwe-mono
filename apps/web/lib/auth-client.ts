import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authBaseUrl = process.env.NEXT_PUBLIC_AUTH_BASE_URL;

export const authClient = createAuthClient({
  ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
