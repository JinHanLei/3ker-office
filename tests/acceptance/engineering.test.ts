import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { runCommands } from "../../scripts/verify/process.mjs";
it("A02 architecture directions and deterministic core checked", () => {
  const r = spawnSync(process.execPath, ["scripts/architecture/check.mjs"], {
    encoding: "utf8",
  });
  expect(r.status, r.stderr).toBe(0);
});
it("A05 runtime credentials databases and real samples are ignored", () => {
  for (const path of [
    ".runtime/a.json",
    ".env",
    "save.sqlite",
    "scenarios/real/private/data.json",
    ".venv-data/secrets",
  ]) {
    const r = spawnSync("git", ["check-ignore", path], { encoding: "utf8" });
    expect(r.status, path).toBe(0);
  }
});
it("F04 verifier returns first nonzero child status", () => {
  expect(
    runCommands(
      [
        ["-e", "process.exit(7)"],
        ["-e", 'throw Error("must not execute")'],
      ],
      { stdio: "pipe" },
    ),
  ).toBe(7);
  expect(runCommands([["-e", "process.exit(0)"]], { stdio: "pipe" })).toBe(0);
});
it("independent expected results preserved from task specification", () => {
  const e = JSON.parse(
    readFileSync("tests/acceptance/expected/hand-calculated.json", "utf8"),
  );
  expect(e.trade.finalCashFen).toBe("10008890");
  expect(e.partial.commissionFen).toBe("500");
  expect(e.dividend.receivableFen).toBe("50000");
  expect(existsSync(".github/workflows/verify.yml")).toBe(true);
});
