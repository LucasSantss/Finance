import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatBRL, cn } from "@/lib/utils";

interface AccumulativeCardProps {
    totalIncome: number;
    totalExpense: number;
    totalBalance: number;
    totalVaVrBalance?: number;
}

export function AccumulativeCard({
    totalIncome,
    totalExpense,
    totalBalance,
    totalVaVrBalance,
}: AccumulativeCardProps) {
    const isPositive = totalBalance >= 0;

    return (
        <div className="rounded-xl border border-border bg-card/50 p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Acumulativo geral
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                <div>
                    <p className="text-[10px] text-muted-foreground">Total recebido</p>
                    <p className="text-sm font-semibold text-success tabular-nums">{formatBRL(totalIncome)}</p>
                </div>
                <div>
                    <p className="text-[10px] text-muted-foreground">Total gasto</p>
                    <p className="text-sm font-semibold text-destructive tabular-nums">{formatBRL(totalExpense)}</p>
                </div>
                {totalVaVrBalance !== undefined && (
                    <div>
                        <p className="text-[10px] text-muted-foreground">Saldo VA/VR acum.</p>
                        <p className={cn(
                            "text-sm font-semibold tabular-nums",
                            totalVaVrBalance >= 0 ? "text-orange-500" : "text-destructive"
                        )}>
                            {formatBRL(totalVaVrBalance)}
                        </p>
                    </div>
                )}
                <div className="flex items-end gap-1.5">
                    <div>
                        <p className="text-[10px] text-muted-foreground">Saldo acumulado</p>
                        <p className={cn(
                            "text-sm font-bold tabular-nums",
                            isPositive ? "text-success" : "text-destructive"
                        )}>
                            {formatBRL(totalBalance)}
                        </p>
                    </div>
                    {isPositive
                        ? <TrendingUp className="h-3.5 w-3.5 text-success mb-0.5" />
                        : <TrendingDown className="h-3.5 w-3.5 text-destructive mb-0.5" />
                    }
                </div>
            </div>
        </div>
    );
}