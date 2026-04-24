import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getTransactions,
  getTransactionStats,
  getFixedSalary,
  getRecurringExpenses,
  getVaults,
  getVaVr,
  getVaVrMonthBalance,
  processFixedSalaryForCurrentMonth,
  processRecurringExpensesForCurrentMonth,
  processVaultsForCurrentMonth,
  processVaVrForCurrentMonth,
} from "@/lib/actions";
import { StatCard } from "@/components/stat-card";
import { MonthlyChart } from "@/components/monthly-chart";
import { TransactionForm } from "@/components/transaction-form";
import { FixedSalaryForm } from "@/components/fixed-salary-form";
import { RecurringExpenseForm } from "@/components/recurring-expense-form";
import { VaultCard, VaultCreateButton } from "@/components/vault-card";
import { VaVrForm } from "@/components/va-vr-form";
import { NotificationParser } from "@/components/notification-parser";
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";

export const metadata = { title: "Visão Geral" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await Promise.all([
    processFixedSalaryForCurrentMonth(),
    processRecurringExpensesForCurrentMonth(),
    processVaultsForCurrentMonth(),
    processVaVrForCurrentMonth(),
  ]);

  const now = new Date();
  const [transactions, stats, salary, recurringExpenses, vaults, vaVr, vaVrBalance] = await Promise.all([
    getTransactions(),
    getTransactionStats(),
    getFixedSalary(),
    getRecurringExpenses(),
    getVaults(),
    getVaVr(),
    getVaVrMonthBalance(new Date().getFullYear(), new Date().getMonth()),
  ]);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Cabeçalho */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seu fluxo financeiro do mês e do histórico.</p>
      </header>

      {/* Stats globais */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Saldo do mês" value={stats.monthBalance} icon={Wallet}
          tone={stats.monthBalance >= 0 ? "positive" : "negative"} hint="Receitas menos despesas no mês atual" />
        <StatCard label="Receitas no mês" value={stats.monthIncome} icon={ArrowUpCircle} tone="positive" />
        <StatCard label="Despesas no mês" value={stats.monthExpense} icon={ArrowDownCircle} tone="negative" />
        <StatCard label="Saldo total" value={stats.balance} icon={TrendingUp}
          tone={stats.balance >= 0 ? "positive" : "negative"} hint="Considerando todo o histórico" />
      </section>

      {/* Gráfico + Formulário */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">Receitas e despesas</h2>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </div>
          <MonthlyChart transactions={transactions} />
        </div>
        <div><TransactionForm /></div>
      </section>

      {/* Cofres */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cofres</h2>
          <p className="text-xs text-muted-foreground">Metas de poupança com prazo definido</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vaults.map((vault) => <VaultCard key={vault.id} vault={vault} />)}
          <VaultCreateButton />
        </div>
      </section>

      {/* Divisor */}

      {/* Notificação */}
      <NotificationParser />

      {/* Automações */}
      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receitas fixas</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <FixedSalaryForm salary={salary} />
          <VaVrForm vaVr={vaVr} monthBalance={vaVrBalance} />
        </div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Despesas recorrentes</h2>
        <RecurringExpenseForm expenses={recurringExpenses} />
      </section>
    </div>
  );
}
