// Shared status -> Tailwind badge color mapping so every list/detail page renders
// statuses consistently.
const PALETTE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  WON: "bg-emerald-100 text-emerald-800",
  QUALIFIED: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  CHECKING: "bg-blue-100 text-blue-800",
  TERMS_PROPOSED: "bg-amber-100 text-amber-800",
  NEGOTIATING: "bg-amber-100 text-amber-800",
  EXPIRING: "bg-amber-100 text-amber-800",
  PENDING: "bg-amber-100 text-amber-800",
  NEW: "bg-blue-100 text-blue-800",
  VIEWED: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-indigo-100 text-indigo-800",
  INSPECTION_SCHEDULED: "bg-indigo-100 text-indigo-800",
  TRANSACTION_STARTED: "bg-purple-100 text-purple-800",
  SOLD: "bg-tm-gold/20 text-tm-dark",
  EXPIRED: "bg-gray-100 text-gray-500",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
  DECLINED: "bg-red-100 text-red-800",
  LOST: "bg-red-100 text-red-800",
  SPAM_FRAUD: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-gray-100 text-gray-500",
  OPEN: "bg-amber-100 text-amber-800",
  DISMISSED: "bg-gray-100 text-gray-500",
  ACTIONED: "bg-emerald-100 text-emerald-800",
};

export function statusBadgeClass(status: string): string {
  return PALETTE[status] ?? "bg-gray-100 text-gray-700";
}
