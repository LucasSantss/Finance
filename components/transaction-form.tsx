"use client";

import { useState, useTransition, useOptimistic } from "react";
import { Plus, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { createTransaction, type TransactionInput } from "@/lib/actions";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, cn, todayISO } from "@/lib/utils";

export function TransactionForm() {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISO);

  const categories = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input: TransactionInput = {
      description,
      amount: Number(amount.replace(",", ".")),
      type,
      category,
      date: new Date(date).toISOString(),
    };

    startTransition(async () => {
      const result = await createTransaction(input);
      if (result.ok) {
        toast.success("Transação registrada");
        setDescription("");
        setAmount("");
        setCategory("");
        setDate(todayISO());
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-5 shadow-soft"
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">Nova transação</h2>
        <p className="text-xs text-muted-foreground">
          Registre uma entrada ou saída.
        </p>
      </div>

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setType("EXPENSE"); setCategory(""); }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
            type === "EXPENSE"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-background text-muted-foreground hover:bg-accent"
          )}
        >
          <ArrowDownCircle className="h-4 w-4" />
          Despesa
        </button>
        <button
          type="button"
          onClick={() => { setType("INCOME"); setCategory(""); }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
            type === "INCOME"
              ? "border-success/40 bg-success/10 text-success"
              : "border-border bg-background text-muted-foreground hover:bg-accent"
          )}
        >
          <ArrowUpCircle className="h-4 w-4" />
          Receita
        </button>
      </div>

      <div className="grid gap-3">
        {/* Description */}
        <div className="grid gap-1.5">
          <label htmlFor="description" className="text-xs font-medium text-foreground">
            Descrição
          </label>
          <input
            id="description"
            placeholder="Ex.: Mercado da semana"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="amount" className="text-xs font-medium text-foreground">
              Valor (R$)
            </label>
            <input
              id="amount"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="date" className="text-xs font-medium text-foreground">
              Data
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Category */}
        <div className="grid gap-1.5">
          <label htmlFor="category" className="text-xs font-medium text-foreground">
            Categoria
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="" disabled>
              Selecione
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar
        </button>
      </div>
    </form>
  );
}
