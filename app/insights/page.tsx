import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTransactions } from "@/lib/actions";
import { MonthlyChart } from "@/components/monthly-chart";
import { CategoryPieChart } from "@/components/category-pie-chart";

export const metadata = { title: "Análises" };
export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const transactions = await getTransactions();

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
          Despesas por categoria (histórico)
        </h2>
        <CategoryPieChart transactions={transactions} />
      </div>
    </div>
  );
}
