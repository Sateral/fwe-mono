import { cookies } from "next/headers";

import type { ApiCart } from "@fwe/types";

import { getServerSession } from "@/lib/auth-server";
import {
  CART_ID_COOKIE,
  GUEST_CART_PROFILE_COOKIE,
  decodeGuestCartProfile,
} from "@/lib/cart-cookies";
import { cartsApi } from "@/lib/cms-api";

/**
 * Load the active cart for the current cookies + session (same rules as GET /api/cart).
 * Safe to call from Server Components and route handlers.
 */
export async function getCartForRequest(): Promise<ApiCart | null> {
  try {
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_ID_COOKIE)?.value;
    if (!cartId) {
      return null;
    }

    const session = await getServerSession();

    if (session?.user?.id) {
      try {
        const cart = await cartsApi.getCartById(cartId, session.user.id);
        if (cart.status !== "ACTIVE") {
          return null;
        }
        return cart;
      } catch {
        return null;
      }
    }

    const guest = decodeGuestCartProfile(
      cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value,
    );
    if (!guest) {
      return null;
    }

    try {
      const cart = await cartsApi.getCartById(cartId, undefined, guest);
      if (cart.status !== "ACTIVE") {
        return null;
      }
      return cart;
    } catch {
      return null;
    }
  } catch (error) {
    console.error("[getCartForRequest]", error);
    return null;
  }
}
