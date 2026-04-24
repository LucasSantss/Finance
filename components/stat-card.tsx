import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warning";
  hint?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
              tone === "positive" && "text-success",
              tone === "negative" && "text-destructive",
              tone === "warning" && "text-orange-500",
              tone === "neutral" && "text-foreground"
            )}
          >
            {formatBRL(value)}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            tone === "positive" && "bg-success/10 text-success",
            tone === "negative" && "bg-destructive/10 text-destructive",
            tone === "warning" && "bg-orange-500/10 text-orange-500",
            tone === "neutral" && "bg-muted text-foreground"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
      </div>
    </div>
  );
}
