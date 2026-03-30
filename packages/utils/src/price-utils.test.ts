import { describe, expect, it } from "vitest";

import { calculateMealUnitPrice } from "./price-utils";

describe("calculateMealUnitPrice", () => {
  it("adds substitutions and modifiers", () => {
    expect(
      calculateMealUnitPrice(
        {
          price: 14,
          modifierGroups: [
            { id: "mods", options: [{ id: "avocado", extraPrice: 2 }] },
          ],
          substitutionGroups: [
            {
              id: "subs",
              options: [{ id: "quinoa", priceAdjustment: 1.5 }],
            },
          ],
        },
        { mods: ["avocado"] },
        { subs: "quinoa" },
      ),
    ).toBe(17.5);
  });
});
