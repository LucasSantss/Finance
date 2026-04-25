import { TrendingUp, TrendingDown } from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";

interface SalaryProjection {
  prevBalance: number;
  monthBalance: number;
  total: number;
}

interface VaVrProjection {
  prevBalance: number;
  monthBalance: number;
  total: number;
}

interface AccumulativeCardProps {
  salary: SalaryProjection;
  vaVr: VaVrProjection;
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "positive" | "negative" | "warning" | "neutral" }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn(
        "text-sm font-semibold tabular-nums",
        tone === "positive" && "text-success",
        tone === "negative" && "text-destructive",
        tone === "warning" && "text-orange-500",
        tone === "neutral" && "text-foreground",
      )}>
        {formatBRL(value)}
      </p>
    </div>
  );
}

export function AccumulativeCard({ salary, vaVr }: AccumulativeCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
        Projeção acumulada (mês anterior + mês atual)
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Salário */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Salário</p>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Saldo anterior" value={salary.prevBalance} tone={salary.prevBalance >= 0 ? "positive" : "negative"} />
            <MiniStat label="Saldo do mês" value={salary.monthBalance} tone={salary.monthBalance >= 0 ? "positive" : "negative"} />
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Total projetado</p>
              <div className="flex items-center gap-1">
                <p className={cn(
                  "text-sm font-bold tabular-nums",
                  salary.total >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatBRL(salary.total)}
                </p>
                {salary.total >= 0
                  ? <TrendingUp className="h-3 w-3 text-success" />
                  : <TrendingDown className="h-3 w-3 text-destructive" />
                }
              </div>
            </div>
          </div>
        </div>

        {/* VA/VR */}
        <div className="rounded-lg border border-orange-500/20 bg-card p-3 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">VA / VR</p>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Saldo anterior" value={vaVr.prevBalance} tone={vaVr.prevBalance >= 0 ? "warning" : "negative"} />
            <MiniStat label="Saldo do mês" value={vaVr.monthBalance} tone={vaVr.monthBalance >= 0 ? "warning" : "negative"} />
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Total projetado</p>
              <div className="flex items-center gap-1">
                <p className={cn(
                  "text-sm font-bold tabular-nums",
                  vaVr.total >= 0 ? "text-orange-500" : "text-destructive"
                )}>
                  {formatBRL(vaVr.total)}
                </p>
                {vaVr.total >= 0
                  ? <TrendingUp className="h-3 w-3 text-orange-500" />
                  : <TrendingDown className="h-3 w-3 text-destructive" />
                }
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
