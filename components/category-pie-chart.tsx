"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { formatBRL } from "@/lib/utils";
import type { Transaction } from "@prisma/client";

interface Props {
  transactions: Transaction[];
  fixedSalary: number;
  fixedVaVr: number;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const VAVR_COLORS = ["#f97316", "#fb923c", "#fdba74"];

function PieSection({
  data,
  colors,
  emptyMessage,
  fixedAmount,
  fixedLabel,
}: {
  data: { name: string; value: number }[];
  colors: string[];
  emptyMessage: string;
  fixedAmount?: number;
  fixedLabel?: string;
}) {
  const totalSpent = data.reduce((s, d) => s + d.value, 0);
  const remaining = fixedAmount ? Math.max(fixedAmount - totalSpent, 0) : 0;
  const over = fixedAmount ? Math.max(totalSpent - fixedAmount, 0) : 0;

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div>
      {fixedAmount ? (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">{fixedLabel} fixo</span>
          <span className="font-semibold text-foreground">{formatBRL(fixedAmount)}</span>
          <span className="text-muted-foreground">Gasto</span>
          <span className={`font-semibold ${over > 0 ? "text-red-500" : "text-foreground"}`}>
            {formatBRL(totalSpent)}
          </span>
          {remaining > 0 ? (
            <>
              <span className="text-muted-foreground">Restante</span>
              <span className="font-semibold text-emerald-500">{formatBRL(remaining)}</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Excedido</span>
              <span className="font-semibold text-red-500">{formatBRL(over)}</span>
            </>
          )}
        </div>
      ) : null}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(v: number) => [formatBRL(v)]}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryPieChart({ transactions, fixedSalary, fixedVaVr }: Props) {
  const { generalData, vaVrData } = useMemo(() => {
    const generalMap = new Map<string, number>();
    const vaVrMap = new Map<string, number>();

    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      if (t.category === "VA/VR") {
        vaVrMap.set(t.category, (vaVrMap.get(t.category) ?? 0) + Number(t.amount));
      } else {
        generalMap.set(t.category, (generalMap.get(t.category) ?? 0) + Number(t.amount));
      }
    }

    return {
      generalData: [...generalMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      vaVrData: [...vaVrMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Despesas gerais
        </h3>
        <PieSection
          data={generalData}
          colors={COLORS}
          emptyMessage="Sem despesas gerais registradas."
          fixedAmount={fixedSalary}
          fixedLabel="Salário"
        />
      </div>
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-orange-500">
          VA / VR
        </h3>
        <PieSection
          data={vaVrData}
          colors={VAVR_COLORS}
          emptyMessage="Sem despesas de VA/VR registradas."
          fixedAmount={fixedVaVr}
          fixedLabel="VA/VR"
        />
      </div>
    </div>
  );
}