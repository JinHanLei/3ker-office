import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scenarioSchema, type ScenarioPack } from "@3ker/contracts";
import type { HistoricalData } from "@3ker/game-core/ports";
import { validateScenario } from "../validation/index.js";
export function loadScenario(path: string): HistoricalData {
  const read = (name: string): unknown =>
    JSON.parse(readFileSync(join(path, name + ".json"), "utf8"));
  const pack = scenarioSchema.parse({
    manifest: read("manifest"),
    calendar: read("calendar"),
    securities: read("securities"),
    names: read("names"),
    bars: read("bars-5m"),
    tradingStatus: read("trading-status"),
    actions: read("corporate-actions"),
    rules: read("rules"),
    provenance: read("provenance"),
    coverageReport: read("coverage-report"),
  });
  return validatedData(pack);
}
function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x).sort(([a], [b]) => a.localeCompare(b, "en")),
        )
      : x,
  );
}
export function validatedData(input: ScenarioPack): HistoricalData {
  const pack = scenarioSchema.parse(input);
  validateScenario(pack);
  return {
    pack,
    hash: createHash("sha256").update(stable(pack)).digest("hex"),
  };
}
