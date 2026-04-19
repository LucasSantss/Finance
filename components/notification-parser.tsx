"use client";

import { useState } from "react";
import { createTransaction } from "@/lib/actions";
import { BellIcon, Loader2, Check, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn, EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayISO } from "@/lib/utils";
import { toast } from "sonner";

type ParsedTransaction = {
    description: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
    category: string;
    date: string;
    confidence: number;
    bank: string | null;
};

const BANK_COLORS: Record<string, string> = {
    nubank: "bg-purple-500/10 text-purple-400",
    itaú: "bg-orange-500/10 text-orange-400",
    bradesco: "bg-red-500/10 text-red-400",
    inter: "bg-orange-400/10 text-orange-300",
    c6: "bg-zinc-400/10 text-zinc-300",
};

function bankColor(bank: string | null) {
    if (!bank) return "bg-muted text-muted-foreground";
    const key = Object.keys(BANK_COLORS).find((k) => bank.toLowerCase().includes(k));
    return key ? BANK_COLORS[key] : "bg-muted text-muted-foreground";
}

export function NotificationParser() {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
    const [error, setError] = useState("");

    // Campos editáveis após parse
    const [editDesc, setEditDesc] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editType, setEditType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
    const [editCategory, setEditCategory] = useState("");
    const [editDate, setEditDate] = useState("");

    async function handleParse() {
        if (!text.trim()) return;
        setParsing(true);
        setError("");
        setParsed(null);

        try {
            const res = await fetch("/api/parse-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error ?? "Não foi possível interpretar a notificação");
                return;
            }

            setParsed(data);
            setEditDesc(data.description);
            setEditAmount(String(data.amount));
            setEditType(data.type);
            setEditCategory(data.category);
            setEditDate(data.date);
        } catch {
            setError("Erro de conexão");
        } finally {
            setParsing(false);
        }
    }

    async function handleSave() {
        if (!parsed) return;
        setSaving(true);

        const result = await createTransaction({
            description: editDesc,
            amount: parseFloat(editAmount),
            type: editType,
            category: editCategory,
            date: new Date(editDate).toISOString(),
        });

        setSaving(false);

        if (result.ok) {
            toast.success("Transação registrada com sucesso!");
            setText("");
            setParsed(null);
            setError("");
            setOpen(false);
        } else {
            toast.error(result.error);
        }
    }

    function handleDiscard() {
        setParsed(null);
        setError("");
        setText("");
    }

    const categories = editType === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return (
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            {/* Header — clicável para expandir/recolher */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BellIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-foreground">Notificação do banco</h2>
                        <p className="text-xs text-muted-foreground">Cole o texto e a IA extrai os dados</p>
                    </div>
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    {/* Exemplos */}
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            "Nubank: Compra de R$ 45,90 no iFood aprovada",
                            "Itaú: PIX recebido de João R$ 200,00",
                            "Inter: Débito de R$ 89,90 - Netflix",
                        ].map((ex) => (
                            <button
                                key={ex}
                                onClick={() => setText(ex)}
                                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                            >
                                {ex.slice(0, 30)}…
                            </button>
                        ))}
                    </div>

                    {/* Textarea */}
                    <div className="space-y-2">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Cole aqui o texto da notificação do banco..."
                            rows={3}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                        <button
                            onClick={handleParse}
                            disabled={parsing || !text.trim()}
                            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                        >
                            {parsing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            {parsing ? "Interpretando..." : "Interpretar com IA"}
                        </button>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Resultado editável */}
                    {parsed && (
                        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", bankColor(parsed.bank))}>
                                        {parsed.bank ?? "Banco"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {Math.round(parsed.confidence * 100)}% confiança
                                    </span>
                                </div>
                            </div>

                            {/* Tipo */}
                            <div className="grid grid-cols-2 gap-2">
                                {(["EXPENSE", "INCOME"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => { setEditType(t); setEditCategory(""); }}
                                        className={cn(
                                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                                            editType === t
                                                ? t === "EXPENSE"
                                                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                                                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                                : "border-border text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        {t === "EXPENSE" ? "💸 Despesa" : "💰 Receita"}
                                    </button>
                                ))}
                            </div>

                            {/* Descrição */}
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Descrição</label>
                                <input
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Valor */}
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Valor (R$)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                {/* Data */}
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Data</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Categoria */}
                            <div className="space-y-1">
                                <label className="text-xs text-muted-foreground">Categoria</label>
                                <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {categories.map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Ações */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    {saving ? "Salvando..." : "Confirmar transação"}
                                </button>
                                <button
                                    onClick={handleDiscard}
                                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                    Descartar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
