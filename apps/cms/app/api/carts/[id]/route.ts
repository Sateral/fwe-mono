import { updateCartSchema } from "@fwe/validators";
import { NextResponse } from "next/server";

import { requireInternalAuth } from "@/lib/api-auth";
import { serializeCart } from "@/lib/api-serializers";
import { cartService } from "@/lib/services/cart.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const cart = await cartService.getCartById(id);

    if (!cart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    return NextResponse.json(serializeCart(cart));
  } catch (error) {
    console.error("[API] Failed to fetch cart:", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireInternalAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = updateCartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await params;
    const cart = await cartService.updateCart(id, parsed.data);

    return NextResponse.json(serializeCart(cart));
  } catch (error) {
    console.error("[API] Failed to update cart:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}
