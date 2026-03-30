"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ApiCart } from "@fwe/types";
import type { CreateCartInput } from "@fwe/validators";

import { useSetCartNavCount } from "@/components/cart-count-provider";
import Container from "@/components/container";
import { Badge } from "@/components/ui/badge";
import type { GuestFulfillmentPreference } from "@/lib/cart-cookies";
import { countCartItemQuantity } from "@/lib/cart-item-count";
import type { Meal } from "@/types";
import { toast } from "sonner";
import NutritionBreakdown from "./nutrition-breakdown";
import OrderBuilder from "./order-builder";
import OrderSummary from "./order-summary";

export type OrderBuilderInitialFromCart = {
  quantity: number;
  selectedSubstitutions: Record<string, string>;
  selectedModifiers: Record<string, string[]>;
  notes: string;
};

function defaultModifiersFromMeal(meal: Meal): Record<string, string[]> {
  const initial: Record<string, string[]> = {};
  for (const group of meal.modifierGroups) {
    if (
      group.type === "SINGLE_SELECT" &&
      group.minSelection > 0 &&
      group.options.length > 0
    ) {
      const first = group.options[0];
      if (first) {
        initial[group.id] = [first.id];
      }
    }
  }
  return initial;
}

function defaultSubstitutionsFromMeal(meal: Meal): Record<string, string> {
  const defaults: Record<string, string> = {};
  meal.substitutionGroups.forEach((group) => {
    const defaultOption = group.options.find((o) => o.isDefault);
    if (defaultOption) {
      defaults[group.id] = defaultOption.id;
    } else if (group.options.length > 0) {
      const firstOption = group.options[0];
      if (firstOption) {
        defaults[group.id] = firstOption.id;
      }
    }
  });
  return defaults;
}

interface OrderPageClientProps {
  meal: Meal;
  initialCustomer?: {
    email: string;
    name: string;
  } | null;
  /** Delivery vs pickup shown in summary; chosen on the cart for guests. */
  initialFulfillment?: GuestFulfillmentPreference | null;
  /** When set, load this cart line into the builder and update it on submit. */
  editCartItemId?: string | null;
  /** Hydrated builder state from server when `editCartItemId` is set. */
  initialEditBuilder?: OrderBuilderInitialFromCart | null;
}

const OrderPageClient = ({
  meal,
  initialCustomer = null,
  initialFulfillment = null,
  editCartItemId = null,
  initialEditBuilder = null,
}: OrderPageClientProps) => {
  const router = useRouter();
  const setCartNavCount = useSetCartNavCount();
  const isAuthenticated = Boolean(initialCustomer?.email);
  const [quantity, setQuantity] = useState(
    () => initialEditBuilder?.quantity ?? 4,
  );
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >(
    () =>
      initialEditBuilder?.selectedModifiers ?? defaultModifiersFromMeal(meal),
  );
  const [notes, setNotes] = useState(() => initialEditBuilder?.notes ?? "");

  const { deliveryMethod, pickupLocation } = useMemo(() => {
    const method = initialFulfillment?.deliveryMethod ?? "DELIVERY";
    return {
      deliveryMethod: method,
      pickupLocation:
        method === "PICKUP"
          ? (initialFulfillment?.pickupLocation ?? "Xtreme Couture")
          : undefined,
    };
  }, [initialFulfillment]);

  const [selectedSubstitutions, setSelectedSubstitutions] = useState<
    Record<string, string>
  >(
    () =>
      initialEditBuilder?.selectedSubstitutions ??
      defaultSubstitutionsFromMeal(meal),
  );

  const handleModifierChange = (groupId: string, optionIds: string[]) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [groupId]: optionIds,
    }));
  };

  const handleSubstitutionChange = (groupId: string, optionId: string) => {
    setSelectedSubstitutions((prev) => ({
      ...prev,
      [groupId]: optionId,
    }));
  };

  const handleAddToCart = async () => {
    setIsAddingToCart(true);

    try {
      // Build substitutions with human-readable names
      const substitutions = Object.entries(selectedSubstitutions).map(
        ([groupId, optionId]) => {
          const group = meal.substitutionGroups.find((g) => g.id === groupId);
          const option = group?.options.find((o) => o.id === optionId);
          return {
            groupId,
            groupName: group?.name || "",
            optionId,
            optionName: option?.name || "",
          };
        },
      );

      const modifiers = Object.entries(selectedModifiers)
        .filter(([, optionIds]) => optionIds.length > 0)
        .map(([groupId, optionIds]) => {
          const group = meal.modifierGroups.find((g) => g.id === groupId);
          const optionNames = optionIds
            .map((id) => group?.options.find((o) => o.id === id)?.name)
            .filter(Boolean) as string[];
          return {
            groupId,
            groupName: group?.name || "",
            optionIds,
            optionNames,
          };
        });

      if (editCartItemId) {
        const response = await fetch(`/api/cart/items/${editCartItemId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mealId: meal.id,
            quantity,
            substitutions,
            notes: notes || undefined,
            modifiers,
          }),
        });

        const payload = (await response.json()) as
          | ApiCart
          | { error?: string; code?: string };

        if (!response.ok) {
          const err = payload as { error?: string; code?: string };
          if (err.code === "GUEST_PROFILE_REQUIRED") {
            toast.error(
              "Save your name and email on the cart page before editing items.",
            );
            router.push("/cart");
            return;
          }
          throw new Error(err.error || "Failed to update cart line");
        }

        setCartNavCount(countCartItemQuantity(payload as ApiCart));

        toast.success("Cart updated");
        router.push("/cart");
        return;
      }

      const items: CreateCartInput["items"] = [
        {
          mealId: meal.id,
          quantity,
          substitutions,
          notes: notes || undefined,
          modifiers,
        },
      ];

      const response = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
        }),
      });

      const payload = (await response.json()) as
        | ApiCart
        | { error?: string; code?: string };

      if (!response.ok) {
        const err = payload as { error?: string; code?: string };
        if (err.code === "GUEST_PROFILE_REQUIRED") {
          toast.error(
            "Save your name and email on the cart page before adding items from the menu.",
          );
          router.push("/cart");
          return;
        }
        throw new Error(err.error || "Failed to add to cart");
      }

      setCartNavCount(countCartItemQuantity(payload as ApiCart));

      toast.success("Added to cart");
      router.push("/cart");
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not add to cart. Please try again.",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="bg-background min-h-screen pt-24 pb-12">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Meal Details */}
          <div className="space-y-6">
            {/* Meal Image */}
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-gray-800">
              {/* Tags overlay */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                {meal.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag.id}
                    className="px-3 py-1 rounded-full text-xs font-medium border-0 bg-white/90 text-gray-800"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>

              {meal.imageUrl ? (
                <Image
                  src={meal.imageUrl}
                  alt={meal.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-white border">
                  <svg
                    className="w-24 h-24 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Meal Info */}
            <div>
              {editCartItemId ? (
                <p className="text-sm font-medium text-primary mb-2">
                  Editing cart line
                </p>
              ) : null}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {meal.name}
              </h1>
              <p className="text-gray-600 leading-relaxed">
                {meal.description ||
                  "Juicy citrus-herb chicken over quinoa, roasted veggies, and a zingy chimichurri. Built for clean energy and recovery."}
              </p>
            </div>

            {/* Nutrition Breakdown */}
            <NutritionBreakdown
              meal={meal}
              selectedSubstitutions={selectedSubstitutions}
            />
          </div>

          {/* Right Column - Order Builder */}
          <div className="space-y-6">
            <OrderBuilder
              meal={meal}
              quantity={quantity}
              onQuantityChange={setQuantity}
              selectedModifiers={selectedModifiers}
              onModifierChange={handleModifierChange}
              selectedSubstitutions={selectedSubstitutions}
              onSubstitutionChange={handleSubstitutionChange}
              notes={notes}
              onNotesChange={setNotes}
            />

            {!isAuthenticated ? (
              <p className="text-sm text-gray-600 rounded-2xl border border-gray-200 bg-white p-4">
                Name, email, and delivery or pickup are set on your{" "}
                <button
                  type="button"
                  className="text-primary font-medium underline underline-offset-2"
                  onClick={() => router.push("/cart")}
                >
                  cart
                </button>
                . Save your details there once before adding meals from the
                menu.
              </p>
            ) : null}

            <OrderSummary
              meal={meal}
              quantity={quantity}
              selectedModifiers={selectedModifiers}
              selectedSubstitutions={selectedSubstitutions}
              deliveryMethod={deliveryMethod}
              pickupLocation={pickupLocation}
              onCheckout={handleAddToCart}
              onSaveForLater={() =>
                editCartItemId
                  ? router.push("/cart")
                  : router.push("/menu")
              }
              isCheckingOut={isAddingToCart}
              checkoutLabel={
                editCartItemId ? "Save to cart" : "Add to cart"
              }
              primaryActionIcon="cart"
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default OrderPageClient;
