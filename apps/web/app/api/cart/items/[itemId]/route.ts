import {
  replaceCartItemBodySchema,
  updateCartItemQuantitySchema,
} from "@fwe/validators";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getServerSession } from "@/lib/auth-server";
import {
  CART_ID_COOKIE,
  GUEST_CART_PROFILE_COOKIE,
  decodeGuestCartProfile,
} from "@/lib/cart-cookies";
import { cartsApi } from "@/lib/cms-api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_ID_COOKIE)?.value;
    if (!cartId) {
      return NextResponse.json({ error: "No cart" }, { status: 400 });
    }

    const json = await request.json();
    const parsed = updateCartItemQuantitySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { itemId } = await params;
    const session = await getServerSession();

    const guestPayload =
      parsed.data.guest ??
      decodeGuestCartProfile(cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value);

    if (session?.user?.id) {
      const cart = await cartsApi.updateCartItemQuantity(
        cartId,
        itemId,
        session.user.id,
        { quantity: parsed.data.quantity },
      );
      return NextResponse.json(cart);
    }

    if (!guestPayload) {
      return NextResponse.json(
        {
          error:
            "Save your name and email on the cart page before updating your cart.",
          code: "GUEST_PROFILE_REQUIRED",
        },
        { status: 400 },
      );
    }

    const cart = await cartsApi.updateCartItemQuantity(
      cartId,
      itemId,
      undefined,
      {
        quantity: parsed.data.quantity,
        guest: guestPayload,
      },
    );
    return NextResponse.json(cart);
  } catch (error) {
    console.error("[API/cart/items PATCH]", error);
    const message = error instanceof Error ? error.message : "Failed to update line";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_ID_COOKIE)?.value;
    if (!cartId) {
      return NextResponse.json({ error: "No cart" }, { status: 400 });
    }

    const json = await request.json();
    const parsed = replaceCartItemBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { itemId } = await params;
    const session = await getServerSession();

    const guestFromCookie = decodeGuestCartProfile(
      cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value,
    );

    const body: typeof parsed.data = {
      ...parsed.data,
      guest: parsed.data.guest ?? guestFromCookie ?? undefined,
    };

    if (session?.user?.id) {
      const cart = await cartsApi.replaceCartItem(cartId, itemId, session.user.id, {
        ...body,
        guest: undefined,
      });
      return NextResponse.json(cart);
    }

    if (!body.guest) {
      return NextResponse.json(
        {
          error:
            "Save your name and email on the cart page before updating your cart.",
          code: "GUEST_PROFILE_REQUIRED",
        },
        { status: 400 },
      );
    }

    const cart = await cartsApi.replaceCartItem(cartId, itemId, undefined, body);
    return NextResponse.json(cart);
  } catch (error) {
    console.error("[API/cart/items PUT]", error);
    const message = error instanceof Error ? error.message : "Failed to update line";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
