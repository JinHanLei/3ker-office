import { z } from "zod";
export const id = z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/);
export const integer = z.string().regex(/^-?(0|[1-9][0-9]*)$/);
export const natural = z.string().regex(/^(0|[1-9][0-9]*)$/);
export const positive = z.string().regex(/^[1-9][0-9]*$/);
export const iso = z.string().datetime({ offset: true });
export const errorCodes = [
  "INVALID_COMMAND",
  "INVALID_ORDER",
  "INVALID_PRICE",
  "INVALID_QUANTITY",
  "INSUFFICIENT_CASH",
  "INSUFFICIENT_SELLABLE_QUANTITY",
  "SECURITY_NOT_LISTED",
  "MARKET_CLOSED",
  "SUSPENDED",
  "PERMISSION_REQUIRED",
  "PRICE_PROTECTION",
  "IDEMPOTENCY_CONFLICT",
  "STATE_VERSION_CONFLICT",
  "MISSING_DATA",
  "DATA_PENDING",
  "RULE_COVERAGE_MISSING",
  "UNSUPPORTED_CORPORATE_ACTION",
  "SCENARIO_COMPLETE",
  "SAVE_VERSION_UNSUPPORTED",
  "SCENARIO_VERSION_MISMATCH",
  "UNKNOWN_PRICE",
  "FRACTIONAL_SHARES_UNSUPPORTED",
  "ACCOUNT_NOT_FOUND",
  "NOT_OWNER",
  "ORDER_NOT_OPEN",
  "ACCOUNT_EXISTS",
  "CAPACITY",
  "ZERO_VOLUME",
  "PRICE_LIMIT",
  "NOT_ELIGIBLE",
  "EXIT_POLICY_MISSING",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export class KernelError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "KernelError";
  }
}
export interface Receipt {
  commandId: string;
  ok: boolean;
  code?: ErrorCode;
  orderId?: string;
  eventSeq: number;
}
