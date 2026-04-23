import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTransactions } from "@/lib/actions";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionListClient } from "@/components/transaction-list-client";

export const metadata = { title: "Transações" };

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const transactions = await getTransactions();

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Transações
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico completo das suas movimentações.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionListClient transactions={transactions} />
        </div>
        <div>
          <TransactionForm />
        </div>
      </div>
    </div>
  );
}
