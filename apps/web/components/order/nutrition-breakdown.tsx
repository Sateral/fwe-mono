"use client";

import { Dumbbell, Wheat, Droplets } from "lucide-react";
import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Meal } from "@/types";

interface NutritionBreakdownProps {
  meal: Meal;
  selectedSubstitutions: Record<string, string>;
}

const NutritionBreakdown = ({
  meal,
  selectedSubstitutions,
}: NutritionBreakdownProps) => {
  // Calculate base macros from meal
  let protein = meal.protein;
  let carbs = meal.carbs;
  let fat = meal.fat;
  let calories = meal.calories;

  // Apply substitution adjustments
  Object.entries(selectedSubstitutions).forEach(([groupId, optionId]) => {
    const group = meal.substitutionGroups.find((g) => g.id === groupId);
    if (!group) return;
    const option = group.options.find((o) => o.id === optionId);
    if (option) {
      protein += option.proteinAdjust;
      carbs += option.carbsAdjust;
      fat += option.fatAdjust;
      calories += option.calorieAdjust;
    }
  });

  // Chart configuration
  const chartConfig = {
    protein: {
      label: "Protein",
      color: "#3b82f6",
    },
    carbs: {
      label: "Carbs",
      color: "#f59e0b",
    },
    fat: {
      label: "Fat",
      color: "#f97316",
    },
  } satisfies ChartConfig;

  // Calculate max value for scaling the radial chart
  const maxValue = Math.max(protein, carbs, fat, 1);

  // Chart data - each macro as a percentage of the max
  const chartData = [
    {
      name: "Protein",
      value: (protein / maxValue) * 100,
      actualValue: protein,
      fill: chartConfig.protein.color,
    },
    {
      name: "Carbs",
      value: (carbs / maxValue) * 100,
      actualValue: carbs,
      fill: chartConfig.carbs.color,
    },
    {
      name: "Fat",
      value: (fat / maxValue) * 100,
      actualValue: fat,
      fill: chartConfig.fat.color,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Macro Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <span>Protein</span>
          </div>
          <div className="flex items-center gap-2 text-black font-semibold">
            <Dumbbell className="w-4 h-4 text-blue-400" />
            <span>{protein}g</span>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <span>Carbs</span>
          </div>
          <div className="flex items-center gap-2 text-black font-semibold">
            <Wheat className="w-4 h-4 text-amber-400" />
            <span>{carbs}g</span>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <span>Fat</span>
          </div>
          <div className="flex items-center gap-2 text-black font-semibold">
            <Droplets className="w-4 h-4 text-orange-400" />
            <span>{fat}g</span>
          </div>
        </div>
      </div>

      {/* Nutrition Chart Section */}
      <div className="border bg-white rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-black font-semibold mb-1">
              Nutrition breakdown
            </h3>
            <p className="text-gray-400 text-sm">
              Approx. {calories} kcal per meal
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-400">Protein</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-400">Carbs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-xs text-gray-400">Fat</span>
            </div>
          </div>
        </div>

        <div className="flex gap-8 items-center">
          {/* Radial Chart */}
          <ChartContainer
            config={chartConfig}
            className="w-40 h-40 shrink-0 aspect-square"
          >
            <RadialBarChart
              data={chartData}
              innerRadius={20}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar dataKey="value" background cornerRadius={4} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name, props) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5"
                          style={{ backgroundColor: props.payload.fill }}
                        />
                        <span className="text-muted-foreground">
                          {props.payload.name}
                        </span>
                        <span className="font-medium">
                          {props.payload.actualValue}g
                        </span>
                      </div>
                    )}
                  />
                }
              />
            </RadialBarChart>
          </ChartContainer>

          {/* Info Card */}
          <div className="flex flex-col gap-3 flex-1">
            <div className="bg-gray-100 border rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-0.5">Price</p>
              <p className="text-black font-medium text-lg">
                ${meal.price.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionBreakdown;
