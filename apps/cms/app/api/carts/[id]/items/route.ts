import { addCartItemsBodySchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeCart } from "@/lib/api-serializers";
import { resolveCartOwnerUserId } from "@/lib/cart-request-user";
import { cartService } from "@/lib/services/cart.service";
import { weeklyRotationService } from "@/lib/services/weekly-rotation.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = addCartItemsBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await params;
    const userId = await resolveCartOwnerUserId(request, parsed.data.guest ?? null);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user identity (x-user-id or guest in body)" },
        { status: 400 },
      );
    }

    const { rotation } = await weeklyRotationService.getOrCreateOrderingRotation();

    const cart = await cartService.addOrMergeItems(
      id,
      userId,
      rotation.id,
      parsed.data.items,
    );

    return NextResponse.json(serializeCart(cart));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to merge items";
    if (message === "Cart not found" || message === "Cart item not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message === "Cart is not active" ||
      message === "Rotation mismatch" ||
      message === "Forbidden"
    ) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[API] Failed to merge cart items:", error);
    return NextResponse.json({ error: "Failed to merge cart items" }, { status: 500 });
  }
}
