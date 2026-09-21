import { it, expect } from "vitest";
import { setup, buy, sell } from "./helpers.js";
import { valuation } from "../../packages/game-core/src/features/valuation/index.js";
import {
  applyActions,
  registerActions,
} from "../../packages/game-core/src/features/corporate-actions/index.js";
import { loadScenario } from "../../packages/kernel-adapters/src/index.js";
it("D01 record ownership survives later sale and excludes earlier sale", async () => {
  const a = await setup();
  await a.execute(buy("buy"));
  await a.advanceTo("2020-01-03T09:30:00+08:00");
  await a.execute(sell("before-record"));
  await a.advanceTo("2020-01-07T15:00:00+08:00");
  expect(a.exportSnapshot("p").accounts.a!.dividendIncomeFen).toBe(0n);
  const b = await setup();
  await b.execute(buy("buy"));
  await b.advanceTo("2020-01-06T09:30:00+08:00");
  await b.execute(sell("after-record"));
  await b.advanceTo("2020-01-07T15:00:00+08:00");
  expect(b.exportSnapshot("p").accounts.a!.dividendIncomeFen).toBe(5000n);
  expect(b.exportSnapshot("p").accounts.a!.availableCashFen).toBe(10013890n);
});
it("D03 D05 direct repeated action phase is idempotent", async () => {
  const k = await setup(undefined, "edge-cases");
  await k.execute(buy("buy"));
  await k.advanceTo("2020-01-07T09:30:00+08:00");
  const state = k.exportSnapshot("p"),
    before = structuredClone(state),
    data = loadScenario("scenarios/synthetic/edge-cases");
  applyActions(state, data.pack);
  registerActions(state, data.pack);
  expect(state).toEqual(before);
});
it("D04 shares remain unsellable until release, total acquisition cost preserved", async () => {
  const k = await setup(undefined, "edge-cases");
  await k.execute(buy("buy", "1000"));
  await k.advanceTo("2020-01-06T09:30:00+08:00");
  expect((await k.execute(sell("pending-too", "2000"))).code).toBe(
    "INSUFFICIENT_SELLABLE_QUANTITY",
  );
  const a = k.exportSnapshot("p").accounts.a!;
  expect(a.lots.reduce((n, l) => n + l.costFen, 0n)).toBe(1000500n);
  expect((await k.execute(sell("old", "1000"))).ok).toBe(true);
  await k.advanceTo("2020-01-07T09:30:00+08:00");
  expect((await k.execute(sell("released", "1000"))).ok).toBe(true);
});
it("D07 D08 exit clears orders archives holdings and keeps history and receivables", async () => {
  const k = await setup((p) => {
    p.actions.push({
      actionId: "EXIT_DIV",
      type: "DIVIDEND",
      securityId: "TEST_EXIT",
      knownAt: p.manifest.start,
      recordAt: "2020-01-02T15:00:00+08:00",
      effectiveAt: "2020-01-03T09:30:00+08:00",
      payAt: "2020-01-07T10:00:00+08:00",
      cashNumerator: "50",
      cashDenominator: "1",
    });
  });
  const base = {
    type: "SubmitOrder" as const,
    runId: "r",
    actorId: "p",
    accountId: "a",
    securityId: "TEST_EXIT",
    side: "BUY" as const,
    quantity: "100",
    protectionPriceUnits: "100000",
  };
  await k.execute({ ...base, commandId: "exit-buy" });
  await k.advanceTo("2020-01-06T14:55:00+08:00");
  await k.execute({
    ...base,
    commandId: "exit-pending",
    protectionPriceUnits: "90000",
  });
  await k.advanceTo("2020-01-07T10:00:00+08:00");
  const s = k.exportSnapshot("p"),
    a = s.accounts.a!;
  expect(a.frozenCashFen).toBe(0n);
  expect(a.lots[0]!.archived).toBe(true);
  expect(a.realizedPnlFen).toBe(-100500n);
  expect(a.availableCashFen).toBe(9904500n);
  expect(s.trades).toHaveLength(1);
  expect(
    s.ledger.some(
      (l) => l.reason === "SecurityExited" && l.costDeltaFen === -100500n,
    ),
  ).toBe(true);
  expect(JSON.stringify(k.query({ type: "search" }))).not.toContain(
    "TEST_EXIT",
  );
  expect(s.orders.every((o) => o.status !== "OPEN")).toBe(true);
});
it("D10 unknown price is explicit and fractional share policy missing blocks", async () => {
  const k = await setup();
  await k.execute(buy("buy"));
  await k.advanceTo("2020-01-02T09:35:00+08:00");
  const s = k.exportSnapshot("p");
  s.marks = {};
  expect(valuation(s, s.accounts.a!)).toMatchObject({
    totalEquityFen: null,
    priceStatus: "UNKNOWN_PRICE",
  });
  const odd = await setup((p) => {
    p.actions = [
      {
        actionId: "fractional",
        type: "SHARES",
        securityId: "TEST_A",
        knownAt: p.manifest.start,
        recordAt: "2020-01-02T15:00:00+08:00",
        effectiveAt: "2020-01-03T09:30:00+08:00",
        releaseAt: "2020-01-06T09:30:00+08:00",
        shareNumerator: "1",
        shareDenominator: "3",
      },
    ];
  });
  await odd.execute(buy("buy"));
  expect((await odd.advanceTo("2020-01-03T15:00:00+08:00")).code).toBe(
    "FRACTIONAL_SHARES_UNSUPPORTED",
  );
});
it("small sell cannot create negative cash when fees exceed proceeds", async () => {
  const k = await setup((p) => {
    p.actions = [];
    for (const b of p.bars)
      if (b.securityId === "TEST_A" && b.barStart.startsWith("2020-01-03"))
        b.openUnits = b.highUnits = b.lowUnits = b.closeUnits = "100";
  });
  await k.execute(buy("buy"));
  await k.advanceTo("2020-01-03T09:30:00+08:00");
  await k.execute({
    type: "CreateAccount",
    runId: "r",
    actorId: "p",
    accountId: "b",
    commandId: "b",
    initialCashFen: "0",
  });
  await k.execute({
    type: "TransferCash",
    runId: "r",
    actorId: "p",
    accountId: "a",
    toAccountId: "b",
    commandId: "drain",
    amountFen: "9899500",
  });
  await k.execute(sell("tiny", "100", "100"));
  await k.stepNextEvent();
  const a = k.exportSnapshot("p").accounts.a!;
  expect(a.availableCashFen).toBe(0n);
  expect(a.lots[0]!.quantity).toBe(100n);
  expect(k.exportSnapshot("p").orders[1]!.lastReason).toBe("INSUFFICIENT_CASH");
});
