/**
 * Internal API Authentication
 *
 * This module provides authentication for internal service-to-service
 * communication between the Commerce app and CMS.
 *
 * Security Notes:
 * - Uses a shared secret (INTERNAL_API_SECRET) stored in environment variables
 * - Should be rotated periodically in production
 * - All internal API routes should validate this before processing requests
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the internal API key from the request headers.
 * Used to authenticate requests from the Commerce app.
 *
 * @param request - The incoming request
 * @returns true if the API key is valid, false otherwise
 */
export function validateInternalApiKey(request: Request | NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key");

  if (!apiKey) {
    console.warn("[API Auth] Missing x-internal-api-key header");
    return false;
  }

  const expectedKey = process.env.INTERNAL_API_SECRET;

  if (!expectedKey) {
    console.error(
      "[API Auth] INTERNAL_API_SECRET not configured in environment"
    );
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  if (apiKey.length !== expectedKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < apiKey.length; i++) {
    result |= apiKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Returns an unauthorized response for invalid API key.
 * Use this consistently across all internal API routes.
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Middleware-style function to protect internal API routes.
 * Returns null if authorized, or an error response if not.
 *
 * Usage:
 * ```ts
 * export async function POST(request: Request) {
 *   const authError = requireInternalAuth(request);
 *   if (authError) return authError;
 *   // ... rest of handler
 * }
 * ```
 */
export function requireInternalAuth(
  request: Request | NextRequest
): NextResponse | null {
  if (!validateInternalApiKey(request)) {
    return unauthorizedResponse("Invalid or missing API key");
  }
  return null;
}

/**
 * Check if a route should skip authentication (for public endpoints).
 * Currently, we authenticate all internal routes, but this can be
 * extended if needed.
 */
export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    "/api/meals", // GET meals is public (for menu display)
    "/api/rotation", // GET rotation is public (for menu display)
  ];

  // Only GET requests to these routes are public
  return publicRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Determines if a request should require internal authentication.
 * GET requests to meal/rotation endpoints are public.
 * All write operations (POST, PATCH, DELETE) require auth.
 */
export function shouldRequireAuth(
  request: Request | NextRequest,
  pathname: string
): boolean {
  const method = request.method.toUpperCase();

  // All write operations require auth
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return true;
  }

  // GET requests to sensitive routes require auth
  const sensitiveGetRoutes = [
    "/api/orders",
    "/api/failed-orders",
    "/api/users",
    "/api/dashboard",
  ];

  return sensitiveGetRoutes.some((route) => pathname.startsWith(route));
}

