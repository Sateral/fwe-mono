import { cartCheckoutRequestSchema } from "@fwe/validators";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getServerSession } from "@/lib/auth-server";
import {
  CART_ID_COOKIE,
  GUEST_CART_PROFILE_COOKIE,
  decodeGuestCartProfile,
} from "@/lib/cart-cookies";
import { cartsApi } from "@/lib/cms-api";
import { checkoutRateLimiter } from "@/lib/rate-limit";

function resolveCheckoutErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message === "Hybrid carts are not supported in v1" ||
    error.message === "No active meal plan found"
  ) {
    return 409;
  }

  if (
    error.message === "Not enough meal plan credits" ||
    error.message === "Cart exceeds weekly credit cap"
  ) {
    return 400;
  }

  if (error.message === "Forbidden") {
    return 403;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await checkoutRateLimiter.check(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_ID_COOKIE)?.value;
    if (!cartId) {
      return NextResponse.json({ error: "No cart" }, { status: 400 });
    }

    const json = await request.json();
    const parsed = cartCheckoutRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const session = await getServerSession();
    const userId = session?.user?.id;

    const guestFromCookie = decodeGuestCartProfile(
      cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value,
    );

    const guestForCheckout =
      userId != null
        ? undefined
        : (parsed.data.guest ?? guestFromCookie ?? undefined);

    if (!userId && !guestForCheckout) {
      return NextResponse.json(
        { error: "Sign in or use guest checkout details" },
        { status: 400 },
      );
    }

    const checkoutSession = await cartsApi.checkout(cartId, userId, {
      userEmail: parsed.data.userEmail,
      userName: parsed.data.userName,
      deliveryMethod: parsed.data.deliveryMethod,
      pickupLocation: parsed.data.pickupLocation,
      requestId: parsed.data.requestId,
      guest: guestForCheckout,
    });

    return NextResponse.json(checkoutSession);
  } catch (error) {
    console.error("[API/cart/checkout]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      { status: resolveCheckoutErrorStatus(error) },
    );
  }
}
