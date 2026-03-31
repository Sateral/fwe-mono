import { NextRequest, NextResponse } from "next/server";

/**
 * Parse TRUSTED_ORIGINS from environment variable.
 * Supports either a CSV string or a JSON array string.
 */
function getTrustedOrigins(): string[] {
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
}

const trustedOrigins = getTrustedOrigins();

/**
 * Check if the origin is allowed.
 * Allows the origin if it's in the trusted list.
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return trustedOrigins.includes(origin);
}

/**
 * Add CORS headers to the response for allowed origins.
 */
function setCorsHeaders(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-internal-api-key, x-auth-source",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  // Only apply CORS to API routes
  if (!isApiRoute) {
    return NextResponse.next();
  }

  // Handle preflight OPTIONS requests
  if (request.method === "OPTIONS") {
    if (origin && isOriginAllowed(origin)) {
      const response = new NextResponse(null, { status: 204 });
      return setCorsHeaders(response, origin);
    }
    // Reject preflight from unknown origins
    return new NextResponse(null, { status: 403 });
  }

  // For regular requests, add CORS headers if origin is allowed
  const response = NextResponse.next();

  if (origin && isOriginAllowed(origin)) {
    return setCorsHeaders(response, origin);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
