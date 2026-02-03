import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require profile completion check
const PUBLIC_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/api",
  "/_next",
  "/favicon.ico",
  "/images",
];

// Routes that don't require authentication at all (public pages)
const UNAUTHENTICATED_ROUTES = ["/", "/menu"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes (these handle their own auth if needed)
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie (better-auth uses this cookie name)
  const sessionCookie = request.cookies.get("better-auth.session_token");

  // Not logged in - let the page handle it for authenticated routes
  // or just continue for public pages
  if (!sessionCookie) {
    return NextResponse.next();
  }

  // User is logged in - check if profile is complete
  try {
    // Get current session from better-auth API
    const baseUrl = request.nextUrl.origin;
    const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!sessionResponse.ok) {
      // Session invalid, let page handle it
      return NextResponse.next();
    }

    const session = await sessionResponse.json();

    if (!session?.user?.id) {
      return NextResponse.next();
    }

    // Check if user profile is complete via our local API
    const userResponse = await fetch(`${baseUrl}/api/user/${session.user.id}`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (userResponse.ok) {
      const user = await userResponse.json();

      // If profile is not complete, redirect to onboarding
      if (!user.profileComplete) {
        const onboardingUrl = new URL("/onboarding", request.url);
        return NextResponse.redirect(onboardingUrl);
      }
    }
  } catch (error) {
    console.error("[Proxy] Failed to check profile:", error);
    // On error, let the request continue - page-level guards will handle it
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
