import type { ApiCart } from "@fwe/types";

export function countCartItemQuantity(cart: ApiCart | null | undefined): number {
  if (!cart?.items?.length) {
    return 0;
  }
  return cart.items.reduce((sum, line) => sum + line.quantity, 0);
}
