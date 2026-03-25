import { cookies } from "next/headers";

import {
  GUEST_CART_PROFILE_COOKIE,
  GUEST_FULFILLMENT_COOKIE,
  decodeGuestCartProfile,
  decodeGuestFulfillmentPreference,
} from "@/lib/cart-cookies";
import { getServerSession } from "@/lib/auth-server";
import { getCartForRequest } from "@/lib/get-cart-for-request";

import CartPageClient from "./cart-page-client";

export default async function CartPage() {
  const session = await getServerSession();
  const cookieStore = await cookies();

  const initialGuestProfile = session?.user
    ? null
    : decodeGuestCartProfile(
        cookieStore.get(GUEST_CART_PROFILE_COOKIE)?.value,
      );
  const initialFulfillment = session?.user
    ? null
    : decodeGuestFulfillmentPreference(
        cookieStore.get(GUEST_FULFILLMENT_COOKIE)?.value,
      );

  const initialCart = await getCartForRequest();

  return (
    <CartPageClient
      initialCart={initialCart}
      initialGuestProfile={initialGuestProfile}
      initialFulfillment={initialFulfillment}
    />
  );
}
