"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transactionInputSchema, type TransactionInput } from "@/lib/schemas";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getSession() {
  const session = await auth();
  return session?.user?.id ? session : null;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/insights");
}

// ── Transações manuais ─────────────────────────────────────────────────────

export async function createTransaction(
  input: TransactionInput
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Inválido" };

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
    revalidateAll();
    return { ok: true, data: { id: transaction.id } };
  } catch (err) {
    console.error("[createTransaction]", err);
    return { ok: false, error: "Erro ao salvar transação" };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    const tx = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!tx) return { ok: false, error: "Transação não encontrada" };

    await prisma.transaction.delete({ where: { id } });
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deleteTransaction]", err);
    return { ok: false, error: "Erro ao excluir transação" };
  }
}

export async function getTransactions() {
  const session = await getSession();
  if (!session) return [];
  return prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 500,
  });
}

export async function getTransactionStats() {
  const session = await getSession();
  if (!session)
    return { income: 0, expense: 0, balance: 0, monthIncome: 0, monthExpense: 0, monthBalance: 0 };

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
      where: { userId: session.user.id, date: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ]);

  const get = (arr: typeof allTime, type: "INCOME" | "EXPENSE") =>
    Number(arr.find((r) => r.type === type)?._sum.amount ?? 0);

  const income = get(allTime, "INCOME");
  const expense = get(allTime, "EXPENSE");
  const monthIncome = get(thisMonth, "INCOME");
  const monthExpense = get(thisMonth, "EXPENSE");

  return { income, expense, balance: income - expense, monthIncome, monthExpense, monthBalance: monthIncome - monthExpense };
}

// ── Stats e transações filtradas por mês ───────────────────────────────────

export async function getMonthData(year: number, month: number) {
  const session = await getSession();
  if (!session)
    return { income: 0, expense: 0, balance: 0, transactions: [], recurringPreview: [] };

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const [stats, transactions, recurringExpenses, salary] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfMonth } },
      orderBy: { date: "desc" },
    }),
    prisma.recurringExpense.findMany({
      where: { userId: session.user.id, active: true, startDate: { lte: endOfMonth }, endDate: { gte: startOfMonth } },
    }),
    prisma.fixedSalary.findUnique({ where: { userId: session.user.id, active: true } }),
  ]);

  const get = (type: "INCOME" | "EXPENSE") =>
    Number(stats.find((r) => r.type === type)?._sum.amount ?? 0);

  const income = get("INCOME");
  const expense = get("EXPENSE");

  // Previsão: despesas recorrentes que ainda não foram lançadas no mês futuro
  const now = new Date();
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const recurringPreview = isFuture
    ? recurringExpenses.map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      category: e.category,
      dayOfMonth: e.dayOfMonth,
      type: "EXPENSE" as const,
    }))
    : [];

  const salaryPreview = isFuture && salary
    ? [{ id: salary.id, description: salary.description, amount: Number(salary.amount), category: "Salário", dayOfMonth: salary.dayOfMonth, type: "INCOME" as const }]
    : [];

  const previewIncome = salaryPreview.reduce((s, i) => s + i.amount, 0);
  const previewExpense = recurringPreview.reduce((s, i) => s + i.amount, 0);

  return {
    income: isFuture ? previewIncome : income,
    expense: isFuture ? previewExpense : expense,
    balance: isFuture ? previewIncome - previewExpense : income - expense,
    transactions,
    recurringPreview: [...salaryPreview, ...recurringPreview],
    isFuture,
  };
}

// ── Salário fixo ───────────────────────────────────────────────────────────

export async function getFixedSalary() {
  const session = await getSession();
  if (!session) return null;
  return prisma.fixedSalary.findUnique({ where: { userId: session.user.id } });
}

export async function upsertFixedSalary(data: {
  amount: number;
  description?: string;
  dayOfMonth?: number;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (data.amount <= 0) return { ok: false, error: "Valor inválido" };

  try {
    await prisma.fixedSalary.upsert({
      where: { userId: session.user.id },
      update: { amount: data.amount, description: data.description ?? "Salário", dayOfMonth: data.dayOfMonth ?? 5, active: true, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), userId: session.user.id, amount: data.amount, description: data.description ?? "Salário", dayOfMonth: data.dayOfMonth ?? 5 },
    });
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[upsertFixedSalary]", err);
    return { ok: false, error: "Erro ao salvar salário" };
  }
}

export async function processFixedSalaryForCurrentMonth(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    const salary = await prisma.fixedSalary.findUnique({ where: { userId: session.user.id, active: true } });
    if (!salary) return { ok: true, data: undefined };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const existing = await prisma.transaction.findFirst({
      where: { userId: session.user.id, source: "fixed_salary", date: { gte: startOfMonth, lte: endOfMonth } },
    });
    if (existing) return { ok: true, data: undefined };

    const salaryDate = new Date(now.getFullYear(), now.getMonth(), Math.min(salary.dayOfMonth, endOfMonth.getDate()));

    await prisma.transaction.create({
      data: { id: crypto.randomUUID(), userId: session.user.id, description: salary.description, amount: salary.amount, type: "INCOME", category: "Salário", source: "fixed_salary", date: salaryDate, createdAt: new Date(), updatedAt: new Date() },
    });

    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[processFixedSalary]", err);
    return { ok: false, error: "Erro ao processar salário" };
  }
}

// ── Despesas recorrentes ───────────────────────────────────────────────────

export async function getRecurringExpenses() {
  const session = await getSession();
  if (!session) return [];
  return prisma.recurringExpense.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
}

export async function createRecurringExpense(data: {
  description: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  startDate: string;
  endDate: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (data.amount <= 0) return { ok: false, error: "Valor inválido" };
  if (!data.description) return { ok: false, error: "Descrição obrigatória" };

  try {
    const expense = await prisma.recurringExpense.create({
      data: { id: crypto.randomUUID(), userId: session.user.id, description: data.description, amount: data.amount, category: data.category, dayOfMonth: data.dayOfMonth, startDate: new Date(data.startDate), endDate: new Date(data.endDate) },
      select: { id: true },
    });
    revalidateAll();
    return { ok: true, data: { id: expense.id } };
  } catch (err) {
    console.error("[createRecurringExpense]", err);
    return { ok: false, error: "Erro ao salvar despesa recorrente" };
  }
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    await prisma.recurringExpense.deleteMany({ where: { id, userId: session.user.id } });
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deleteRecurringExpense]", err);
    return { ok: false, error: "Erro ao excluir despesa" };
  }
}

export async function processRecurringExpensesForCurrentMonth(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expenses = await prisma.recurringExpense.findMany({
      where: { userId: session.user.id, active: true, startDate: { lte: endOfMonth }, endDate: { gte: startOfMonth } },
    });

    for (const expense of expenses) {
      const existing = await prisma.transaction.findFirst({
        where: { userId: session.user.id, source: `recurring_${expense.id}`, date: { gte: startOfMonth, lte: endOfMonth } },
      });
      if (existing) continue;

      const expenseDate = new Date(now.getFullYear(), now.getMonth(), Math.min(expense.dayOfMonth, endOfMonth.getDate()));

      await prisma.transaction.create({
        data: { id: crypto.randomUUID(), userId: session.user.id, description: expense.description, amount: expense.amount, type: "EXPENSE", category: expense.category, source: `recurring_${expense.id}`, date: expenseDate, createdAt: new Date(), updatedAt: new Date() },
      });
    }

    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[processRecurringExpenses]", err);
    return { ok: false, error: "Erro ao processar despesas recorrentes" };
  }
}

// ── Cofres ─────────────────────────────────────────────────────────────────

export async function getVaults() {
  const session = await getSession();
  if (!session) return [];
  return prisma.vault.findMany({ where: { userId: session.user.id, active: true }, orderBy: { createdAt: "desc" } });
}

export async function createVault(data: {
  name: string;
  monthlyAmount: number;
  targetDate: string;
  startDate?: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (data.monthlyAmount <= 0) return { ok: false, error: "Valor inválido" };
  if (!data.name) return { ok: false, error: "Nome obrigatório" };

  try {
    const vault = await prisma.vault.create({
      data: { id: crypto.randomUUID(), userId: session.user.id, name: data.name, monthlyAmount: data.monthlyAmount, targetDate: new Date(data.targetDate), startDate: data.startDate ? new Date(data.startDate) : new Date() },
      select: { id: true },
    });
    revalidateAll();
    return { ok: true, data: { id: vault.id } };
  } catch (err) {
    console.error("[createVault]", err);
    return { ok: false, error: "Erro ao criar cofre" };
  }
}

export async function deleteVault(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    await prisma.vault.deleteMany({ where: { id, userId: session.user.id } });
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deleteVault]", err);
    return { ok: false, error: "Erro ao excluir cofre" };
  }
}
