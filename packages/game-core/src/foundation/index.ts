import { iso, KernelError } from "@3ker/contracts";
export function roundRatio(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new Error("Positive denominator required");
  return n < 0n ? -roundRatio(-n, d) : (n + d / 2n) / d;
}
export function amountFen(priceUnits: bigint, quantity: bigint): bigint {
  return roundRatio(priceUnits * quantity, 100n);
}
export function decimalUnits(text: string, scale: number): bigint {
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new KernelError("INVALID_PRICE");
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace("-", "").split(".");
  if (fraction.length > scale && /[^0]/.test(fraction.slice(scale)))
    throw new KernelError("INVALID_PRICE", "Excess precision");
  const value =
    BigInt(whole!) * 10n ** BigInt(scale) +
    BigInt(fraction.slice(0, scale).padEnd(scale, "0") || "0");
  return negative ? -value : value;
}
export function formatFen(fen: bigint): string {
  const a = fen < 0n ? -fen : fen;
  return `${fen < 0n ? "-" : ""}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
}
export function ms(value: string): number {
  iso.parse(value);
  const time = Date.parse(value);
  if (!Number.isSafeInteger(time)) throw new Error("Invalid UTC timestamp");
  return time;
}
export function marketDate(time: number): string {
  return new Date(time + 8 * 3600000).toISOString().slice(0, 10);
}
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => {
    if (typeof v === "bigint") return v.toString();
    if (v && typeof v === "object" && !Array.isArray(v))
      return Object.fromEntries(
        Object.entries(v).sort(([a], [b]) => a.localeCompare(b, "en")),
      );
    return v;
  });
}
const integerKeys = new Set([
  "quantity",
  "remaining",
  "frozenQuantity",
  "shareQuantity",
  "quantityDelta",
  "volume",
]);
export function decode<T>(json: string): T {
  return JSON.parse(json, (key, value: unknown) =>
    typeof value === "string" &&
    (/(?:Fen|Units)$/.test(key) || integerKeys.has(key)) &&
    /^-?\d+$/.test(value)
      ? BigInt(value)
      : value,
  ) as T;
}
export function clone<T>(v: T): T {
  return structuredClone(v);
}
/** Non-cryptographic domain checksum, never used for source integrity. */
export function domainHash(v: unknown): string {
  let h = 2166136261;
  for (const c of stableStringify(v)) {
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
export function randomNext(
  seed: number,
  streams: Record<string, number>,
  name: string,
): number {
  let x = streams[name] ?? parseInt(domainHash({ seed, name }), 16);
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  streams[name] = x >>> 0;
  return (x >>> 0) / 4294967296;
}
export const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);
export const max = (a: bigint, b: bigint): bigint => (a > b ? a : b);
export const isOpen = (o: { status: string }): boolean =>
  o.status === "OPEN" || o.status === "PARTIAL";
