/**
 * Order-time snapshot fields on Order win over User profile for fulfillment UI.
 */

export interface OrderFulfillmentContact {
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostal: string | null;
  deliveryNotes: string | null;
}

type UserProfileSlice = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryPostal?: string | null;
  deliveryNotes?: string | null;
} | null;

export type OrderWithFulfillmentSnapshot = {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerDeliveryAddress?: string | null;
  customerDeliveryCity?: string | null;
  customerDeliveryPostal?: string | null;
  customerDeliveryNotes?: string | null;
  user?: UserProfileSlice;
};

function trimOrNull(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function getEffectiveOrderFulfillment(
  order: OrderWithFulfillmentSnapshot,
): OrderFulfillmentContact {
  const u = order.user;

  const customerName =
    trimOrNull(order.customerName) ?? trimOrNull(u?.name) ?? "Guest";
  const customerEmail =
    trimOrNull(order.customerEmail) ?? trimOrNull(u?.email) ?? "";
  const customerPhone =
    trimOrNull(order.customerPhone) ?? trimOrNull(u?.phone) ?? null;
  const deliveryAddress =
    trimOrNull(order.customerDeliveryAddress) ??
    trimOrNull(u?.deliveryAddress) ??
    null;
  const deliveryCity =
    trimOrNull(order.customerDeliveryCity) ??
    trimOrNull(u?.deliveryCity) ??
    null;
  const deliveryPostal =
    trimOrNull(order.customerDeliveryPostal) ??
    trimOrNull(u?.deliveryPostal) ??
    null;
  const deliveryNotes =
    trimOrNull(order.customerDeliveryNotes) ??
    trimOrNull(u?.deliveryNotes) ??
    null;

  return {
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    deliveryCity,
    deliveryPostal,
    deliveryNotes,
  };
}

/** Stable string for comparing whether two orders ship to the same place. */
export function getDeliveryFingerprintForOrder(
  order: OrderWithFulfillmentSnapshot & {
    deliveryMethod?: string;
    pickupLocation?: string | null;
  },
): string {
  if (order.deliveryMethod === "PICKUP") {
    return `PICKUP:${order.pickupLocation ?? ""}`;
  }
  const e = getEffectiveOrderFulfillment(order);
  return [
    e.deliveryAddress ?? "",
    e.deliveryCity ?? "",
    e.deliveryPostal ?? "",
  ].join("|");
}
