import { cartCheckoutRequestSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { createStripeCheckoutSessionForCart } from "@/lib/services/cart-checkout.service";

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
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
