import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMonthData, getTransactionStats } from "@/lib/actions";
import { MonthDashboard } from "@/components/month-dashboard";
import { AccumulativeCard } from "@/components/accumulative-card";

export const metadata = { title: "Planejamento" };

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const [initialData, stats] = await Promise.all([
    getMonthData(year, month),
    getTransactionStats(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Planejamento
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico de meses anteriores e previsão dos próximos.
        </p>
      </header>
      <AccumulativeCard
        totalIncome={stats.income}
        totalExpense={stats.expense}
        totalBalance={stats.balance}
      />
      <MonthDashboard
        initialData={initialData}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}