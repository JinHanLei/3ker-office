import { readFileSync, writeFileSync, existsSync } from "node:fs";
const rows = JSON.parse(readFileSync("tests/acceptance/cases.json", "utf8"));
const result = JSON.parse(readFileSync(".runtime/verify-tests.json", "utf8"));
if (!result.success || result.numFailedTests || result.numPendingTests)
  throw Error("Tests are failing or skipped");
const cases = rows.map((row) => {
  if (row.testFile) {
    const file = result.testResults.find((t) =>
      t.name.replaceAll("\\", "/").endsWith(row.testFile),
    );
    const test = file?.assertionResults.find((t) =>
      (t.fullName ?? t.title).includes(row.testName),
    );
    if (!test || test.status !== "passed")
      throw Error(
        `Unverified acceptance ${row.id}: ${row.testFile} ${row.testName}`,
      );
  } else if (!row.evidence?.every(existsSync))
    throw Error(`Missing evidence ${row.id}`);
  return row;
});
const count = (group) =>
  Object.fromEntries(
    ["PASS", "FAIL", "BLOCKED", "NOT_IMPLEMENTED"].map((status) => [
      status,
      cases.filter(
        (c) =>
          (group === "kernel" ? !c.id.startsWith("G") : c.id.startsWith("G")) &&
          c.status === status,
      ).length,
    ]),
  );
const report = {
  platform: process.platform,
  node: process.version,
  tests: result.numPassedTests,
  kernel: count("kernel"),
  data: count("data"),
  remoteCI: "NOT_OBSERVED",
  cases,
};
writeFileSync(
  ".runtime/acceptance-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    tests: report.tests,
    kernel: report.kernel,
    data: report.data,
    platform: report.platform,
    report: ".runtime/acceptance-report.json",
  }),
);
