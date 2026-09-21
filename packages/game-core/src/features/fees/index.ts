import type { Rule } from "@3ker/contracts";
import { max, roundRatio } from "../../foundation/index.js";
export function commission(turnover: bigint, r: Rule): bigint {
  return turnover === 0n
    ? 0n
    : max(
        BigInt(r.minimumCommissionFen),
        roundRatio(
          turnover * BigInt(r.commissionNumerator),
          BigInt(r.commissionDenominator),
        ),
      );
}
export function stamp(turnover: bigint, r: Rule): bigint {
  return roundRatio(
    turnover * BigInt(r.stampNumerator),
    BigInt(r.stampDenominator),
  );
}
