import type { ScenarioPack } from "@3ker/contracts";
import { ms } from "../../foundation/index.js";
import { expectedBoundaries } from "../calendar/index.js";
export function schedule(p: ScenarioPack): number[] {
  const points = [
    ms(p.manifest.end),
    ...expectedBoundaries(p),
    ...p.calendar.flatMap((d) =>
      d.sessions.flatMap((s) => [ms(s.open), ms(s.close)]),
    ),
    ...p.actions.flatMap((a) =>
      [a.recordAt, a.effectiveAt, a.payAt, a.releaseAt]
        .filter((x): x is string => !!x)
        .map(ms),
    ),
    ...p.securities.flatMap((s) =>
      s.lastTradableAt ? [ms(s.lastTradableAt)] : [],
    ),
  ];
  return [...new Set(points)]
    .filter((t) => ms(p.manifest.start) <= t && t <= ms(p.manifest.end))
    .sort((a, b) => a - b);
}
