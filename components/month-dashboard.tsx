"use client";

import { useState, useTransition, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpCircle, ArrowDownCircle, Wallet, Eye, Receipt, Loader2, PiggyBank } from "lucide-react";
import { getMonthData } from "@/lib/actions";
import { StatCard } from "@/components/stat-card";
import { TransactionList } from "@/components/transaction-list";
import { cn, formatBRL } from "@/lib/utils";

type MonthData = Awaited<ReturnType<typeof getMonthData>>;

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface MonthDashboardProps {
  initialData: MonthData;
  initialYear: number;
  initialMonth: number;
}

export function MonthDashboard({ initialData, initialYear, initialMonth }: MonthDashboardProps) {
  const now = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const loadMonth = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
    startTransition(async () => {
      const d = await getMonthData(y, m);
      setData(d);
    });
  }, []);

  function navigate(dir: -1 | 1) {
    let m = month + dir;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    loadMonth(y, m);
  }

  const isFuture = data.isFuture;

  return (
    <div className="space-y-6">
      {/* Seletor de mês */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-40"
            disabled={isPending}>
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 min-w-[172px] justify-center px-3 h-8 rounded-md border border-border bg-card">
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              : <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            }
            <span className="text-sm font-medium text-foreground">
              {MONTHS[month]} {year}
            </span>
            {isFuture && (
              <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-500 leading-none">
                previsão
              </span>
            )}
            {isCurrentMonth && (
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500 leading-none">
                atual
              </span>
            )}
          </div>

          <button onClick={() => navigate(1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors disabled:opacity-40"
            disabled={isPending}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {!isCurrentMonth && (
          <button onClick={() => loadMonth(now.getFullYear(), now.getMonth())}
            disabled={isPending}
            className="h-8 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40">
            Mês atual
          </button>
        )}
      </div>

      {/* Stats do mês */}
      <div className={cn("transition-opacity duration-150", isPending && "opacity-40 pointer-events-none")}>
        <section className="grid gap-4 sm:grid-cols-3 mb-6">
          <StatCard
            label={isFuture ? "Receitas previstas" : "Receitas do mês"}
            value={data.income} icon={ArrowUpCircle} tone="positive" />
          <StatCard
            label={isFuture ? "Despesas previstas" : "Despesas do mês"}
            value={data.expense} icon={ArrowDownCircle} tone="negative" />
          <StatCard
            label={isFuture ? "Saldo previsto" : "Saldo do mês"}
            value={data.balance} icon={Wallet}
            tone={data.balance >= 0 ? "positive" : "negative"} />
        </section>

        {/* Mês futuro */}
        {isFuture && (
          <div className="space-y-5">
            {data.transactions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Já lançadas em {MONTHS[month]}</h2>
                  <span className="text-xs text-muted-foreground">— transações registradas</span>
                </div>
                <TransactionList transactions={data.transactions} limit={data.transactions.length} />
              </div>
            )}

            {data.recurringPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Faturas previstas</h2>
                  <span className="text-xs text-muted-foreground">— ainda não lançadas</span>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
                  {data.recurringPreview.map((item, i) => (
                    <div key={item.id} className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent/40",
                      i > 0 && "border-t border-border"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold shrink-0",
                          item.type === "INCOME" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {item.type === "INCOME" ? "+" : "−"}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{item.category} · dia {item.dayOfMonth}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-medium tabular-nums text-sm",
                        item.type === "INCOME" ? "text-emerald-500" : "text-red-500"
                      )}>
                        {item.type === "INCOME" ? "+" : "−"}{formatBRL(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {("vaultPreview" in data) && data.vaultPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-violet-500" />
                  <h2 className="text-sm font-semibold text-foreground">Cofres previstos</h2>
                  <span className="text-xs text-muted-foreground">— reservas mensais programadas</span>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-soft">
                  {data.vaultPreview.map((item, i) => (
                    <div key={item.id} className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-accent/40",
                      i > 0 && "border-t border-border"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 text-xs font-semibold shrink-0">
                          <PiggyBank className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground">Cofre · aporte mensal</p>
                        </div>
                      </div>
                      <span className="font-medium tabular-nums text-sm text-violet-500">
                        −{formatBRL(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.transactions.length === 0 && data.recurringPreview.length === 0 && !("vaultPreview" in data && data.vaultPreview.length > 0) && (
              <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                Nenhuma movimentação ou previsão para {MONTHS[month]} {year}.
              </div>
            )}
          </div>
        )}

        {/* Mês passado / atual */}
        {!isFuture && (
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Movimentações de {MONTHS[month]}
              </h2>
              <p className="text-xs text-muted-foreground">
                {data.transactions.length} {data.transactions.length === 1 ? "transação" : "transações"}
              </p>
            </div>
            {data.transactions.length > 0
              ? <TransactionList transactions={data.transactions} limit={data.transactions.length} />
              : <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                Nenhuma movimentação em {MONTHS[month]} {year}.
              </div>
            }
          </section>
        )}
      </div>
    </div>
  );
}