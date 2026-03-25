import { saveGuestCartProfileSchema } from "@fwe/validators";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  GUEST_CART_PROFILE_COOKIE,
  GUEST_FULFILLMENT_COOKIE,
  cartCookieOptions,
  decodeGuestFulfillmentPreference,
  encodeGuestCartProfile,
  encodeGuestFulfillmentPreference,
} from "@/lib/cart-cookies";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = saveGuestCartProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, deliveryMethod, pickupLocation } = parsed.data;
    const guest = { name: name.trim(), email: email.trim() };

    const cookieStore = await cookies();
    const existingFulfillment = decodeGuestFulfillmentPreference(
      cookieStore.get(GUEST_FULFILLMENT_COOKIE)?.value,
    );

    const method =
      deliveryMethod ?? existingFulfillment?.deliveryMethod ?? "DELIVERY";
    const pickupForStore =
      method === "PICKUP"
        ? pickupLocation?.trim() ||
          existingFulfillment?.pickupLocation ||
          "Xtreme Couture"
        : undefined;

    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      GUEST_CART_PROFILE_COOKIE,
      encodeGuestCartProfile(guest),
      cartCookieOptions(),
    );

    res.cookies.set(
      GUEST_FULFILLMENT_COOKIE,
      encodeGuestFulfillmentPreference({
        deliveryMethod: method,
        pickupLocation: pickupForStore,
      }),
      cartCookieOptions(),
    );

    return res;
  } catch (error) {
    console.error("[API/cart/guest-profile]", error);
    return NextResponse.json(
      { error: "Failed to save guest profile" },
      { status: 500 },
    );
  }
}
