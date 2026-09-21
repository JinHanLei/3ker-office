import { z } from "zod";
import { id, natural, positive } from "../primitives/index.js";
const base = { runId: id, commandId: id, actorId: id, accountId: id };
export const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.literal("CreateAccount"),
      ownerActorId: id.optional(),
      initialCashFen: natural,
      permissions: z.array(z.string()).default(["TEST"]),
      profile: z.enum(["debtor", "employee", "owner"]).default("employee"),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("TransferCash"),
      toAccountId: id,
      amountFen: positive,
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("SubmitOrder"),
      securityId: id,
      side: z.enum(["BUY", "SELL"]),
      quantity: positive,
      protectionPriceUnits: positive.optional(),
      timeInForce: z.literal("DAY").default("DAY"),
    })
    .strict(),
  z.object({ ...base, type: z.literal("CancelOrder"), orderId: id }).strict(),
  z
    .object({ ...base, type: z.literal("AddWatchlist"), securityId: id })
    .strict(),
  z
    .object({ ...base, type: z.literal("RemoveWatchlist"), securityId: id })
    .strict(),
]);
export type GameCommand = z.input<typeof commandSchema>;
export type ParsedCommand = z.output<typeof commandSchema>;
export type GameQuery =
  | { type: "status" }
  | { type: "search"; text?: string }
  | { type: "bars"; securityId: string }
  | {
      type: "account" | "orders" | "positions" | "watchlist" | "ledger";
      accountId: string;
      actorId: string;
    };
