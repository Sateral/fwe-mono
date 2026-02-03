"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Container from "@/components/container";
import NutritionBreakdown from "./nutrition-breakdown";
import OrderBuilder from "./order-builder";
import OrderSummary from "./order-summary";
import { calculateMealUnitPrice } from "@/lib/price-utils";
import type { Meal } from "@/types";

interface OrderPageClientProps {
  meal: Meal;
}

const OrderPageClient = ({ meal }: OrderPageClientProps) => {
  const router = useRouter();
  const [quantity, setQuantity] = useState(4);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">(
    "DELIVERY"
  );
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >({});
  const [notes, setNotes] = useState("");
  const [proteinBoost, setProteinBoost] = useState(false);

  // Initialize substitutions with default options
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<
    Record<string, string>
  >(() => {
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
  });

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

  // Calculate price per meal using shared utility
  const calculatePricePerMeal = () => {
    return calculateMealUnitPrice(
      meal,
      selectedModifiers,
      selectedSubstitutions,
      proteinBoost
    );
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);

    try {
      const unitPrice = calculatePricePerMeal();

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
        }
      );

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mealId: meal.id,
          quantity,
          unitPrice,
          substitutions,
          proteinBoost,
          deliveryMethod,
          pickupLocation:
            deliveryMethod === "PICKUP" ? "Xtreme Couture" : undefined,
          notes: notes || undefined,
          modifiers: Object.entries(selectedModifiers).map(
            ([groupId, optionIds]) => {
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
            }
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        router.push(data.url);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setIsCheckingOut(false);
      // TODO: Show error toast
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
              proteinBoost={proteinBoost}
              onProteinBoostChange={setProteinBoost}
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              notes={notes}
              onNotesChange={setNotes}
            />

            <OrderSummary
              meal={meal}
              quantity={quantity}
              selectedModifiers={selectedModifiers}
              selectedSubstitutions={selectedSubstitutions}
              proteinBoost={proteinBoost}
              deliveryMethod={deliveryMethod}
              pickupLocation={
                deliveryMethod === "PICKUP" ? "Xtreme Couture" : undefined
              }
              onCheckout={handleCheckout}
              onSaveForLater={() => console.log("Save for later", meal.id)}
              isCheckingOut={isCheckingOut}
            />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default OrderPageClient;
