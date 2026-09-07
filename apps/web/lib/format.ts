// Money amounts arrive from the API as strings (Prisma BigInt, kobo/minor units) to avoid
// float precision loss — CLAUDE.md SS17. Format for display only; never round-trip a
// formatted string back into a request body, always send the raw minor-units integer.
export function formatMoney(minorUnitsStr: string | null | undefined, currency = "NGN"): string {
  if (minorUnitsStr === null || minorUnitsStr === undefined) return "—";
  const minorUnits = BigInt(minorUnitsStr);
  const whole = minorUnits / 100n;
  const fraction = (minorUnits % 100n).toString().padStart(2, "0");
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${whole.toLocaleString("en-NG")}.${fraction}`;
}

export function nairaToMinorUnits(naira: number): number {
  return Math.round(naira * 100);
}
