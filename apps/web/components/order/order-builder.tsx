"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Minus,
  Plus,
  Dumbbell,
  ChevronDown,
  Sparkles,
  Droplet,
  Cookie,
  Apple,
  MapPin,
  Store,
} from "lucide-react";
import type { Meal, SubstitutionGroup, ModifierOption } from "@/types";

interface OrderBuilderProps {
  meal: Meal;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  selectedModifiers: Record<string, string[]>;
  onModifierChange: (groupId: string, optionIds: string[]) => void;
  selectedSubstitutions: Record<string, string>;
  onSubstitutionChange: (groupId: string, optionId: string) => void;
  proteinBoost: boolean;
  onProteinBoostChange: (value: boolean) => void;
  deliveryMethod: "DELIVERY" | "PICKUP";
  onDeliveryMethodChange: (method: "DELIVERY" | "PICKUP") => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

const OrderBuilder = ({
  meal,
  quantity,
  onQuantityChange,
  selectedModifiers,
  onModifierChange,
  selectedSubstitutions,
  onSubstitutionChange,
  proteinBoost,
  onProteinBoostChange,
  deliveryMethod,
  onDeliveryMethodChange,
  notes,
  onNotesChange,
}: OrderBuilderProps) => {
  // Get multi-select modifier groups for add-ons
  const multiSelectGroups = meal.modifierGroups.filter(
    (g) => g.type === "MULTI_SELECT"
  );

  const handleMultiSelect = (groupId: string, optionId: string) => {
    const current = selectedModifiers[groupId] || [];
    if (current.includes(optionId)) {
      onModifierChange(
        groupId,
        current.filter((id) => id !== optionId)
      );
    } else {
      onModifierChange(groupId, [...current, optionId]);
    }
  };

  const getAddOnIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("sauce")) return Droplet;
    if (lowerName.includes("drink") || lowerName.includes("sparkling"))
      return Sparkles;
    if (lowerName.includes("dessert") || lowerName.includes("cookie"))
      return Cookie;
    if (lowerName.includes("snack") || lowerName.includes("fruit"))
      return Apple;
    return Sparkles;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 h-fit">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Build your plan</h2>

      {/* Quantity Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of meals
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-lg"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="flex-1 h-10 flex items-center justify-center border border-gray-200 rounded-lg text-center font-medium">
            {quantity}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-lg"
            onClick={() => onQuantityChange(quantity + 1)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Protein Boost Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Protein boost
        </label>
        <div
          className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-colors ${
            proteinBoost
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-200 bg-white"
          }`}
          onClick={() => onProteinBoostChange(!proteinBoost)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">+30% protein</p>
              <p className="text-sm text-gray-500">Adds $2.00 per meal</p>
            </div>
          </div>
          <div
            className={`w-12 h-6 rounded-full p-1 transition-colors ${
              proteinBoost ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                proteinBoost ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Substitutions (from SubstitutionGroups) */}
      {meal.substitutionGroups.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Substitutions
          </label>
          <div className="space-y-3">
            {meal.substitutionGroups.map((group) => (
              <SubstitutionSelect
                key={group.id}
                group={group}
                selectedOptionId={selectedSubstitutions[group.id]}
                onChange={(optionId) =>
                  onSubstitutionChange(group.id, optionId)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Multi Select Modifier Groups (Add-ons) */}
      {multiSelectGroups.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add-ons (per meal)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {multiSelectGroups.flatMap((group) =>
              group.options.map((option) => {
                const Icon = getAddOnIcon(option.name);
                const isSelected = selectedModifiers[group.id]?.includes(
                  option.id
                );
                return (
                  <div
                    key={option.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() => handleMultiSelect(group.id, option.id)}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {option.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${option.extraPrice.toFixed(2)}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Delivery method */}
      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery method
        </label>
        <div className="space-y-3">
          <button
            type="button"
            className={`w-full flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
              deliveryMethod === "DELIVERY"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onClick={() => onDeliveryMethodChange("DELIVERY")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Delivery</p>
                <p className="text-sm text-gray-500">
                  Delivered to your saved address
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {deliveryMethod === "DELIVERY" ? "Selected" : ""}
            </span>
          </button>
          <button
            type="button"
            className={`w-full flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${
              deliveryMethod === "PICKUP"
                ? "border-emerald-500 bg-emerald-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
            onClick={() => onDeliveryMethodChange("PICKUP")}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Pickup at Xtreme Couture
                </p>
                <p className="text-sm text-gray-500">
                  Skip delivery details, pick up at the gym
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {deliveryMethod === "PICKUP" ? "Selected" : ""}
            </span>
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Any special requests or dietary notes..."
          className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />
      </div>
    </div>
  );
};

// Substitution Select Component
interface SubstitutionSelectProps {
  group: SubstitutionGroup;
  selectedOptionId?: string;
  onChange: (optionId: string) => void;
}

const SubstitutionSelect = ({
  group,
  selectedOptionId,
  onChange,
}: SubstitutionSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = group.options.find((o) => o.id === selectedOptionId);

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500">✓</span>
          <span className="text-sm">
            <span className="text-gray-500">{group.name}:</span>{" "}
            <span className="font-medium text-gray-900">
              {selectedOption?.name || "Select..."}
            </span>
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {group.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${
                  option.id === selectedOptionId
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-900"
                }`}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
              >
                {option.name}
                {option.priceAdjustment > 0 && (
                  <span className="text-gray-500 ml-2">
                    (+${option.priceAdjustment.toFixed(2)})
                  </span>
                )}
                {option.priceAdjustment < 0 && (
                  <span className="text-green-600 ml-2">
                    (-${Math.abs(option.priceAdjustment).toFixed(2)})
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OrderBuilder;
