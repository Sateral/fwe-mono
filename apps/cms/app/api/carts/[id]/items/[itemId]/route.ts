import {
  replaceCartItemBodySchema,
  updateCartItemQuantitySchema,
} from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeCart } from "@/lib/api-serializers";
import { resolveCartOwnerUserId } from "@/lib/cart-request-user";
import { cartService } from "@/lib/services/cart.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = updateCartItemQuantitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id, itemId } = await params;
    const userId = await resolveCartOwnerUserId(request, parsed.data.guest ?? null);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user identity (x-user-id or guest in body)" },
        { status: 400 },
      );
    }

    const cart = await cartService.setCartItemQuantity(
      id,
      itemId,
      userId,
      parsed.data.quantity,
    );

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    return NextResponse.json(serializeCart(cart));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update line";
    if (message === "Cart item not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Cart is not active") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("[API] Failed to update cart item:", error);
    return NextResponse.json({ error: "Failed to update cart item" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = replaceCartItemBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id, itemId } = await params;
    const { guest, mealId, quantity, substitutions, modifiers, notes } =
      parsed.data;
    const userId = await resolveCartOwnerUserId(request, guest ?? null);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user identity (x-user-id or guest in body)" },
        { status: 400 },
      );
    }

    const cart = await cartService.replaceCartLine(id, itemId, userId, {
      mealId,
      quantity,
      substitutions,
      modifiers,
      notes,
    });

    return NextResponse.json(serializeCart(cart));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to replace line";
    if (message === "Cart item not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (
      message === "Cart is not active" ||
      message === "Meal cannot be changed for this cart line" ||
      message === "Cart line is missing rotation"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[API] Failed to replace cart item:", error);
    return NextResponse.json({ error: "Failed to replace cart item" }, { status: 500 });
  }
}
