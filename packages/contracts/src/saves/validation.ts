import { z } from "zod";
import { id } from "../primitives/index.js";
import type { RunState } from "./index.js";
const n = z.number().int().safe().nonnegative(),
  b = z.bigint(),
  natural = z.bigint().nonnegative();
const lot = z.object({
  lotId: id,
  securityId: id,
  quantity: natural,
  frozenQuantity: natural,
  costFen: natural,
  acquiredAt: n,
  sellableAt: n,
  pending: z.boolean(),
  archived: z.boolean(),
});
const entitlement = z.object({
  actionId: id,
  securityId: id,
  quantity: natural,
  cashFen: natural,
  shareQuantity: natural,
  phase: z.enum(["REGISTERED", "RECEIVABLE", "PAID", "RELEASED"]),
});
const account = z.object({
  accountId: id,
  actorId: id,
  profile: z.string(),
  permissions: z.array(z.string()),
  availableCashFen: natural,
  frozenCashFen: natural,
  externalFlowFen: b,
  realizedPnlFen: b,
  dividendIncomeFen: b,
  lots: z.array(lot),
  entitlements: z.array(entitlement),
  watchlist: z.array(id),
});
const order = z.object({
  orderId: id,
  accountId: id,
  securityId: id,
  side: z.enum(["BUY", "SELL"]),
  quantity: natural,
  remaining: natural,
  protectionPriceUnits: natural.optional(),
  acceptedAt: n,
  acceptedSeq: n,
  validDate: z.string(),
  status: z.enum(["OPEN", "PARTIAL", "FILLED", "CANCELLED", "EXPIRED"]),
  reservedFen: natural,
  turnoverFen: natural,
  commissionFen: natural,
  stampFen: natural,
  allocations: z.array(z.object({ lotId: id, quantity: natural })),
  lastReason: z.string().optional(),
});
const trade = z.object({
  tradeId: id,
  orderId: id,
  accountId: id,
  securityId: id,
  side: z.enum(["BUY", "SELL"]),
  time: n,
  quantity: natural,
  priceUnits: natural,
  amountFen: natural,
  commissionFen: natural,
  stampFen: natural,
  costFen: natural,
});
const event = z.object({
  eventSeq: n,
  time: n,
  type: z.string(),
  accountId: id.optional(),
  reference: z.string().optional(),
});
const ledger = z.object({
  eventSeq: n,
  time: n,
  accountId: id,
  reason: z.string(),
  reference: z.string(),
  availableBeforeFen: natural,
  availableAfterFen: natural,
  frozenBeforeFen: natural,
  frozenAfterFen: natural,
  quantityDelta: b,
  costDeltaFen: b,
  externalDeltaFen: b,
});
export const runStateSchema = z.object({
  runId: id,
  ownerActorId: id,
  scenarioId: id,
  scenarioVersion: z.string(),
  scenarioHash: z.string(),
  ruleVersion: z.string(),
  saveSchemaVersion: n,
  engineVersion: z.string(),
  seed: n,
  randomStreams: z.record(n),
  gameTime: n,
  stateVersion: n,
  eventSeq: n,
  nextOrderSeq: n,
  status: z.enum(["RUNNING", "SCENARIO_COMPLETE"]),
  accounts: z.record(account),
  orders: z.array(order),
  trades: z.array(trade),
  events: z.array(event),
  ledger: z.array(ledger),
  receipts: z.record(
    z.object({
      payload: z.string(),
      receipt: z.object({
        commandId: id,
        ok: z.boolean(),
        code: z.string().optional(),
        orderId: id.optional(),
        eventSeq: n,
      }),
    }),
  ),
  processed: z.array(z.string()),
  marks: z.record(z.object({ priceUnits: natural, time: n })),
});
export function validateRunState(value: unknown): RunState {
  return runStateSchema.parse(value) as RunState;
}
