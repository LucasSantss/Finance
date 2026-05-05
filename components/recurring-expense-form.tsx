"use client";

import { useState } from "react";
import { createRecurringExpense, deleteRecurringExpense } from "@/lib/actions";
import { RepeatIcon, Plus, Trash2, X, Check } from "lucide-react";

type RecurringExpense = {
  id: string;
  description: string;
  amount: unknown;
  category: string;
  dayOfMonth: number;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
};

const CATEGORIES = ["Moradia", "Transporte", "Alimentação", "Saúde", "Educação", "Lazer", "Assinaturas", "Outros"];

export function RecurringExpenseForm({ expenses }: { expenses: RecurringExpense[] }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "Assinaturas", dayOfMonth: "1", startDate: "", endDate: "" });

  const isSubscription = form.category === "Assinaturas";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (d: Date) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  };

  async function handleAdd() {
    setLoading(true);
    setError("");
    if (!form.startDate) {
      setError("Data de início obrigatória");
      setLoading(false);
      return;
    }
    const result = await createRecurringExpense({
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      dayOfMonth: parseInt(form.dayOfMonth),
      startDate: form.startDate ? form.startDate + "-01" : "",
      endDate: isSubscription ? undefined : (form.endDate ? form.endDate + "-28" : undefined),
    });
    setLoading(false);
    if (result.ok) {
      setAdding(false);
      setForm({ description: "", amount: "", category: "Assinaturas", dayOfMonth: "1", startDate: "", endDate: "" });
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    await deleteRecurringExpense(id);
  }

  const active = expenses.filter((e) => !e.endDate || new Date(e.endDate) >= new Date());
  const ended = expenses.filter((e) => e.endDate && new Date(e.endDate) < new Date());

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <RepeatIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Despesas recorrentes</h2>
            <p className="text-xs text-muted-foreground">Debitadas automático todo mês</p>
          </div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {adding && (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <label className="text-xs text-muted-foreground">Descrição</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Netflix"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Valor (R$)</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Dia do mês</label>
              <input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoria</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Início</label>
              <input
                type="month"
                lang="pt-BR"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            {isSubscription ? (
              <div className="space-y-1 flex flex-col justify-end">
                <label className="text-xs text-muted-foreground">Término</label>
                <div className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Contínua (sem fim)
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Término</label>
                <input
                  type="month"
                  lang="pt-BR"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Check className="h-3.5 w-3.5" />
              {loading ? "Salvando..." : "Adicionar"}
            </button>
            <button onClick={() => setAdding(false)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {active.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma despesa recorrente. Clique em + para adicionar.</p>
        )}
        {active.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{e.description}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(Number(e.amount))} · dia {e.dayOfMonth} · {e.endDate ? `até ${fmtDate(e.endDate)}` : "Contínua"}
              </p>
            </div>
            <button onClick={() => handleDelete(e.id)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {ended.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              {ended.length} encerrada{ended.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 space-y-2 opacity-50">
              {ended.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground line-through">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{fmt(Number(e.amount))} · encerrou {e.endDate ? fmtDate(e.endDate) : ""}</p>
                  </div>
                  <button onClick={() => handleDelete(e.id)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}