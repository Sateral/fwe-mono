"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GuestCheckoutIdentity } from "@fwe/validators";
import type { ApiCart, ApiCartItem } from "@fwe/types";
import { useSetCartNavCount } from "@/components/cart-count-provider";
import { useCartSheet } from "@/components/cart-sheet-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { getCartLineSummaryLines } from "@/lib/cart-line-summary";
import { countCartItemQuantity } from "@/lib/cart-item-count";
import { useSession } from "@/lib/auth-client";
import { Loader2, Minus, Plus, ShoppingBag, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const QTY_DEBOUNCE_MS = 400;
const FULFILLMENT_DEBOUNCE_MS = 400;

type GuestFulfillmentPreference = {
  deliveryMethod: "DELIVERY" | "PICKUP";
  pickupLocation?: string;
};

export default function CartSheet({
  initialCart,
  initialGuestProfile,
  initialFulfillment,
}: {
  initialCart: ApiCart | null;
  initialGuestProfile: GuestCheckoutIdentity | null;
  initialFulfillment: GuestFulfillmentPreference | null;
}) {
  const { open, setOpen } = useCartSheet();
  const { data: session } = useSession();
  const setCartNavCount = useSetCartNavCount();

  const [cart, setCart] = useState<ApiCart | null>(initialCart);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">(
    initialFulfillment?.deliveryMethod ?? "DELIVERY",
  );
  const [guestName, setGuestName] = useState(initialGuestProfile?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(initialGuestProfile?.email ?? "");
  const [guestProfileCommitted, setGuestProfileCommitted] = useState(
    Boolean(initialGuestProfile),
  );

  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

  const qtyTargetRef = useRef<Record<string, number>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fulfillmentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial cart when it changes (e.g. after SSR navigation)
  useEffect(() => {
    setCart(initialCart);
  }, [initialCart]);

  // Reload cart when sheet opens
  useEffect(() => {
    if (open) {
      void loadCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scheduleGuestFulfillmentPersist = useCallback(
    (method: "DELIVERY" | "PICKUP") => {
      if (fulfillmentDebounceRef.current) {
        clearTimeout(fulfillmentDebounceRef.current);
      }
      fulfillmentDebounceRef.current = setTimeout(() => {
        fulfillmentDebounceRef.current = null;
        void fetch("/api/cart/fulfillment-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryMethod: method,
            pickupLocation: method === "PICKUP" ? "Xtreme Couture" : undefined,
          }),
        }).catch(() => {});
      }, FULFILLMENT_DEBOUNCE_MS);
    },
    [],
  );

  const setGuestDeliveryMethod = (method: "DELIVERY" | "PICKUP") => {
    setDeliveryMethod(method);
    if (!session?.user && guestProfileCommitted) {
      scheduleGuestFulfillmentPersist(method);
    }
  };

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const data = (await res.json()) as ApiCart | null;
      setCart(data);
      setCartNavCount(countCartItemQuantity(data));
      setQtyDraft({});
      qtyTargetRef.current = {};
    } catch {
      setCart(null);
      setCartNavCount(0);
    } finally {
      setLoading(false);
    }
  }, [setCartNavCount]);

  useEffect(() => {
    const timersRef = debounceTimers;
    const fulfillmentTimer = fulfillmentDebounceRef;
    return () => {
      for (const t of Object.values(timersRef.current)) {
        clearTimeout(t);
      }
      if (fulfillmentTimer.current) {
        clearTimeout(fulfillmentTimer.current);
      }
    };
  }, []);

  const itemCount = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((s, i) => s + (qtyDraft[i.id] ?? i.quantity), 0);
  }, [cart, qtyDraft]);

  const subtotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce(
      (s, i) => s + i.unitPrice * (qtyDraft[i.id] ?? i.quantity),
      0,
    );
  }, [cart, qtyDraft]);

  const flushQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setSyncingItemId(itemId);
      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        const next = data as ApiCart;
        setCart(next);
        setCartNavCount(countCartItemQuantity(next));
        setQtyDraft((d) => {
          const n = { ...d };
          delete n[itemId];
          return n;
        });
        delete qtyTargetRef.current[itemId];
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update cart");
        setQtyDraft((d) => {
          const n = { ...d };
          delete n[itemId];
          return n;
        });
        delete qtyTargetRef.current[itemId];
        void loadCart();
      } finally {
        setSyncingItemId(null);
      }
    },
    [loadCart, setCartNavCount],
  );

  const scheduleQuantityChange = useCallback(
    (line: ApiCartItem, nextQty: number) => {
      if (nextQty < 0) return;
      const itemId = line.id;
      qtyTargetRef.current[itemId] = nextQty;
      setQtyDraft((d) => ({ ...d, [itemId]: nextQty }));

      if (debounceTimers.current[itemId]) {
        clearTimeout(debounceTimers.current[itemId]);
      }

      if (nextQty === 0) {
        void flushQuantity(itemId, 0);
        return;
      }

      debounceTimers.current[itemId] = setTimeout(() => {
        const q = qtyTargetRef.current[itemId];
        if (q !== undefined) void flushQuantity(itemId, q);
      }, QTY_DEBOUNCE_MS);
    },
    [flushQuantity],
  );

  const saveGuestProfile = async () => {
    const name = guestName.trim();
    const email = guestEmail.trim();
    if (!name || !email) {
      toast.error("Enter your full name and email");
      return;
    }
    setSaveProfileLoading(true);
    try {
      const res = await fetch("/api/cart/guest-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          deliveryMethod,
          pickupLocation: deliveryMethod === "PICKUP" ? "Xtreme Couture" : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save");
      setGuestProfileCommitted(true);
      toast.success("Your details are saved");
      await loadCart();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save details");
    } finally {
      setSaveProfileLoading(false);
    }
  };

  const handleCheckout = async () => {
    const email = session?.user?.email?.trim() || guestEmail.trim();
    const name = (session?.user?.name?.trim() || guestName.trim()) || undefined;

    if (!email) {
      toast.error("Email is required for checkout");
      return;
    }

    if (!session?.user) {
      if (!guestProfileCommitted) {
        toast.error("Save your details above before checkout");
        return;
      }
      if (!guestName.trim() || !guestEmail.trim()) {
        toast.error("Enter your name and email");
        return;
      }
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          userName: name,
          deliveryMethod,
          pickupLocation: deliveryMethod === "PICKUP" ? "Xtreme Couture" : undefined,
          guest:
            session?.user || !guestEmail.trim()
              ? undefined
              : { name: guestName.trim(), email: guestEmail.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      toast.error("Checkout did not return a payment URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex flex-col overflow-hidden sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Your Cart
            {itemCount > 0 && (
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Manage your cart items and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable cart body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">
                Your cart is empty
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                Browse the menu and add meals for next week.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setOpen(false)}
                asChild
              >
                <Link href="/menu">View menu</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Guest details section */}
              {!session?.user && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-medium text-foreground">
                    Your details
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={deliveryMethod === "DELIVERY" ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs h-7"
                      onClick={() => setGuestDeliveryMethod("DELIVERY")}
                    >
                      Delivery
                    </Button>
                    <Button
                      type="button"
                      variant={deliveryMethod === "PICKUP" ? "default" : "outline"}
                      size="sm"
                      className="rounded-full text-xs h-7"
                      onClick={() => setGuestDeliveryMethod("PICKUP")}
                    >
                      Pickup
                    </Button>
                  </div>
                  {deliveryMethod === "PICKUP" && (
                    <p className="text-xs text-muted-foreground">
                      Pickup at Xtreme Couture.
                    </p>
                  )}
                  <div className="grid gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="sheet-guest-name" className="text-xs">
                        Full name
                      </Label>
                      <Input
                        id="sheet-guest-name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        autoComplete="name"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sheet-guest-email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="sheet-guest-email"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        autoComplete="email"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-xs w-full"
                    disabled={saveProfileLoading}
                    onClick={() => void saveGuestProfile()}
                  >
                    {saveProfileLoading ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save details"
                    )}
                  </Button>
                </div>
              )}

              {/* Cart items */}
              <ul className="space-y-3">
                {cart!.items.map((line) => {
                  const q = qtyDraft[line.id] ?? line.quantity;
                  const detailLines = getCartLineSummaryLines(line);
                  const busy = syncingItemId === line.id;

                  return (
                    <li
                      key={line.id}
                      className="flex gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {line.meal.imageUrl ? (
                          <Image
                            src={line.meal.imageUrl}
                            alt={line.meal.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {line.meal.name}
                          </p>
                          <p className="text-sm font-semibold text-foreground shrink-0">
                            ${(line.unitPrice * q).toFixed(2)}
                          </p>
                        </div>
                        {detailLines.length > 0 && (
                          <ul className="mt-0.5 space-y-0.5">
                            {detailLines.map((text, idx) => (
                              <li
                                key={`${line.id}-d-${idx}`}
                                className="text-[11px] text-muted-foreground leading-tight"
                              >
                                {text}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${line.unitPrice.toFixed(2)} each
                        </p>
                        {/* Quantity and Actions controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={busy}
                              onClick={() =>
                                scheduleQuantityChange(line, Math.max(0, q - 1))
                              }
                              aria-label="Decrease quantity"
                            >
                              {q <= 1 ? (
                                <Trash2 className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                            </Button>
                            <span
                              className="w-6 text-center text-xs font-medium"
                              aria-busy={busy}
                            >
                              {q}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              disabled={busy}
                              onClick={() => scheduleQuantityChange(line, q + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setOpen(false)}
                            asChild
                          >
                            <Link href={`/order/${line.meal.slug}?edit=${line.id}`}>
                              <Pencil className="h-3 w-3 mr-1.5" />
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer — always visible when cart has items */}
        {!isEmpty && !loading && (
          <SheetFooter className="border-t border-border pt-4 flex-col gap-3">
            {/* Fulfillment for logged-in users */}
            {session?.user && (
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant={deliveryMethod === "DELIVERY" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs flex-1"
                  onClick={() => setDeliveryMethod("DELIVERY")}
                >
                  Delivery
                </Button>
                <Button
                  type="button"
                  variant={deliveryMethod === "PICKUP" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full text-xs flex-1"
                  onClick={() => setDeliveryMethod("PICKUP")}
                >
                  Pickup
                </Button>
              </div>
            )}
            {deliveryMethod === "PICKUP" && session?.user && (
              <p className="text-xs text-muted-foreground w-full">
                Pickup at Xtreme Couture.
              </p>
            )}

            <div className="flex justify-between w-full text-sm font-bold text-foreground border-t border-border pt-3">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground w-full">
              Taxes and fees are finalized at payment.
            </p>
            <Button
              type="button"
              className="w-full rounded-full"
              disabled={checkoutLoading || syncingItemId !== null}
              onClick={() => void handleCheckout()}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Proceed to checkout"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setOpen(false)}
              asChild
            >
              <Link href="/menu">Continue shopping</Link>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
