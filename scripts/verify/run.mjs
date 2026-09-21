import { runCommands } from "./process.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync(".runtime", { recursive: true });
writeFileSync(
  ".runtime/acceptance-report.json",
  JSON.stringify({ status: "RUNNING" }),
);
const commands = [
  ["node_modules/typescript/bin/tsc", "-b"],
  ["scripts/architecture/check.mjs"],
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--reporter=default",
    "--reporter=json",
    "--outputFile=.runtime/verify-tests.json",
  ],
  ["apps/headless/dist/demos/headless.js"],
  ["apps/headless/dist/demos/recovery.js"],
  ["scripts/reports/acceptance.mjs"],
];
process.exitCode = runCommands(commands);
