import { type GameKernel } from "@3ker/game-core";
import type { GameCommand } from "@3ker/contracts";
export const recoveryOrder = {
  type: "SubmitOrder" as const,
  runId: "recovery",
  commandId: "buy-later",
  actorId: "player",
  accountId: "player",
  securityId: "TEST_A",
  side: "BUY" as const,
  quantity: "200",
  protectionPriceUnits: "120000",
};
async function execute(k: GameKernel, c: GameCommand) {
  const r = await k.execute(c);
  if (!r.ok) throw Error(JSON.stringify(r));
}
export async function firstHalf(k: GameKernel): Promise<void> {
  await execute(k, {
    type: "CreateAccount",
    runId: "recovery",
    commandId: "create",
    actorId: "player",
    accountId: "player",
    initialCashFen: "10000000",
  });
  await execute(k, { ...recoveryOrder, commandId: "buy-initial" });
  await k.advanceTo("2020-01-06T09:30:00+08:00");
  await execute(k, recoveryOrder);
  await k.advanceTo("2020-01-06T09:35:00+08:00");
  const s = k.exportSnapshot("player"),
    a = s.accounts.player!;
  if (
    !a.frozenCashFen ||
    !s.orders.some((o) => o.status === "PARTIAL") ||
    !a.entitlements.some((e) => e.phase === "RECEIVABLE") ||
    !a.lots.some((l) => l.pending)
  )
    throw Error("Recovery checkpoint lacks required pending state");
}
export async function secondHalf(k: GameKernel): Promise<void> {
  const before = k.exportSnapshot("player");
  const retry = await k.execute(recoveryOrder);
  if (
    JSON.stringify(retry) !==
    JSON.stringify(before.receipts[recoveryOrder.commandId]!.receipt)
  )
    throw Error("Receipt retry mismatch");
  await k.advanceTo("2020-01-07T09:30:00+08:00");
  await execute(k, {
    ...recoveryOrder,
    commandId: "sell-final",
    side: "SELL",
    quantity: "100",
    protectionPriceUnits: "100000",
  });
  await k.advanceTo("2020-01-07T15:00:00+08:00");
}
