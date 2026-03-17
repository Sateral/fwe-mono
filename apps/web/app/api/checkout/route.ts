import { checkoutRequestSchema } from "@fwe/validators";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth-server";
import { cartsApi, mealsApi } from "@/lib/cms-api";
import { checkoutRateLimiter } from "@/lib/rate-limit";

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
    // Authenticate user
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = checkoutRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    const data = validationResult.data;
    const rotation = await mealsApi.getActiveRotation();
    if (!rotation) {
      return NextResponse.json(
        { error: "No active ordering rotation" },
        { status: 409 },
      );
    }

    const cart = await cartsApi.create(session.user.id, {
      requestId: data.requestId,
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

    const checkoutSession = await cartsApi.checkout(cart.id, {
      userEmail: session.user.email,
      userName: session.user.name ?? undefined,
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
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
