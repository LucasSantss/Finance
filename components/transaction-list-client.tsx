"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { TransactionList } from "@/components/transaction-list";
import type { Transaction } from "@prisma/client";

interface TransactionListClientProps {
  transactions: Transaction[];
}

export function TransactionListClient({ transactions }: TransactionListClientProps) {
  const [type, setType] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        if (
          !t.description.toLowerCase().includes(s) &&
          !t.category.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [transactions, type, q]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar por descrição ou categoria"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="flex h-9 w-full sm:w-44 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">Todos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </select>
      </div>

      <TransactionList transactions={filtered} />
    </div>
  );
}
