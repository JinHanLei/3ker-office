import { it, expect } from "vitest";
import { decimalUnits } from "../../../packages/game-core/src/foundation/index.js";
it("G05 documented end labels and share units convert exactly (synthetic SDK-shaped values)", () => {
  const end = Date.parse("2020-01-02T09:35:00+08:00");
  expect(new Date(end - 300000).toISOString()).toBe("2020-01-02T01:30:00.000Z");
  expect(decimalUnits("10.1234000000", 4)).toBe(101234n);
  expect(decimalUnits("2000", 0)).toBe(2000n);
  expect(decimalUnits("1234.56", 2)).toBe(123456n);
});
