import { describe, expect, it } from "vitest";

import { cartLineFingerprint } from "../cart-line-fingerprint";

describe("cartLineFingerprint", () => {
  it("matches when substitution and modifier order differs", () => {
    const a = cartLineFingerprint({
      mealId: "m1",
      notes: "",
      substitutions: [
        { groupId: "b", optionId: "2" },
        { groupId: "a", optionId: "1" },
      ],
      modifiers: [
        { groupId: "z", optionId: "c" },
        { groupId: "z", optionId: "a" },
        { groupId: "y", optionId: "x" },
      ],
    });
    const b = cartLineFingerprint({
      mealId: "m1",
      notes: "",
      substitutions: [
        { groupId: "a", optionId: "1" },
        { groupId: "b", optionId: "2" },
      ],
      modifiers: [
        { groupId: "y", optionId: "x" },
        { groupId: "z", optionId: "a" },
        { groupId: "z", optionId: "c" },
      ],
    });
    expect(a).toBe(b);
  });

  it("differs when optionId differs", () => {
    const a = cartLineFingerprint({
      mealId: "m1",
      notes: null,
      substitutions: [],
      modifiers: [
        { groupId: "g", optionId: "1" },
        { groupId: "g", optionId: "2" },
      ],
    });
    const b = cartLineFingerprint({
      mealId: "m1",
      notes: null,
      substitutions: [],
      modifiers: [{ groupId: "g", optionId: "1" }],
    });
    expect(a).not.toBe(b);
  });

  it("trims notes", () => {
    const a = cartLineFingerprint({
      mealId: "m1",
      notes: "  hi  ",
      substitutions: [],
      modifiers: [],
    });
    const b = cartLineFingerprint({
      mealId: "m1",
      notes: "hi",
      substitutions: [],
      modifiers: [],
    });
    expect(a).toBe(b);
  });
});
