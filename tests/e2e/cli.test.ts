import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
it("A03 F01 F03 compiled headless demo exports reconcile every wallet change", () => {
  const p = spawnSync(
    process.execPath,
    ["apps/headless/dist/demos/headless.js"],
    { encoding: "utf8" },
  );
  expect(p.status, p.stderr).toBe(0);
  const root = p.stdout.match(/输出目录：(.*)/)![1]!.trim();
  const summary = JSON.parse(readFileSync(join(root, "summary.json"), "utf8"));
  expect(summary.actualCashFen).toBe("10013890");
  const ledger = readFileSync(join(root, "ledger.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((x) => JSON.parse(x));
  const balances: Record<string, { available: string; frozen: string }> = {};
  for (const l of ledger) {
    const last = balances[l.accountId] ?? { available: "0", frozen: "0" };
    expect(l.availableBeforeFen).toBe(last.available);
    expect(l.frozenBeforeFen).toBe(last.frozen);
    balances[l.accountId] = {
      available: l.availableAfterFen,
      frozen: l.frozenAfterFen,
    };
  }
  const accounts = JSON.parse(
    readFileSync(join(root, "account-snapshots.json"), "utf8"),
  );
  for (const a of accounts) {
    expect(balances[a.accountId]).toEqual({
      available: a.availableCashFen,
      frozen: a.frozenCashFen,
    });
  }
  const trades = readFileSync(join(root, "trades.csv"), "utf8")
    .trim()
    .split("\n");
  expect(trades.length - 1).toBe(4);
  expect(readdirSync(root)).toEqual(
    expect.arrayContaining([
      "orders.json",
      "events.jsonl",
      "verification.json",
    ]),
  );
});
it("CLI create buy step save resume and script input are actual compiled commands", () => {
  const db = join(mkdtempSync(join(tmpdir(), "3ker-cli-")), "run.sqlite");
  const run = (args: string[], input?: string) => {
    const p = spawnSync(
      process.execPath,
      [
        "apps/headless/dist/main.js",
        "--run",
        "cli-test",
        "--db",
        db,
        "--json",
        ...args,
      ],
      { encoding: "utf8", input },
    );
    expect(p.status, p.stderr).toBe(0);
    return p.stdout;
  };
  expect(JSON.parse(run(["create", "100000"])).ok).toBe(true);
  expect(
    JSON.parse(run(["buy", "TEST_A", "100", "12", "--command-id", "buy"])).ok,
  ).toBe(true);
  run(["advance", "2020-01-02T09:35:00+08:00"]);
  run(["save"]);
  expect(JSON.parse(run(["resume"])).gameTime).toBe(
    Date.parse("2020-01-02T09:35:00+08:00"),
  );
  expect(JSON.parse(run(["account"])).availableCashFen).toBe("9899500");
  expect(run(["interactive"], "pause\nstatus\nquit\n")).toContain("已暂停");
});
it("F05 real demo cannot pass with missing or synthetic source", () => {
  for (const args of [[], ["--scenario", "scenarios/synthetic/kernel-smoke"]]) {
    const p = spawnSync(
      process.execPath,
      ["apps/headless/dist/demos/real-data.js", ...args],
      { encoding: "utf8" },
    );
    expect(p.status).not.toBe(0);
    expect(p.stderr).toContain("REAL_DATA_PENDING");
  }
});
