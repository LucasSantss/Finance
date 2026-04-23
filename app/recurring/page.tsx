import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFixedSalary, getRecurringExpenses } from "@/lib/actions";
import { FixedSalaryForm } from "@/components/fixed-salary-form";
import { RecurringExpenseForm } from "@/components/recurring-expense-form";

export const metadata = { title: "Recorrências" };

export default async function RecurringPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [salary, recurringExpenses] = await Promise.all([
    getFixedSalary(),
    getRecurringExpenses(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Recorrências
        </h1>
        <p className="text-sm text-muted-foreground">
          Salário fixo e despesas automáticas mensais.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <FixedSalaryForm salary={salary} />
        <RecurringExpenseForm expenses={recurringExpenses} />
      </div>
    </div>
  );
}
