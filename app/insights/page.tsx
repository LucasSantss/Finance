import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getTransactions,
  getFixedSalary,
  getVaVr,
  getMonthData,
  processFixedSalaryForCurrentMonth,
  processRecurringExpensesForCurrentMonth,
  processVaultsForCurrentMonth,
  processVaVrForCurrentMonth,
} from "@/lib/actions";
import { MonthlyChart } from "@/components/monthly-chart";
import { CategoryPieChart } from "@/components/category-pie-chart";

export const metadata = { title: "Análises" };

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await Promise.all([
    processFixedSalaryForCurrentMonth(),
    processRecurringExpensesForCurrentMonth(),
    processVaultsForCurrentMonth(),
    processVaVrForCurrentMonth(),
  ]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [transactions, salary, vaVr, monthData] = await Promise.all([
    getTransactions(),
    getFixedSalary(),
    getVaVr(),
    getMonthData(year, month),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Análises
        </h1>
        <p className="text-sm text-muted-foreground">
          Onde seu dinheiro está indo.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Fluxo dos últimos 6 meses
        </h2>
        <MonthlyChart transactions={transactions} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Despesas por categoria (mês atual)
        </h2>
        <CategoryPieChart
          transactions={monthData.transactions}
          fixedSalary={salary ? Number(salary.amount) : 0}
          fixedVaVr={vaVr ? Number(vaVr.amount) : 0}
        />
      </div>
    </div>
  );
}