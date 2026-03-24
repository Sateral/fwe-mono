import { checkoutSessionRequestSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { cartService } from "@/lib/services/cart.service";
import { createStripeCheckoutSessionForCart } from "@/lib/services/cart-checkout.service";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

export async function POST(request: Request) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = checkoutSessionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const { rotation } =
      await weeklyRotationService.getOrCreateOrderingRotation();

    const cart = await cartService.createCart(data.userId, {
      rotationId: rotation.id,
      settlementMethod: "STRIPE",
      items: [
        {
          mealId: data.mealId,
          quantity: data.quantity,
          substitutions: data.substitutions,
          modifiers: data.modifiers,
          proteinBoost: data.proteinBoost,
          notes: data.notes,
        },
      ],
    });

    const session = await createStripeCheckoutSessionForCart({
      cartId: cart.id,
      userEmail: data.userEmail,
      userName: data.userName,
      deliveryMethod: data.deliveryMethod,
      pickupLocation: data.pickupLocation,
      requestId: data.requestId,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("[API] Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
