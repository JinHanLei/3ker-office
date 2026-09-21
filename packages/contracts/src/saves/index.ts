import type { ErrorCode, Receipt } from "../primitives/index.js";
export const ENGINE_VERSION = "0.1.0";
export const SAVE_SCHEMA_VERSION = 1;
export interface Lot {
  lotId: string;
  securityId: string;
  quantity: bigint;
  frozenQuantity: bigint;
  costFen: bigint;
  acquiredAt: number;
  sellableAt: number;
  pending: boolean;
  archived: boolean;
}
export interface Entitlement {
  actionId: string;
  securityId: string;
  quantity: bigint;
  cashFen: bigint;
  shareQuantity: bigint;
  phase: "REGISTERED" | "RECEIVABLE" | "PAID" | "RELEASED";
}
export interface Account {
  accountId: string;
  actorId: string;
  profile: string;
  permissions: string[];
  availableCashFen: bigint;
  frozenCashFen: bigint;
  externalFlowFen: bigint;
  realizedPnlFen: bigint;
  dividendIncomeFen: bigint;
  lots: Lot[];
  entitlements: Entitlement[];
  watchlist: string[];
}
export interface Order {
  orderId: string;
  accountId: string;
  securityId: string;
  side: "BUY" | "SELL";
  quantity: bigint;
  remaining: bigint;
  protectionPriceUnits?: bigint;
  acceptedAt: number;
  acceptedSeq: number;
  validDate: string;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED" | "EXPIRED";
  reservedFen: bigint;
  turnoverFen: bigint;
  commissionFen: bigint;
  stampFen: bigint;
  allocations: { lotId: string; quantity: bigint }[];
  lastReason?: ErrorCode;
}
export interface Trade {
  tradeId: string;
  orderId: string;
  accountId: string;
  securityId: string;
  side: "BUY" | "SELL";
  time: number;
  quantity: bigint;
  priceUnits: bigint;
  amountFen: bigint;
  commissionFen: bigint;
  stampFen: bigint;
  costFen: bigint;
}
export interface DomainEvent {
  eventSeq: number;
  time: number;
  type: string;
  accountId?: string;
  reference?: string;
}
export interface LedgerEntry {
  eventSeq: number;
  time: number;
  accountId: string;
  reason: string;
  reference: string;
  availableBeforeFen: bigint;
  availableAfterFen: bigint;
  frozenBeforeFen: bigint;
  frozenAfterFen: bigint;
  quantityDelta: bigint;
  costDeltaFen: bigint;
  externalDeltaFen: bigint;
}
export interface RunState {
  runId: string;
  ownerActorId: string;
  scenarioId: string;
  scenarioVersion: string;
  scenarioHash: string;
  ruleVersion: string;
  saveSchemaVersion: number;
  engineVersion: string;
  seed: number;
  randomStreams: Record<string, number>;
  gameTime: number;
  stateVersion: number;
  eventSeq: number;
  nextOrderSeq: number;
  status: "RUNNING" | "SCENARIO_COMPLETE";
  accounts: Record<string, Account>;
  orders: Order[];
  trades: Trade[];
  events: DomainEvent[];
  ledger: LedgerEntry[];
  receipts: Record<string, { payload: string; receipt: Receipt }>;
  processed: string[];
  marks: Record<string, { priceUnits: bigint; time: number }>;
}
