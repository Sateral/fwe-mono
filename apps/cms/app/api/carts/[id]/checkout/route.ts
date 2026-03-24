import { cartCheckoutRequestSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { createStripeCheckoutSessionForCart } from "@/lib/services/cart-checkout.service";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = cartCheckoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await params;
    const session = await createStripeCheckoutSessionForCart({
      cartId: id,
      ...parsed.data,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error("[API] Failed to create cart checkout session:", error);
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
