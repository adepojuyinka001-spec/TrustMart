import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  navy: "bg-tm-navy/10 text-tm-navy",
  gold: "bg-tm-gold/20 text-tm-gold",
  green: "bg-emerald-100 text-emerald-700",
  purple: "bg-purple-100 text-purple-700",
};

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "navy",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="tm-card flex items-start justify-between">
      <div>
        <p className="text-sm text-tm-dark/60">{label}</p>
        <p className="mt-1 text-2xl font-bold text-tm-dark">{value}</p>
        {hint && <p className="mt-1 text-xs font-medium text-tm-navy">{hint}</p>}
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>{icon}</span>
    </div>
  );
}
