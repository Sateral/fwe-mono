import { describe, expect, it } from "vitest";

import { addMoney, toMinorUnits } from "./money";

describe("money", () => {
  it("rounds cents deterministically", () => {
    expect(toMinorUnits(19.995)).toBe(2000);
  });

  it("adds decimal-like prices safely", () => {
    expect(addMoney(14.1, 0.2, 0.3)).toBe(14.6);
  });
});
