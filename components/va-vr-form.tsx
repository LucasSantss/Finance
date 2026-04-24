"use client";

import { useState } from "react";
import { upsertVaVr } from "@/lib/actions";
import { UtensilsCrossed, Pencil, Check, X, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";

type VaVr = {
  id: string;
  amount: unknown;
  dayOfMonth: number;
  active: boolean;
} | null;

interface VaVrFormProps {
  vaVr: VaVr;
  monthBalance: { credited: number; spent: number; balance: number };
}

export function VaVrForm({ vaVr, monthBalance }: VaVrFormProps) {
  const [editing, setEditing] = useState(!vaVr);
  const [amount, setAmount] = useState(vaVr ? String(Number(vaVr.amount)) : "");
  const [day, setDay] = useState(String(vaVr?.dayOfMonth ?? 5));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    const result = await upsertVaVr({
      amount: parseFloat(amount),
      dayOfMonth: parseInt(day),
    });
    setLoading(false);
    if (result.ok) setEditing(false);
    else setError(result.error);
  }

  const balancePositive = monthBalance.balance >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">VA / VR</h2>
            <p className="text-xs text-muted-foreground">Vale Alimentação e Refeição</p>
          </div>
        </div>
        {vaVr && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* View mode */}
      {!editing && vaVr ? (
        <div className="space-y-4">
          {/* Valor configurado */}
          <div>
            <p className="text-2xl font-semibold text-foreground">
              {formatBRL(Number(vaVr.amount))}
            </p>
            <p className="text-xs text-muted-foreground">
              Creditado todo dia {vaVr.dayOfMonth}
            </p>
          </div>

          {/* Saldo do mês */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Saldo do mês</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {/* Creditado */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Crédito</span>
                </div>
                <p className="text-sm font-semibold text-emerald-500">
                  {formatBRL(monthBalance.credited)}
                </p>
              </div>

              {/* Gasto */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-[10px] text-muted-foreground">Gasto</span>
                </div>
                <p className="text-sm font-semibold text-red-500">
                  {formatBRL(monthBalance.spent)}
                </p>
              </div>

              {/* Saldo */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-center gap-1">
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Saldo</span>
                </div>
                <p className={cn(
                  "text-sm font-semibold",
                  balancePositive ? "text-emerald-500" : "text-red-500"
                )}>
                  {formatBRL(monthBalance.balance)}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            {monthBalance.credited > 0 && (
              <div className="mt-1">
                <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      balancePositive ? "bg-emerald-500" : "bg-red-500"
                    )}
                    style={{
                      width: `${Math.min(100, (monthBalance.spent / monthBalance.credited) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {Math.round((monthBalance.spent / monthBalance.credited) * 100)}% utilizado
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total VA+VR (R$)</label>
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
              <label className="text-xs text-muted-foreground">Dia do crédito</label>
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
          <p className="text-xs text-muted-foreground">
            Use a categoria <span className="font-medium text-foreground">VA/VR</span> nas despesas para rastrear seus gastos separadamente.
          </p>
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
            {vaVr && (
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
