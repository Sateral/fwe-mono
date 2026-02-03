"use client";

import { Button } from "@/components/ui/button";
import { Bookmark, CreditCard, Loader2 } from "lucide-react";
import type { Meal } from "@/types";

interface OrderSummaryProps {
  meal: Meal;
  quantity: number;
  selectedModifiers: Record<string, string[]>;
  selectedSubstitutions: Record<string, string>;
  proteinBoost?: boolean;
  deliveryMethod: "DELIVERY" | "PICKUP";
  pickupLocation?: string;
  onCheckout: () => void;
  onSaveForLater: () => void;
  isCheckingOut?: boolean;
}

const OrderSummary = ({
  meal,
  quantity,
  selectedModifiers,
  selectedSubstitutions,
  proteinBoost = false,
  deliveryMethod,
  pickupLocation,
  onCheckout,
  onSaveForLater,
  isCheckingOut = false,
}: OrderSummaryProps) => {
  // Calculate base price from meal
  const basePrice = meal.price;
  const proteinBoostPrice = proteinBoost ? 2.0 : 0;

  // Calculate substitution adjustments
  const substitutionAdjustment = Object.entries(selectedSubstitutions).reduce(
    (total, [groupId, optionId]) => {
      const group = meal.substitutionGroups.find((g) => g.id === groupId);
      if (!group) return total;
      const option = group.options.find((o) => o.id === optionId);
      return total + (option?.priceAdjustment || 0);
    },
    0
  );

  // Calculate add-ons total per meal (from multi-select modifiers)
  const addOnsTotal = Object.entries(selectedModifiers).reduce(
    (total, [groupId, optionIds]) => {
      const group = meal.modifierGroups.find((g) => g.id === groupId);
      if (!group) return total;

      return (
        total +
        optionIds.reduce((optionTotal, optionId) => {
          const option = group.options.find((o) => o.id === optionId);
          return optionTotal + (option?.extraPrice || 0);
        }, 0)
      );
    },
    0
  );

  const pricePerMeal =
    basePrice + proteinBoostPrice + substitutionAdjustment + addOnsTotal;
  const totalPrice = pricePerMeal * quantity;

  // Get selected substitutions for display
  const substitutions = Object.entries(selectedSubstitutions)
    .map(([groupId, optionId]) => {
      const group = meal.substitutionGroups.find((g) => g.id === groupId);
      if (!group) return null;
      const option = group.options.find((o) => o.id === optionId);
      return option?.name;
    })
    .filter(Boolean);

  // Get selected add-ons for display
  const addOns = Object.entries(selectedModifiers)
    .flatMap(([groupId, optionIds]) => {
      const group = meal.modifierGroups.find((g) => g.id === groupId);
      if (!group || group.type !== "MULTI_SELECT") return [];
      return optionIds
        .map((optionId) => {
          const option = group.options.find((o) => o.id === optionId);
          return option?.name;
        })
        .filter(Boolean);
    })
    .filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Order summary</h3>
        <div className="text-right">
          <p className="text-xs text-gray-500">Per meal</p>
          <p className="text-lg font-bold text-gray-900">
            ${pricePerMeal.toFixed(2)}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Taxes and <span className="text-primary font-medium">delivery</span>{" "}
        calculated at checkout.
      </p>

      {/* Summary Details */}
      <div className="space-y-3 py-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Meals</span>
          <span className="font-medium text-gray-900">{quantity}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Protein boost</span>
          <span className="font-medium text-gray-900">
            {proteinBoost ? "+30%" : "Off"}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery</span>
          <span className="font-medium text-gray-900 text-right max-w-[60%]">
            {deliveryMethod === "PICKUP"
              ? `Pickup at ${pickupLocation || "Xtreme Couture"}`
              : "Delivery"}
          </span>
        </div>

        {substitutions.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Substitutions</span>
            <span className="font-medium text-gray-900 text-right max-w-[60%]">
              {substitutions.join(", ")}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Add-ons</span>
          <span className="font-medium text-gray-900">
            {addOns.length > 0 ? addOns.join(", ") : "None"}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="py-4 border-t border-gray-100">
        <div className="flex justify-between items-end">
          <span className="text-gray-900 font-medium">Total</span>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${totalPrice.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">{quantity} meals total</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <Button
          variant="outline"
          className="flex-1 py-6 rounded-full border-gray-300"
          onClick={onSaveForLater}
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save for later
        </Button>
        <Button
          className="flex-1 py-6 rounded-full bg-primary hover:bg-primary/90"
          onClick={onCheckout}
          disabled={isCheckingOut}
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Place Order
            </>
          )}
        </Button>
      </div>

      {/* Legal Text */}
      <p className="text-xs text-gray-400 text-center mt-4">
        By continuing, you agree to our{" "}
        <span className="text-gray-600 underline">Terms</span> and acknowledge
        our <span className="text-gray-600 underline">Privacy Policy</span>.
      </p>
    </div>
  );
};

export default OrderSummary;
