import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
const root = join(".runtime/data/free-stockdb", randomUUID());
mkdirSync(root, { recursive: true });
const urls = {
  readme:
    "https://raw.githubusercontent.com/hello245m/free-stockdb/main/README.md",
  sync: "https://raw.githubusercontent.com/hello245m/free-stockdb/main/sync_url.txt",
  release:
    "https://api.github.com/repos/hello245m/free-stockdb/releases/latest",
  commit: "https://api.github.com/repos/hello245m/free-stockdb/commits/main",
};
const evidence: Record<string, unknown> = {};
let source = false;
for (const [key, url] of Object.entries(urls))
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "3ker-office-data-probe" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await r.text();
    writeFileSync(join(root, key + ".txt"), body);
    evidence[key] = {
      url,
      status: r.status,
      sha256: createHash("sha256").update(body).digest("hex"),
    };
    if (key === "sync" && r.ok)
      source = body
        .split(/\r?\n/)
        .some((x) => x.trim() && !x.trim().startsWith("#"));
  } catch (e) {
    evidence[key] = { url, error: String(e) };
  }
const report = {
  status: "BLOCKED",
  sourceConfigured: source,
  reason: source
    ? "Database not synchronized; inspect size and exact SDK fq semantics before any download"
    : "Official sync_url.txt has no live source; no local database",
  windows: [2000, 2005, 2010, 2015, 2020, 2024].map((year) => ({
    year,
    frequency: "5m",
    rowCount: 0,
    status: "BLOCKED",
    returnedFrom: null,
    returnedTo: null,
  })),
  evidence,
};
writeFileSync(
  join(root, "coverage-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ root, ...report }));
process.exitCode = 2;
