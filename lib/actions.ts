"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionInputSchema, type TransactionInput } from "@/lib/schemas";

// ─── Result type ───────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ─── createTransaction ─────────────────────────────────────────────────────

export async function createTransaction(
  input: TransactionInput
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado" };

  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Inválido" };
  }

  const { description, amount, type, category, date } = parsed.data;

  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        description,
        amount,
        type,
        category,
        date: new Date(date),
        source: "manual",
      },
      select: { id: true },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/insights");

    return { ok: true, data: { id: transaction.id } };
  } catch (err) {
    console.error("[createTransaction]", err);
    return { ok: false, error: "Erro ao salvar transação" };
  }
}

// ─── deleteTransaction ─────────────────────────────────────────────────────

export async function deleteTransaction(
  id: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Não autenticado" };

  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!transaction) {
      return { ok: false, error: "Transação não encontrada" };
    }

    await prisma.transaction.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/insights");

    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deleteTransaction]", err);
    return { ok: false, error: "Erro ao excluir transação" };
  }
}

// ─── getTransactions ───────────────────────────────────────────────────────

export async function getTransactions() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 500,
  });
}

// ─── getTransactionStats ───────────────────────────────────────────────────

export async function getTransactionStats() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      income: 0,
      expense: 0,
      balance: 0,
      monthIncome: 0,
      monthExpense: 0,
      monthBalance: 0,
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTime, thisMonth] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: session.user.id },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId: session.user.id,
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
  ]);

  const get = (arr: typeof allTime, type: "INCOME" | "EXPENSE") =>
    Number(arr.find((r) => r.type === type)?._sum.amount ?? 0);

  const income = get(allTime, "INCOME");
  const expense = get(allTime, "EXPENSE");
  const monthIncome = get(thisMonth, "INCOME");
  const monthExpense = get(thisMonth, "EXPENSE");

  return {
    income,
    expense,
    balance: income - expense,
    monthIncome,
    monthExpense,
    monthBalance: monthIncome - monthExpense,
  };
}
