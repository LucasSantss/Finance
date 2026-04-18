import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTransactions, getTransactionStats } from "@/lib/actions";
import { StatCard } from "@/components/stat-card";
import { MonthlyChart } from "@/components/monthly-chart";
import { TransactionList } from "@/components/transaction-list";
import { TransactionForm } from "@/components/transaction-form";
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";

export const metadata = { title: "Visão Geral" };

// Garante dados sempre frescos no SSR
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [transactions, stats] = await Promise.all([
    getTransactions(),
    getTransactionStats(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Visão geral
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu fluxo financeiro do mês e do histórico.
        </p>
      </header>

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo do mês"
          value={stats.monthBalance}
          icon={Wallet}
          tone={stats.monthBalance >= 0 ? "positive" : "negative"}
          hint="Receitas menos despesas no mês atual"
        />
        <StatCard
          label="Receitas no mês"
          value={stats.monthIncome}
          icon={ArrowUpCircle}
          tone="positive"
        />
        <StatCard
          label="Despesas no mês"
          value={stats.monthExpense}
          icon={ArrowDownCircle}
          tone="negative"
        />
        <StatCard
          label="Saldo total"
          value={stats.balance}
          icon={TrendingUp}
          tone={stats.balance >= 0 ? "positive" : "negative"}
          hint="Considerando todo o histórico"
        />
      </section>

      {/* Chart + Form */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Receitas e despesas
              </h2>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </div>
          </div>
          <MonthlyChart transactions={transactions} />
        </div>

        <div>
          <TransactionForm />
        </div>
      </section>

      {/* Recent transactions */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Movimentações recentes
            </h2>
            <p className="text-xs text-muted-foreground">
              Atualização em tempo real via Server Actions
            </p>
          </div>
        </div>
        <TransactionList transactions={transactions} limit={8} />
      </section>
    </div>
  );
}
