import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  navy: "bg-primary/10 text-primary",
  pitch: "bg-pitch-soft text-pitch",
  gold: "bg-gold-soft text-gold-foreground",
  red: "bg-destructive/10 text-destructive",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone])}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-semibold leading-tight">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
