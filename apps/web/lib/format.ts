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

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(isoDate).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
