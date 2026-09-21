import { GameKernel } from "../../packages/game-core/src/index.js";
import {
  loadScenario,
  validatedData,
  MemoryRunStore,
} from "../../packages/kernel-adapters/src/index.js";
import { type ScenarioPack, type GameCommand } from "@3ker/contracts";
export async function setup(
  change?: (p: ScenarioPack) => void,
  name = "kernel-smoke",
) {
  const data = loadScenario("scenarios/synthetic/" + name);
  change?.(data.pack);
  const k = await GameKernel.create(
    { runId: "r", ownerActorId: "p" },
    validatedData(data.pack),
    new MemoryRunStore(),
  );
  await k.execute({
    type: "CreateAccount",
    runId: "r",
    commandId: "create",
    actorId: "p",
    accountId: "a",
    initialCashFen: "10000000",
  });
  return k;
}
export const buy = (
  id: string,
  quantity = "100",
  price = "120000",
  accountId = "a",
): GameCommand => ({
  type: "SubmitOrder",
  runId: "r",
  commandId: id,
  actorId: "p",
  accountId,
  securityId: "TEST_A",
  side: "BUY",
  quantity,
  protectionPriceUnits: price,
});
export const sell = (
  id: string,
  quantity = "100",
  price = "100000",
): GameCommand => ({
  ...buy(id, quantity, price),
  type: "SubmitOrder",
  securityId: "TEST_A",
  side: "SELL",
  quantity,
  protectionPriceUnits: price,
});
export const cancel = (id: string, orderId: string): GameCommand => ({
  type: "CancelOrder",
  runId: "r",
  commandId: id,
  actorId: "p",
  accountId: "a",
  orderId,
});
