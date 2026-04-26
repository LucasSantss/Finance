import { ArrowUpRight, ArrowDownLeft, PiggyBank } from "lucide-react";
import { cn, formatBRL, formatDate } from "@/lib/utils";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import type { Transaction } from "@prisma/client";

interface TransactionListProps {
  transactions: Transaction[];
  limit?: number;
}

export function TransactionList({ transactions, limit }: TransactionListProps) {
  const items = limit ? transactions.slice(0, limit) : transactions;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma transação ainda. Adicione a primeira ao lado.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((t) => {
        const isIncome = t.type === "INCOME";
        return (
          <li
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 transition-opacity"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                t.category === "VA/VR"
                  ? "bg-orange-500/10 text-orange-500"
                  : t.category === "Cofre"
                    ? "bg-violet-500/10 text-violet-500"
                    : isIncome
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
              )}
            >
              {t.category === "Cofre" ? (
                <PiggyBank className="h-4 w-4" />
              ) : isIncome ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownLeft className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {t.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.category} · {formatDate(t.date)}
                {t.source !== "manual" && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    {t.source}
                  </span>
                )}
              </p>
            </div>

            <div
              className={cn(
                "shrink-0 text-sm font-semibold tabular-nums",
                t.category === "VA/VR" ? "text-orange-500" : t.category === "Cofre" ? "text-violet-500" : isIncome ? "text-success" : "text-foreground"
              )}
            >
              {isIncome ? "+" : "−"} {formatBRL(Number(t.amount))}
            </div>

            <DeleteTransactionButton id={t.id} />
          </li>
        );
      })}
    </ul>
  );
}
