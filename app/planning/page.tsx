import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMonthData, getAccumulativeUpTo } from "@/lib/actions";
import { MonthDashboard } from "@/components/month-dashboard";

export const metadata = { title: "Planejamento" };

export default async function PlanningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const [initialData, initialAccumulative] = await Promise.all([
    getMonthData(year, month),
    getAccumulativeUpTo(year, month),
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
      <MonthDashboard
        initialData={initialData}
        initialYear={year}
        initialMonth={month}
        initialAccumulative={initialAccumulative}
      />
    </div>
  );
}