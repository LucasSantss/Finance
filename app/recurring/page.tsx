import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFixedSalary, getRecurringExpenses, getVaVr, getVaVrMonthBalance } from "@/lib/actions";
import { FixedSalaryForm } from "@/components/fixed-salary-form";
import { RecurringExpenseForm } from "@/components/recurring-expense-form";
import { VaVrForm } from "@/components/va-vr-form";

export const metadata = { title: "Recorrências" };

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const [salary, recurringExpenses, vaVr, vaVrBalance] = await Promise.all([
    getFixedSalary(),
    getRecurringExpenses(),
    getVaVr(),
    getVaVrMonthBalance(now.getFullYear(), now.getMonth()),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Recorrências
        </h1>
        <p className="text-sm text-muted-foreground">
          Salário fixo, VA/VR e despesas automáticas mensais.
        </p>
      </header>

      {/* Receitas fixas */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receitas fixas</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <FixedSalaryForm salary={salary} />
          <VaVrForm vaVr={vaVr} monthBalance={vaVrBalance} />
        </div>
      </section>

      {/* Despesas recorrentes */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Despesas recorrentes</h2>
        <RecurringExpenseForm expenses={recurringExpenses} />
      </section>
    </div>
  );
}
