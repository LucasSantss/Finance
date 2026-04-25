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
}: {
  data: { name: string; value: number }[];
  colors: string[];
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
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
  );
}

export function CategoryPieChart({ transactions }: Props) {
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
        />
      </div>
    </div>
  );
}