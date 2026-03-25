import "server-only";

import type { GuestCheckoutIdentity } from "@fwe/validators";

export const CART_ID_COOKIE = "fwe_cart_id";
export const GUEST_CART_PROFILE_COOKIE = "fwe_guest_cart_profile";
export const GUEST_FULFILLMENT_COOKIE = "fwe_guest_fulfillment";

const PROFILE_PREFIX = "v1.";
const FULFILLMENT_PREFIX = "v1.";

export type GuestFulfillmentPreference = {
  deliveryMethod: "DELIVERY" | "PICKUP";
  pickupLocation?: string;
};

export function cartCookieOptions(maxAgeSec = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSec,
    path: "/",
  };
}

export function encodeGuestCartProfile(guest: GuestCheckoutIdentity): string {
  return (
    PROFILE_PREFIX +
    Buffer.from(
      JSON.stringify({ email: guest.email.trim(), name: guest.name.trim() }),
      "utf8",
    ).toString("base64url")
  );
}

export function decodeGuestCartProfile(
  raw: string | undefined,
): GuestCheckoutIdentity | null {
  if (!raw || !raw.startsWith(PROFILE_PREFIX)) {
    return null;
  }
  try {
    const json = Buffer.from(raw.slice(PROFILE_PREFIX.length), "base64url").toString(
      "utf8",
    );
    const parsed = JSON.parse(json) as { email?: string; name?: string };
    if (
      typeof parsed.email === "string" &&
      typeof parsed.name === "string" &&
      parsed.email.length > 0 &&
      parsed.name.length > 0
    ) {
      return { email: parsed.email, name: parsed.name };
    }
  } catch {
    return null;
  }
  return null;
}

export function encodeGuestFulfillmentPreference(
  pref: GuestFulfillmentPreference,
): string {
  return (
    FULFILLMENT_PREFIX +
    Buffer.from(
      JSON.stringify({
        deliveryMethod: pref.deliveryMethod,
        pickupLocation: pref.pickupLocation ?? null,
      }),
      "utf8",
    ).toString("base64url")
  );
}

export function decodeGuestFulfillmentPreference(
  raw: string | undefined,
): GuestFulfillmentPreference | null {
  if (!raw || !raw.startsWith(FULFILLMENT_PREFIX)) {
    return null;
  }
  try {
    const json = Buffer.from(
      raw.slice(FULFILLMENT_PREFIX.length),
      "base64url",
    ).toString("utf8");
    const parsed = JSON.parse(json) as {
      deliveryMethod?: string;
      pickupLocation?: string | null;
    };
    if (parsed.deliveryMethod === "DELIVERY" || parsed.deliveryMethod === "PICKUP") {
      return {
        deliveryMethod: parsed.deliveryMethod,
        pickupLocation:
          typeof parsed.pickupLocation === "string" && parsed.pickupLocation.length > 0
            ? parsed.pickupLocation
            : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}
