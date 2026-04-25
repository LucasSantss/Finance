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
      incomeGeral: number;
      expenseGeral: number;
      balanceGeral: number;
      incomeVaVr: number;
      expenseVaVr: number;
      balanceVaVr: number;
    }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthLabel(d),
        incomeGeral: 0,
        expenseGeral: 0,
        balanceGeral: 0,
        incomeVaVr: 0,
        expenseVaVr: 0,
        balanceVaVr: 0,
      });
    }

    const idx = new Map(months.map((m, i) => [m.key, i]));

    for (const t of transactions) {
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i === undefined) continue;

      const v = Number(t.amount);
      const isVaVr = t.category === "VA/VR";

      if (isVaVr) {
        if (t.type === "INCOME") months[i].incomeVaVr += v;
        else months[i].expenseVaVr += v;
      } else {
        if (t.type === "INCOME") months[i].incomeGeral += v;
        else months[i].expenseGeral += v;
      }
    }

    for (const m of months) {
      m.balanceGeral = m.incomeGeral - m.expenseGeral;
      m.balanceVaVr = m.incomeVaVr - m.expenseVaVr;
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
            dataKey="expenseGeral"
            name="Despesas"
            stackId="geral"
            fill="hsl(var(--chart-2))"
            maxBarSize={32}
          />
          <Bar
            dataKey="balanceGeral"
            name="Saldo Geral"
            stackId="geral"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="expenseVaVr"
            name="Despesas VA/VR"
            stackId="vavr"
            fill="hsl(var(--chart-2))"
            opacity={0.8}
            maxBarSize={32}
          />
          <Bar
            dataKey="balanceVaVr"
            name="Saldo VA/VR"
            stackId="vavr"
            fill="hsl(var(--chart-4))"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}