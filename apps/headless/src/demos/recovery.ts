import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { decodeState, type RunState } from "@3ker/contracts";
import { economicHash, writeJson } from "../output/index.js";
const root = join(".runtime", "recovery-" + randomUUID());
mkdirSync(root, { recursive: true });
for (const phase of ["baseline", "first", "resume"]) {
  const p = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./recovery-worker.js", import.meta.url)),
      phase,
      root,
    ],
    { encoding: "utf8", timeout: 60000 },
  );
  process.stdout.write(p.stdout);
  if (p.status !== 0) {
    process.stderr.write(p.stderr);
    process.exit(p.status ?? 1);
  }
}
const a = decodeState<RunState>(
    readFileSync(join(root, "baseline-state.json"), "utf8"),
  ),
  b = decodeState<RunState>(
    readFileSync(join(root, "resume-state.json"), "utf8"),
  );
if (economicHash(a) !== economicHash(b))
  throw Error("Recovery differs from uninterrupted baseline");
writeJson(join(root, "verification.json"), {
  status: "PASS",
  sameDomainState: true,
  hash: economicHash(a),
  marketDataKind: "synthetic",
  rulesetKind: "game-test",
});
console.log(
  `恢复演示：PASS；真实进程退出并重开；旧指令重试无重复；领域 SHA-256 ${economicHash(a)}\n输出目录：${root}`,
);
