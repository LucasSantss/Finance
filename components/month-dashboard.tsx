"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpCircle, ArrowDownCircle, Wallet, Eye, Receipt } from "lucide-react";
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

  function navigate(dir: -1 | 1) {
    let m = month + dir;
    let y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setYear(y);
    setMonth(m);
    startTransition(async () => {
      const d = await getMonthData(y, m);
      setData(d);
    });
  }

  function goToToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    startTransition(async () => {
      const d = await getMonthData(now.getFullYear(), now.getMonth());
      setData(d);
    });
  }

  const isFuture = data.isFuture;

  return (
    <div className={cn("space-y-6 transition-opacity duration-200", isPending && "opacity-50")}>

      {/* Seletor de mês */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 min-w-[160px] justify-center">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {MONTHS[month]} {year}
          </span>
          {isFuture && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-500">
              previsão
            </span>
          )}
          {isCurrentMonth && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
              atual
            </span>
          )}
        </div>

        <button onClick={() => navigate(1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>

        {!isCurrentMonth && (
          <button onClick={goToToday}
            className="ml-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            Hoje
          </button>
        )}
      </div>

      {/* Cards de stats do mês selecionado */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={isFuture ? "Receitas previstas" : "Receitas do mês"}
          value={data.income}
          icon={ArrowUpCircle}
          tone="positive"
        />
        <StatCard
          label={isFuture ? "Despesas previstas" : "Despesas do mês"}
          value={data.expense}
          icon={ArrowDownCircle}
          tone="negative"
        />
        <StatCard
          label={isFuture ? "Saldo previsto" : "Saldo do mês"}
          value={data.balance}
          icon={Wallet}
          tone={data.balance >= 0 ? "positive" : "negative"}
        />
      </section>

      {/* Mês futuro: transações já lançadas + recorrências pendentes */}
      {isFuture && (
        <section className="space-y-4">
          {/* Transações já lançadas no mês futuro */}
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

          {/* Recorrências ainda pendentes */}
          {data.recurringPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Faturas previstas</h2>
                <span className="text-xs text-muted-foreground">— ainda não lançadas</span>
              </div>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {data.recurringPreview.map((item, i) => (
                  <div key={item.id} className={cn(
                    "flex items-center justify-between px-4 py-3 text-sm",
                    i > 0 && "border-t border-border"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                        item.type === "INCOME" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {item.type === "INCOME" ? "+" : "-"}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.category} · dia {item.dayOfMonth}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-medium tabular-nums",
                      item.type === "INCOME" ? "text-emerald-500" : "text-red-500"
                    )}>
                      {item.type === "INCOME" ? "+" : "-"}{formatBRL(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.transactions.length === 0 && data.recurringPreview.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhuma movimentação ou previsão para {MONTHS[month]} {year}.
            </div>
          )}
        </section>
      )}

      {/* Transações do mês (passado/atual) */}
      {!isFuture && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Movimentações de {MONTHS[month]}
            </h2>
            <p className="text-xs text-muted-foreground">
              {data.transactions.length} {data.transactions.length === 1 ? "transação" : "transações"} no mês
            </p>
          </div>
          {data.transactions.length > 0
            ? <TransactionList transactions={data.transactions} limit={data.transactions.length} />
            : <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhuma movimentação em {MONTHS[month]} {year}.
            </div>
          }
        </section>
      )}
    </div>
  );
}