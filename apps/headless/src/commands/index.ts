import { randomUUID } from "node:crypto";
import type { GameKernel } from "@3ker/game-core";
import { decimalUnits } from "@3ker/game-core";
import type { GameCommand } from "@3ker/contracts";
import { exportRun } from "../output/index.js";
import type { Playback } from "../playback/index.js";
export async function dispatch(
  k: GameKernel,
  tokens: string[],
  context: {
    runId: string;
    actorId: string;
    accountId: string;
    playback: Playback;
  },
): Promise<unknown> {
  const args = [...tokens];
  const cid = args.indexOf("--command-id");
  const commandId = cid < 0 ? randomUUID() : args.splice(cid, 2)[1]!;
  const [name, ...rest] = args;
  const base = {
    runId: context.runId,
    actorId: context.actorId,
    accountId: context.accountId,
    commandId,
  };
  let command: GameCommand;
  switch (name) {
    case "status":
      return k.query({ type: "status" });
    case "search":
      return k.query({ type: "search", text: rest.join(" ") });
    case "account":
      return k.query({
        type: "account",
        accountId: context.accountId,
        actorId: context.actorId,
      });
    case "orders":
    case "positions":
    case "ledger":
      return k.query({
        type: name,
        accountId: context.accountId,
        actorId: context.actorId,
      });
    case "watchlist":
      if (!rest.length)
        return k.query({
          type: "watchlist",
          accountId: context.accountId,
          actorId: context.actorId,
        });
      if (!["add", "remove"].includes(rest[0]!))
        throw Error("watchlist add/remove securityId");
      command = {
        ...base,
        type: rest[0] === "add" ? "AddWatchlist" : "RemoveWatchlist",
        securityId: rest[1]!,
      };
      break;
    case "buy":
    case "sell":
      command = {
        ...base,
        type: "SubmitOrder",
        side: name === "buy" ? "BUY" : "SELL",
        securityId: rest[0]!,
        quantity: rest[1]!,
        ...(rest[2]
          ? { protectionPriceUnits: decimalUnits(rest[2], 4).toString() }
          : {}),
      };
      break;
    case "cancel":
      command = { ...base, type: "CancelOrder", orderId: rest[0]! };
      break;
    case "transfer":
      command = {
        ...base,
        type: "TransferCash",
        toAccountId: rest[0]!,
        amountFen: decimalUnits(rest[1]!, 2).toString(),
      };
      break;
    case "create-account":
      command = {
        ...base,
        type: "CreateAccount",
        accountId: rest[0]!,
        initialCashFen: decimalUnits(rest[1] ?? "0", 2).toString(),
      };
      break;
    case "step":
      return k.stepNextEvent();
    case "advance":
      return k.advanceTo(rest[0]!);
    case "save":
      return k.checkpoint();
    case "resume":
      return k.query({ type: "status" });
    case "play":
      context.playback.play(Number(rest[0] ?? 1));
      return { 状态: "自动推进已启动" };
    case "pause":
      context.playback.pause();
      return { 状态: "已暂停" };
    case "export":
      if (!rest[0]) throw Error("export requires directory");
      exportRun(k, rest[0], context.actorId);
      return { 目录: rest[0] };
    default:
      throw Error(`Unknown command ${name}`);
  }
  return k.execute(command);
}
