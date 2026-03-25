import { describe, expect, it } from "vitest";

import { cartLineFingerprint } from "../cart-line-fingerprint";

describe("cartLineFingerprint", () => {
  it("matches when substitution and modifier order differs", () => {
    const a = cartLineFingerprint({
      mealId: "m1",
      proteinBoost: false,
      notes: "",
      substitutions: [
        { groupId: "b", optionId: "2" },
        { groupId: "a", optionId: "1" },
      ],
      modifiers: [
        { groupId: "z", optionIds: ["c", "a"] },
        { groupId: "y", optionIds: ["x"] },
      ],
    });
    const b = cartLineFingerprint({
      mealId: "m1",
      proteinBoost: false,
      notes: "",
      substitutions: [
        { groupId: "a", optionId: "1" },
        { groupId: "b", optionId: "2" },
      ],
      modifiers: [
        { groupId: "y", optionIds: ["x"] },
        { groupId: "z", optionIds: ["a", "c"] },
      ],
    });
    expect(a).toBe(b);
  });

  it("differs when optionIds differ", () => {
    const a = cartLineFingerprint({
      mealId: "m1",
      proteinBoost: false,
      notes: null,
      substitutions: [],
      modifiers: [{ groupId: "g", optionIds: ["1", "2"] }],
    });
    const b = cartLineFingerprint({
      mealId: "m1",
      proteinBoost: false,
      notes: null,
      substitutions: [],
      modifiers: [{ groupId: "g", optionIds: ["1"] }],
    });
    expect(a).not.toBe(b);
  });

  it("trims notes", () => {
    const a = cartLineFingerprint({
      mealId: "m1",
      proteinBoost: true,
      notes: "  hi  ",
      substitutions: [],
      modifiers: [],
    });
    const b = cartLineFingerprint({
      mealId: "m1",
      proteinBoost: true,
      notes: "hi",
      substitutions: [],
      modifiers: [],
    });
    expect(a).toBe(b);
  });
});
