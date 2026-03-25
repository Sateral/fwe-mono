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
import Container from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GuestFulfillmentPreference } from "@/lib/cart-cookies";
import { getCartLineSummaryLines } from "@/lib/cart-line-summary";
import { countCartItemQuantity } from "@/lib/cart-item-count";
import { useSession } from "@/lib/auth-client";
import { Loader2, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const QTY_DEBOUNCE_MS = 400;
const FULFILLMENT_DEBOUNCE_MS = 400;

export default function CartPageClient({
  initialCart,
  initialGuestProfile,
  initialFulfillment,
}: {
  initialCart: ApiCart | null;
  initialGuestProfile: GuestCheckoutIdentity | null;
  initialFulfillment: GuestFulfillmentPreference | null;
}) {
  const { data: session, isPending: sessionPending } = useSession();
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

  /** Optimistic quantity overrides until the server confirms. */
  const [qtyDraft, setQtyDraft] = useState<Record<string, number>>({});
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);

  const qtyTargetRef = useRef<Record<string, number>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const fulfillmentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
            pickupLocation:
              method === "PICKUP" ? "Xtreme Couture" : undefined,
          }),
        }).catch(() => {
          /* non-blocking */
        });
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
    if (!cart) {
      return 0;
    }
    return cart.items.reduce(
      (s, i) => s + (qtyDraft[i.id] ?? i.quantity),
      0,
    );
  }, [cart, qtyDraft]);

  const subtotal = useMemo(() => {
    if (!cart) {
      return 0;
    }
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
        if (!res.ok) {
          throw new Error(data.error || "Update failed");
        }
        const next = data as ApiCart;
        setCart(next);
        setCartNavCount(countCartItemQuantity(next));
        setQtyDraft((d) => {
          const next = { ...d };
          delete next[itemId];
          return next;
        });
        delete qtyTargetRef.current[itemId];
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update cart");
        setQtyDraft((d) => {
          const next = { ...d };
          delete next[itemId];
          return next;
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
      if (nextQty < 0) {
        return;
      }

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
        if (q !== undefined) {
          void flushQuantity(itemId, q);
        }
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
          pickupLocation:
            deliveryMethod === "PICKUP" ? "Xtreme Couture" : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not save");
      }
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
    const email =
      session?.user?.email?.trim() || guestEmail.trim();
    const name =
      (session?.user?.name?.trim() || guestName.trim()) || undefined;

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
          pickupLocation:
            deliveryMethod === "PICKUP" ? "Xtreme Couture" : undefined,
          guest:
            session?.user || !guestEmail.trim()
              ? undefined
              : {
                  name: guestName.trim(),
                  email: guestEmail.trim(),
                },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }
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

  const guestDetailsCard = !session?.user ? (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900">Your details</h2>
        <p className="text-sm text-gray-600 mt-1">
          Enter once here. You can add meals from the menu without typing this
          again.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={deliveryMethod === "DELIVERY" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setGuestDeliveryMethod("DELIVERY")}
        >
          Delivery
        </Button>
        <Button
          type="button"
          variant={deliveryMethod === "PICKUP" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setGuestDeliveryMethod("PICKUP")}
        >
          Pickup
        </Button>
      </div>
      {deliveryMethod === "PICKUP" ? (
        <p className="text-sm text-gray-600">Pickup at Xtreme Couture.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cart-guest-name">Full name</Label>
          <Input
            id="cart-guest-name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cart-guest-email">Email</Label>
          <Input
            id="cart-guest-email"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="rounded-full"
        disabled={saveProfileLoading}
        onClick={() => void saveGuestProfile()}
      >
        {saveProfileLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save details"
        )}
      </Button>
    </div>
  ) : null;

  if (sessionPending || loading) {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-background min-h-screen pt-24 pb-16">
        <Container>
          <div className="max-w-lg mx-auto space-y-8">
            {guestDetailsCard}

            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Your cart is empty
              </h1>
              <p className="text-gray-600">
                Browse the menu and add meals for next week&apos;s delivery.
              </p>
              <Button asChild className="rounded-full">
                <Link href="/menu">View menu</Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pt-24 pb-16">
      <Container>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Cart</h1>
            <p className="text-sm text-gray-600">
              {itemCount} meal{itemCount === 1 ? "" : "s"}
            </p>
          </div>

          {guestDetailsCard}

          <ul className="space-y-4">
            {cart.items.map((line) => {
              const q = qtyDraft[line.id] ?? line.quantity;
              const detailLines = getCartLineSummaryLines(line);
              const busy = syncingItemId === line.id;

              return (
                <li
                  key={line.id}
                  className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {line.meal.imageUrl ? (
                      <Image
                        src={line.meal.imageUrl}
                        alt={line.meal.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/order/${line.meal.slug}`}
                          className="font-semibold text-gray-900 hover:underline"
                        >
                          {line.meal.name}
                        </Link>
                        {detailLines.length > 0 ? (
                          <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                            {detailLines.map((text, idx) => (
                              <li key={`${line.id}-d-${idx}`} className="leading-snug">
                                {text}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="mt-1 text-sm text-gray-500">
                          ${line.unitPrice.toFixed(2)} each
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 shrink-0">
                        ${(line.unitPrice * q).toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={busy}
                        onClick={() =>
                          scheduleQuantityChange(line, Math.max(0, q - 1))
                        }
                        aria-label="Decrease quantity"
                      >
                        {q <= 1 ? (
                          <Trash2 className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                      </Button>
                      <span
                        className="w-8 text-center text-sm font-medium"
                        aria-busy={busy}
                      >
                        {q}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={busy}
                        onClick={() => scheduleQuantityChange(line, q + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-gray-600"
                        asChild
                      >
                        <Link
                          href={`/order/${line.meal.slug}?edit=${line.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            {session?.user ? (
              <>
                <h2 className="font-semibold text-gray-900">Fulfillment</h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={deliveryMethod === "DELIVERY" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setDeliveryMethod("DELIVERY")}
                  >
                    Delivery
                  </Button>
                  <Button
                    type="button"
                    variant={deliveryMethod === "PICKUP" ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setDeliveryMethod("PICKUP")}
                  >
                    Pickup
                  </Button>
                </div>
                {deliveryMethod === "PICKUP" ? (
                  <p className="text-sm text-gray-600">Pickup at Xtreme Couture.</p>
                ) : null}
              </>
            ) : null}

            <div className="flex justify-between border-t border-gray-100 pt-4 text-lg font-bold text-gray-900">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500">
              Taxes and fees are finalized at payment.
            </p>

            <Button
              type="button"
              className="w-full rounded-full py-6"
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

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/menu">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
