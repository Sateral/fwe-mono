import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeCart } from "@/lib/api-serializers";
import {
  guestFromSearchParams,
  resolveCartOwnerUserId,
} from "@/lib/cart-request-user";
import { cartService } from "@/lib/services/cart.service";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

/**
 * GET /api/carts/active?rotationId=&guestEmail=&guestName=
 * Returns the user's active cart for the ordering rotation, or null.
 */
export async function GET(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    let rotationId = url.searchParams.get("rotationId");
    if (!rotationId) {
      const { rotation } = await weeklyRotationService.getOrCreateOrderingRotation();
      rotationId = rotation.id;
    }

    const guest = guestFromSearchParams(url.searchParams);
    const userId = await resolveCartOwnerUserId(request, guest);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user identity (x-user-id or guest query params)" },
        { status: 400 },
      );
    }

    const cart = await cartService.getActiveCartForUserAndRotation(
      userId,
      rotationId,
    );

    return NextResponse.json(cart ? serializeCart(cart) : null);
  } catch (error) {
    console.error("[API] Failed to fetch active cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch active cart" },
      { status: 500 },
    );
  }
}
