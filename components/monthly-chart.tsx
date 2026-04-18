"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatBRL, monthLabel } from "@/lib/utils";
import type { Transaction } from "@prisma/client";

interface Props {
  transactions: Transaction[];
}

export function MonthlyChart({ transactions }: Props) {
  const data = useMemo(() => {
    const months: {
      key: string;
      label: string;
      income: number;
      expense: number;
    }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthLabel(d),
        income: 0,
        expense: 0,
      });
    }

    const idx = new Map(months.map((m, i) => [m.key, i]));

    for (const t of transactions) {
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i === undefined) continue;
      const v = Number(t.amount);
      if (t.type === "INCOME") months[i].income += v;
      else months[i].expense += v;
    }

    return months;
  }, [transactions]);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(v as number)
            }
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: number) => [formatBRL(v)]}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
          />
          <Bar
            dataKey="income"
            name="Receitas"
            fill="hsl(var(--chart-1))"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="expense"
            name="Despesas"
            fill="hsl(var(--chart-2))"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
