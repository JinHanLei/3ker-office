import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openKernel } from "../bootstrap/index.js";
import { firstHalf, secondHalf } from "./recovery-plan.js";
import { economicHash, exportRun, writeJson } from "../output/index.js";
const [phase, root] = process.argv.slice(2);
if (!root) throw Error("output required");
const k = await openKernel({
  db: join(root, phase === "baseline" ? "baseline.sqlite" : "resumed.sqlite"),
  runId: "recovery",
  scenario: "scenarios/synthetic/edge-cases",
  create: phase !== "resume",
});
try {
  if (phase !== "resume") await firstHalf(k);
  if (phase === "first") {
    writeJson(join(root, "checkpoint.json"), {
      hash: economicHash(k.exportSnapshot("player")),
      pid: process.pid,
    });
    await k.checkpoint();
  } else {
    if (phase === "resume") {
      const checkpoint = JSON.parse(
        readFileSync(join(root, "checkpoint.json"), "utf8"),
      );
      if (checkpoint.hash !== economicHash(k.exportSnapshot("player")))
        throw Error("Reopened state differs");
    }
    await secondHalf(k);
    exportRun(k, join(root, phase!), "player", {
      marketDataKind: "synthetic",
      rulesetKind: "game-test",
      pid: process.pid,
    });
    writeJson(join(root, phase + "-state.json"), k.exportSnapshot("player"));
  }
  console.log(
    JSON.stringify({
      phase,
      pid: process.pid,
      hash: economicHash(k.exportSnapshot("player")),
    }),
  );
} finally {
  await k.close();
}
