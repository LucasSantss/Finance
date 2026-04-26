"use client";

import { deleteVault, createVault } from "@/lib/actions";
import { useState, useTransition } from "react";
import { PiggyBank, Trash2, Plus, X, Check, Loader2 } from "lucide-react";

type Vault = {
  id: string;
  name: string;
  monthlyAmount: unknown;
  targetDate: Date;
  startDate: Date;
  active: boolean;
  savedAmount?: number;
};

function calcVault(vault: Vault) {
  const now = new Date();
  const start = new Date(vault.startDate);
  const target = new Date(vault.targetDate);

  // Total de meses incluindo o inicial e o final
  const totalMonths = Math.max(1,
    (target.getFullYear() - start.getFullYear()) * 12 +
    (target.getMonth() - start.getMonth()) + 1
  );

  const elapsedMonths = Math.max(0,
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) + 1
  );

  const monthly = Number(vault.monthlyAmount);
  // Se tivermos o valor real do banco, usamos ele. Caso contrário, usamos a estimativa.
  const saved = vault.savedAmount !== undefined ? vault.savedAmount : Math.min(elapsedMonths, totalMonths) * monthly;
  const total = totalMonths * monthly;
  const progress = total > 0 ? Math.min(100, (saved / total) * 100) : 0;
  const remaining = Math.max(0, totalMonths - elapsedMonths);

  return { saved, total, progress, remaining, totalMonths };
}

export function VaultCard({ vault }: { vault: Vault }) {
  const [isDeleting, startTransition] = useTransition();
  const { saved, total, progress, remaining } = calcVault(vault);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir o cofre "${vault.name}"? As reservas deste mês serão estornadas.`)) return;
    
    startTransition(async () => {
      await deleteVault(vault.id);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <PiggyBank className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{vault.name}</p>
            <p className="text-xs text-muted-foreground">
              {fmt(Number(vault.monthlyAmount))}/mês · {remaining} {remaining === 1 ? "mês" : "meses"} restantes
            </p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmt(saved)} guardados</span>
          <span>{fmt(total)} total</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-right text-muted-foreground">{progress.toFixed(0)}%</p>
      </div>
    </div>
  );
}

export function VaultCreateButton() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", monthlyAmount: "", targetDate: "", dayOfMonth: "5" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    const result = await createVault({
      name: form.name,
      monthlyAmount: parseFloat(form.monthlyAmount),
      targetDate: form.targetDate + "-28",
      dayOfMonth: parseInt(form.dayOfMonth),
    });
    setLoading(false);
    if (result.ok) {
      setOpen(false);
      setForm({ name: "", monthlyAmount: "", targetDate: "", dayOfMonth: "5" });
    } else {
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card p-5 shadow-soft text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors w-full"
      >
        <Plus className="h-4 w-4" />
        Novo cofre
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
          <PiggyBank className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-foreground">Novo cofre</p>
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nome do objetivo</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Viagem para Europa"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Valor/mês (R$)</label>
            <input type="number" min="0" step="0.01" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
              placeholder="0,00"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Dia do débito</label>
            <input type="number" min="1" max="28" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div className="space-y-1 mt-2">
          <label className="text-xs text-muted-foreground">Meta até</label>
          <input type="month" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={loading}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
          <Check className="h-3.5 w-3.5" />
          {loading ? "Criando..." : "Criar cofre"}
        </button>
        <button onClick={() => setOpen(false)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}