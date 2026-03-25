import { addCartItemsBodySchema } from "@fwe/validators";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth-server";
import {
  CART_ID_COOKIE,
  GUEST_CART_PROFILE_COOKIE,
  GUEST_FULFILLMENT_COOKIE,
  cartCookieOptions,
  decodeGuestCartProfile,
  encodeGuestCartProfile,
} from "@/lib/cart-cookies";
import { cartsApi, mealsApi } from "@/lib/cms-api";

const addToCartRequestSchema = addCartItemsBodySchema.extend({
  rotationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = addToCartRequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { rotationId: bodyRotationId, ...body } = parsed.data;

    const rotation =
      bodyRotationId != null
        ? { id: bodyRotationId }
        : await mealsApi.getActiveRotation();

    if (!rotation) {
      return NextResponse.json(
        { error: "No active ordering rotation" },
        { status: 409 },
      );
    }

    const session = await getServerSession();
    const cookieStore = await cookies();

    if (session?.user?.id) {
      const userId = session.user.id;
      let cart = await cartsApi.getActiveCart(userId, rotation.id);

      if (cart) {
        cart = await cartsApi.addCartItems(cart.id, userId, {
          items: body.items,
        });
      } else {
        cart = await cartsApi.create(userId, {
          rotationId: rotation.id,
          settlementMethod: "STRIPE",
          items: body.items,
        });
      }

      const response = NextResponse.json(cart);
      response.cookies.set(CART_ID_COOKIE, cart.id, cartCookieOptions());
      response.cookies.set(GUEST_CART_PROFILE_COOKIE, "", {
        ...cartCookieOptions(0),
        maxAge: 0,
      });
      response.cookies.set(GUEST_FULFILLMENT_COOKIE, "", {
        ...cartCookieOptions(0),
        maxAge: 0,
      });
      return response;
    }

    const guest =
      body.guest ??
      decodeGuestCartProfile(cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value);

    if (!guest) {
      return NextResponse.json(
        {
          error:
            "Save your name and email on the cart page before adding items from the menu.",
          code: "GUEST_PROFILE_REQUIRED",
        },
        { status: 400 },
      );
    }

    let cart = await cartsApi.getActiveCart(undefined, rotation.id, guest);

    if (cart) {
      cart = await cartsApi.addCartItems(cart.id, undefined, {
        items: body.items,
        guest,
      });
    } else {
      cart = await cartsApi.create(undefined, {
        rotationId: rotation.id,
        settlementMethod: "STRIPE",
        guest,
        items: body.items,
      });
    }

    const response = NextResponse.json(cart);
    response.cookies.set(CART_ID_COOKIE, cart.id, cartCookieOptions());
    response.cookies.set(
      GUEST_CART_PROFILE_COOKIE,
      encodeGuestCartProfile(guest),
      cartCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("[API/cart/add]", error);
    const message = error instanceof Error ? error.message : "Failed to add to cart";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
