import { it, expect } from "vitest";
import { setup, buy, sell, cancel } from "./helpers.js";
import { ms } from "../../packages/game-core/src/index.js";
it("B04 lunch weekend holiday T+1 and after-hours DAY", async () => {
  const k = await setup((p) => {
    p.actions = [];
    p.calendar = p.calendar.filter((d) => d.date !== "2020-01-06");
    p.bars = p.bars.filter((b) => !b.barStart.startsWith("2020-01-06"));
  });
  await k.advanceTo("2020-01-03T11:30:00+08:00");
  await k.execute(buy("lunch"));
  await k.advanceTo("2020-01-03T13:00:00+08:00");
  expect(k.exportSnapshot("p").trades).toHaveLength(0);
  await k.stepNextEvent();
  expect(k.exportSnapshot("p").trades).toHaveLength(1);
  await k.advanceTo("2020-01-06T12:00:00+08:00");
  expect((await k.execute(sell("holiday-sell"))).code).toBe(
    "INSUFFICIENT_SELLABLE_QUANTITY",
  );
  await k.execute(buy("after-hours"));
  expect(k.exportSnapshot("p").orders.at(-1)!.validDate).toBe("2020-01-07");
  await k.advanceTo("2020-01-07T09:30:00+08:00");
  expect((await k.execute(sell("released"))).ok).toBe(true);
});
it("B05 B06 B07 B08 PIT names and lifecycle without future leakage", async () => {
  const k = await setup();
  const before = JSON.stringify(k.query({ type: "search" }));
  expect(before).toContain("TEST_EXIT");
  expect(before).not.toContain("TEST_B");
  expect(before).not.toContain("lastTradableAt");
  expect(before).not.toContain("新名");
  await k.execute(buy("buy"));
  await k.advanceTo("2020-01-06T09:35:00+08:00");
  expect(JSON.stringify(k.query({ type: "search" }))).toContain("TEST_B");
  expect(JSON.stringify(k.query({ type: "search" }))).toContain("新名");
  expect(k.exportSnapshot("p").accounts.a!.lots[0]!.securityId).toBe("TEST_A");
  await k.advanceTo("2020-01-06T15:01:00+08:00");
  expect(JSON.stringify(k.query({ type: "search" }))).not.toContain(
    "TEST_EXIT",
  );
  const r = await k.execute({
    ...buy("closed"),
    type: "SubmitOrder",
    securityId: "TEST_EXIT",
    side: "BUY",
    quantity: "100",
    protectionPriceUnits: "100000",
  });
  expect(r.code).toBe("MARKET_CLOSED");
});
it("B10 suspension zero-volume missing distinguish, no artificial bars", async () => {
  const k = await setup((p) => {
    p.bars
      .filter(
        (b) =>
          b.securityId === "TEST_A" &&
          ms(b.barEnd) === ms("2020-01-02T09:35:00+08:00"),
      )
      .forEach((b) => (b.volume = "0"));
  });
  await k.execute(buy("zero"));
  await k.advanceTo("2020-01-02T09:35:00+08:00");
  expect(k.exportSnapshot("p").orders[0]!.lastReason).toBe("ZERO_VOLUME");
  await k.advanceTo("2020-01-03T09:30:00+08:00");
  expect(
    (
      await k.execute({
        ...buy("suspended"),
        type: "SubmitOrder",
        securityId: "TEST_EXIT",
        side: "BUY",
        quantity: "100",
        protectionPriceUnits: "100000",
      })
    ).code,
  ).toBe("SUSPENDED");
  expect(JSON.stringify(k.query({ type: "search" }))).toContain("TEST_EXIT");
});
it("C02 C03 cash rejection freeze improvement partial cancellation reconcile", async () => {
  const k = await setup();
  const before = k.exportSnapshot("p");
  expect((await k.execute(buy("too-much", "10000000"))).code).toBe(
    "INSUFFICIENT_CASH",
  );
  expect(k.exportSnapshot("p").accounts).toEqual(before.accounts);
  const r = await k.execute(buy("partial", "200"));
  let a = k.exportSnapshot("p").accounts.a!;
  expect(a.frozenCashFen).toBe(240500n);
  await k.advanceTo("2020-01-02T09:35:00+08:00");
  a = k.exportSnapshot("p").accounts.a!;
  expect(a.frozenCashFen).toBe(120000n);
  expect(a.availableCashFen).toBe(9779500n);
  await k.execute(cancel("cancel", r.orderId!));
  a = k.exportSnapshot("p").accounts.a!;
  expect(a.availableCashFen).toBe(9899500n);
  expect(a.frozenCashFen).toBe(0n);
  expect(k.exportSnapshot("p").orders[0]!.commissionFen).toBe(500n);
});
it("C04 C05 two sell orders cannot refreeze old lots and new buys stay T+1", async () => {
  const k = await setup();
  await k.execute(buy("old"));
  await k.advanceTo("2020-01-03T09:30:00+08:00");
  await k.execute(buy("new"));
  await k.stepNextEvent();
  expect((await k.execute(sell("sell-old"))).ok).toBe(true);
  expect((await k.execute(sell("double-sell"))).code).toBe(
    "INSUFFICIENT_SELLABLE_QUANTITY",
  );
  const a = k.exportSnapshot("p").accounts.a!;
  expect(a.lots.reduce((n, l) => n + l.frozenQuantity, 0n)).toBe(100n);
  expect(a.lots.reduce((n, l) => n + l.quantity, 0n)).toBe(200n);
});
it("C06 C10 protection remains unchanged and DAY expiration releases reserve", async () => {
  const k = await setup();
  await k.execute(buy("protected", "100", "90000"));
  await k.advanceTo("2020-01-02T09:35:00+08:00");
  expect(k.exportSnapshot("p").orders[0]).toMatchObject({
    lastReason: "PRICE_PROTECTION",
    protectionPriceUnits: 90000n,
  });
  await k.advanceTo("2020-01-02T15:00:00+08:00");
  expect(k.exportSnapshot("p").orders[0]!.status).toBe("EXPIRED");
  expect(k.exportSnapshot("p").accounts.a!.availableCashFen).toBe(10000000n);
});
it("C07 upper limit blocks only buys lower only sells", async () => {
  const k = await setup((p) => {
    p.actions = [];
    for (const b of p.bars)
      if (b.securityId === "TEST_A" && b.barStart.startsWith("2020-01-03")) {
        b.openUnits = b.highUnits = b.lowUnits = b.closeUnits = "110000";
        b.upperUnits = "110000";
      }
  });
  await k.execute(buy("initial"));
  await k.advanceTo("2020-01-03T09:30:00+08:00");
  await k.execute(buy("upper-buy"));
  await k.execute(sell("upper-sell"));
  await k.stepNextEvent();
  expect(
    k.exportSnapshot("p").orders.find((o) => o.orderId === "order-2")!
      .lastReason,
  ).toBe("PRICE_LIMIT");
  expect(
    k.exportSnapshot("p").orders.find((o) => o.orderId === "order-3")!.status,
  ).toBe("FILLED");
  const low = await setup((p) => {
    p.actions = [];
    for (const b of p.bars)
      if (b.securityId === "TEST_A" && b.barStart.startsWith("2020-01-03")) {
        b.openUnits = b.highUnits = b.lowUnits = b.closeUnits = "90000";
        b.lowerUnits = "90000";
      }
  });
  await low.execute(buy("initial"));
  await low.advanceTo("2020-01-03T09:30:00+08:00");
  await low.execute(sell("lower-sell", "100", "80000"));
  await low.execute(buy("lower-buy"));
  await low.stepNextEvent();
  expect(low.exportSnapshot("p").orders[1]!.lastReason).toBe("PRICE_LIMIT");
  expect(low.exportSnapshot("p").orders[2]!.status).toBe("FILLED");
});
it("C08 capacity is shared globally by accepted order sequence", async () => {
  const k = await setup();
  await k.execute({
    type: "CreateAccount",
    runId: "r",
    commandId: "b",
    actorId: "p",
    accountId: "b",
    initialCashFen: "10000000",
  });
  await k.execute(buy("first", "200"));
  await k.execute(buy("second", "100", "120000", "b"));
  await k.advanceTo("2020-01-02T09:40:00+08:00");
  expect(k.exportSnapshot("p").trades.map((t) => t.accountId)).toEqual([
    "a",
    "a",
  ]);
  expect(k.exportSnapshot("p").orders[1]!.remaining).toBe(100n);
  await k.stepNextEvent();
  expect(k.exportSnapshot("p").trades[2]!.accountId).toBe("b");
});
it("C11 frozen cash cannot be transferred", async () => {
  const k = await setup();
  await k.execute({
    type: "CreateAccount",
    runId: "r",
    commandId: "b",
    actorId: "p",
    accountId: "b",
    initialCashFen: "0",
  });
  await k.execute(buy("frozen", "8000"));
  expect(
    (
      await k.execute({
        type: "TransferCash",
        runId: "r",
        commandId: "transfer",
        actorId: "p",
        accountId: "a",
        toAccountId: "b",
        amountFen: "10000000",
      })
    ).code,
  ).toBe("INSUFFICIENT_CASH");
  expect(k.exportSnapshot("p").accounts.b!.availableCashFen).toBe(0n);
});
it("C14 minimum buy step and explicit odd-lot sell policy", async () => {
  const k = await setup((p) => {
    p.actions = [
      {
        actionId: "odd",
        type: "SHARES",
        securityId: "TEST_A",
        knownAt: p.manifest.start,
        recordAt: "2020-01-02T15:00:00+08:00",
        effectiveAt: "2020-01-03T09:30:00+08:00",
        releaseAt: "2020-01-03T09:30:00+08:00",
        shareNumerator: "1",
        shareDenominator: "2",
        fractionPolicy: "reject",
      },
    ];
  });
  expect((await k.execute(buy("invalid", "50"))).code).toBe("INVALID_QUANTITY");
  await k.execute(buy("valid"));
  await k.advanceTo("2020-01-03T09:30:00+08:00");
  expect((await k.execute(sell("odd-partial", "50"))).code).toBe(
    "INVALID_QUANTITY",
  );
  expect((await k.execute(sell("all-remainder", "150"))).ok).toBe(true);
});
it("C15 two traded accounts cannot mutate each other through actors or snapshots", async () => {
  const k = await setup();
  await k.execute({
    type: "CreateAccount",
    runId: "r",
    commandId: "b",
    actorId: "p",
    ownerActorId: "npc",
    accountId: "b",
    initialCashFen: "10000000",
  });
  await k.execute(buy("a-buy"));
  await k.execute({ ...buy("b-buy", "100", "120000", "b"), actorId: "npc" });
  await k.advanceTo("2020-01-02T09:40:00+08:00");
  const before = k.exportSnapshot("p").accounts.b!;
  expect(
    (await k.execute({ ...buy("steal", "100", "120000", "b"), actorId: "p" }))
      .code,
  ).toBe("NOT_OWNER");
  expect(() =>
    k.query({ type: "account", accountId: "b", actorId: "p" }),
  ).toThrow("NOT_OWNER");
  const copy = k.query({ type: "account", accountId: "b", actorId: "npc" }) as {
    availableCashFen: bigint;
  };
  copy.availableCashFen = 0n;
  expect(k.exportSnapshot("p").accounts.b).toEqual(before);
});
it("permissions distinguish market not yet created from account not permitted", async () => {
  const k = await setup(
    (p) => (p.rules[0]!.boardAvailableAt = "2020-01-03T00:00:00+08:00"),
  );
  expect((await k.execute(buy("not-created"))).code).toBe("MARKET_CLOSED");
  const denied = await setup(
    (p) => (p.rules[0]!.requiredPermission = "EXPERIENCED"),
  );
  expect((await denied.execute(buy("no-permission"))).code).toBe(
    "PERMISSION_REQUIRED",
  );
});
