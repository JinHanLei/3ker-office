import { describe, it, expect } from "vitest";
import { commandSchema, iso, natural } from "./index.js";
describe("K01 contracts", () => {
  it("rejects implicit timezone, fractions and caller timestamps", () => {
    expect(iso.safeParse("2020-01-02T10:00:00").success).toBe(false);
    expect(natural.safeParse("1.2").success).toBe(false);
    expect(
      commandSchema.safeParse({
        type: "SubmitOrder",
        runId: "r",
        commandId: "c",
        actorId: "p",
        accountId: "a",
        securityId: "TEST_A",
        side: "BUY",
        quantity: "100",
        acceptedAt: 0,
      }).success,
    ).toBe(false);
  });
  it("preserves arbitrarily large decimal values", () =>
    expect(natural.parse("900719925474099312345")).toBe(
      "900719925474099312345",
    ));
});
