"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";

/**
 * Client-side component that checks if user profile is complete.
 * Redirects to /onboarding if profile is incomplete.
 *
 * Add this to layouts that require a complete profile.
 */
export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if still loading or on excluded paths
    if (isPending) return;
    if (pathname === "/onboarding") return;
    if (pathname.startsWith("/sign-")) return;

    // If logged in, check profile completion
    if (session?.user?.id) {
      checkProfile(session.user.id);
    }

    async function checkProfile(userId: string) {
      try {
        const response = await fetch(`/api/user/${userId}`);

        if (response.ok) {
          const user = await response.json();
          if (!user.profileComplete) {
            router.push("/onboarding");
          }
        }
      } catch (error) {
        console.error("[ProfileGuard] Failed to check profile:", error);
      }
    }
  }, [session, isPending, pathname, router]);

  return <>{children}</>;
}
