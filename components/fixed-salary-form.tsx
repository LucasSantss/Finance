"use client";

import { useState } from "react";
import { upsertFixedSalary } from "@/lib/actions";
import { DollarSign, Pencil, Check, X } from "lucide-react";

type FixedSalary = {
  id: string;
  amount: unknown;
  description: string;
  dayOfMonth: number;
  active: boolean;
} | null;

export function FixedSalaryForm({ salary }: { salary: FixedSalary }) {
  const [editing, setEditing] = useState(!salary);
  const [amount, setAmount] = useState(salary ? String(Number(salary.amount)) : "");
  const [description, setDescription] = useState(salary?.description ?? "Salário");
  const [day, setDay] = useState(String(salary?.dayOfMonth ?? 5));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    const result = await upsertFixedSalary({
      amount: parseFloat(amount),
      description,
      dayOfMonth: parseInt(day),
    });
    setLoading(false);
    if (result.ok) setEditing(false);
    else setError(result.error);
  }

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Salário fixo</h2>
            <p className="text-xs text-muted-foreground">Entra automático todo mês</p>
          </div>
        </div>
        {salary && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {!editing && salary ? (
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-foreground">
            {fmt(Number(salary.amount))}
          </p>
          <p className="text-xs text-muted-foreground">
            {salary.description} · todo dia {salary.dayOfMonth}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Descrição</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Valor (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Dia do mês</label>
              <input
                type="number"
                min="1"
                max="28"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              {loading ? "Salvando..." : "Salvar"}
            </button>
            {salary && (
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
