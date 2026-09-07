import { statusBadgeClass } from "../lib/status-colors";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`tm-badge ${statusBadgeClass(status)}`}>{status.replace(/_/g, " ")}</span>;
}
