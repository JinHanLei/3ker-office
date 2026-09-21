import { it, expect } from "vitest";
import { GameKernel } from "../../packages/game-core/src/index.js";
import {
  MemoryRunStore,
  loadScenario,
} from "../../packages/kernel-adapters/src/index.js";
it("C11 C12 C13 cash transfers are atomic idempotent and external flows", async () => {
  const k = await GameKernel.create(
    { runId: "r", ownerActorId: "p" },
    loadScenario("scenarios/synthetic/kernel-smoke"),
    new MemoryRunStore(),
  );
  for (const [accountId, initialCashFen] of [
    ["a", "900719925474099312345"],
    ["b", "0"],
  ])
    expect(
      (
        await k.execute({
          type: "CreateAccount",
          runId: "r",
          commandId: accountId!,
          actorId: "p",
          accountId: accountId!,
          initialCashFen: initialCashFen!,
        })
      ).ok,
    ).toBe(true);
  const c = {
    type: "TransferCash" as const,
    runId: "r",
    commandId: "transfer",
    actorId: "p",
    accountId: "a",
    toAccountId: "b",
    amountFen: "100000",
  };
  const first = await k.execute(c);
  expect(await k.execute(c)).toEqual(first);
  expect((await k.execute({ ...c, amountFen: "1" })).code).toBe(
    "IDEMPOTENCY_CONFLICT",
  );
  const s = k.exportSnapshot("p");
  expect(s.accounts.a!.availableCashFen).toBe(900719925474099212345n);
  expect(s.accounts.b!.availableCashFen).toBe(100000n);
  expect(s.accounts.b!.realizedPnlFen).toBe(0n);
  const fail = await k.execute({
    ...c,
    commandId: "fail",
    amountFen: "900719925474099312345",
  });
  expect(fail.code).toBe("INSUFFICIENT_CASH");
  expect(k.exportSnapshot("p").accounts).toEqual(s.accounts);
});
