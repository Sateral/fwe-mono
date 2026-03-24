import { checkoutRequestSchema } from "@fwe/validators";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth-server";
import { cartsApi, mealsApi } from "@/lib/cms-api";
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

  return 500;
}

// ============================================
// Route Handler
// ============================================

export async function POST(request: NextRequest) {
  // Rate limiting: 5 checkout attempts per minute per IP
  const rateLimitResult = await checkoutRateLimiter.check(request);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  try {
    const session = await getServerSession();

    const body = await request.json();
    const validationResult = checkoutRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const data = validationResult.data;
    const userId = session?.user?.id;
    const userEmail = session?.user?.email ?? data.guest?.email;
    const userName = session?.user?.name ?? data.guest?.name;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Customer email is required for checkout" },
        { status: 400 },
      );
    }

    if (!session?.user && !data.guest?.name) {
      return NextResponse.json(
        { error: "Guest details are required for anonymous checkout" },
        { status: 400 },
      );
    }

    const rotation = await mealsApi.getActiveRotation();
    if (!rotation) {
      return NextResponse.json(
        { error: "No active ordering rotation" },
        { status: 409 },
      );
    }

    const cart = await cartsApi.create(userId, {
      requestId: data.requestId,
      rotationId: rotation.id,
      settlementMethod: data.settlementMethod,
      guest: data.guest,
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

    const checkoutSession = await cartsApi.checkout(cart.id, {
      userEmail,
      userName: userName ?? undefined,
      deliveryMethod: data.deliveryMethod,
      pickupLocation: data.pickupLocation,
      requestId: data.requestId,
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
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
