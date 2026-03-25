import { guestFulfillmentPreferenceSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import {
  GUEST_FULFILLMENT_COOKIE,
  cartCookieOptions,
  encodeGuestFulfillmentPreference,
} from "@/lib/cart-cookies";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = guestFulfillmentPreferenceSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { deliveryMethod, pickupLocation } = parsed.data;
    const res = NextResponse.json({ ok: true });
    res.cookies.set(
      GUEST_FULFILLMENT_COOKIE,
      encodeGuestFulfillmentPreference({
        deliveryMethod,
        pickupLocation:
          deliveryMethod === "PICKUP"
            ? (pickupLocation?.trim() || "Xtreme Couture")
            : undefined,
      }),
      cartCookieOptions(),
    );
    return res;
  } catch (error) {
    console.error("[API/cart/fulfillment-preference]", error);
    return NextResponse.json(
      { error: "Failed to save fulfillment preference" },
      { status: 500 },
    );
  }
}
