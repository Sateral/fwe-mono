import { NextResponse } from "next/server";

import {
  CART_ID_COOKIE,
  GUEST_CART_PROFILE_COOKIE,
  GUEST_FULFILLMENT_COOKIE,
  cartCookieOptions,
} from "@/lib/cart-cookies";
import { getCartForRequest } from "@/lib/get-cart-for-request";

export async function GET() {
  try {
    const cart = await getCartForRequest();
    return NextResponse.json(cart);
  } catch (error) {
    console.error("[API/cart GET]", error);
    return NextResponse.json(null);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CART_ID_COOKIE, "", { ...cartCookieOptions(0), maxAge: 0 });
  res.cookies.set(GUEST_CART_PROFILE_COOKIE, "", {
    ...cartCookieOptions(0),
    maxAge: 0,
  });
  res.cookies.set(GUEST_FULFILLMENT_COOKIE, "", {
    ...cartCookieOptions(0),
    maxAge: 0,
  });
  return res;
}
