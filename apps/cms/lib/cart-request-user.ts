import type { GuestCheckoutIdentity } from "@fwe/validators";

import { guestUserService } from "@/lib/services/guest-user.service";

/**
 * Resolves the user id for cart APIs: prefer `x-user-id`, else guest identity from body or query.
 */
export async function resolveCartOwnerUserId(
  request: Request,
  guest?: GuestCheckoutIdentity | null,
): Promise<string | null> {
  const headerUserId = request.headers.get("x-user-id");
  if (headerUserId) {
    return headerUserId;
  }

  if (guest?.email && guest?.name) {
    const guestUser = await guestUserService.findOrCreateCheckoutGuestUser(guest);
    return guestUser.id;
  }

  return null;
}

export function guestFromSearchParams(searchParams: URLSearchParams): GuestCheckoutIdentity | null {
  const email = searchParams.get("guestEmail")?.trim();
  const name = searchParams.get("guestName")?.trim();
  if (!email || !name) {
    return null;
  }
  return { email, name };
}
