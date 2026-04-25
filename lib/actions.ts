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
  revalidatePath("/planning");
  revalidatePath("/recurring");
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
    return { income: 0, expense: 0, balance: 0, monthIncome: 0, monthExpense: 0, monthBalance: 0, monthVaVrBalance: 0, monthVaVrExpense: 0, monthGeneralExpense: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTime, thisMonth, thisMonthTransactions] = await Promise.all([
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
    prisma.transaction.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth } },
      select: { type: true, amount: true, category: true, source: true },
    }),
  ]);

  const get = (arr: typeof allTime, type: "INCOME" | "EXPENSE") =>
    Number(arr.find((r) => r.type === type)?._sum.amount ?? 0);

  const income = get(allTime, "INCOME");
  const expense = get(allTime, "EXPENSE");
  const monthIncome = get(thisMonth, "INCOME");
  const monthExpense = get(thisMonth, "EXPENSE");

  const monthVaVrIncome = thisMonthTransactions.filter(t => t.category === "VA/VR" && t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const monthVaVrExpense = thisMonthTransactions.filter(t => t.category === "VA/VR" && t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const monthVaultExpense = thisMonthTransactions.filter(t => t.source?.startsWith("vault_") && t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  const monthSalaryIncome = monthIncome - monthVaVrIncome;
  const monthGeneralExpense = monthExpense - monthVaVrExpense - monthVaultExpense;
  const monthVaVrBalance = monthVaVrIncome - monthVaVrExpense;
  const monthBalance = monthSalaryIncome - monthGeneralExpense - monthVaultExpense;

  return { income, expense, balance: income - expense, monthIncome, monthExpense, monthBalance, monthVaVrBalance, monthVaVrExpense, monthGeneralExpense };
}

// ── Stats e transações filtradas por mês ───────────────────────────────────

export async function getMonthData(year: number, month: number) {
  const session = await getSession();
  if (!session)
    return { income: 0, expense: 0, balance: 0, transactions: [], recurringPreview: [], vaultPreview: [], isFuture: false };

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const [stats, transactions, recurringExpenses, salary, vaVr, vaults] = await Promise.all([
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
    prisma.vaVr.findUnique({ where: { userId: session.user.id, active: true } }),
    // Cofres ativos cujo prazo ainda não passou (targetDate >= início do mês)
    prisma.vault.findMany({
      where: { userId: session.user.id, active: true, startDate: { lte: endOfMonth }, targetDate: { gte: startOfMonth } },
    }),
  ]);

  const get = (type: "INCOME" | "EXPENSE") =>
    Number(stats.find((r) => r.type === type)?._sum.amount ?? 0);

  const now = new Date();
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const realIncome = get("INCOME");
  const realExpense = get("EXPENSE");

  const vaVrIncomeReal = transactions.filter(t => t.category === "VA/VR" && t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const vaVrExpenseReal = transactions.filter(t => t.category === "VA/VR" && t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  if (!isFuture) {
    const vaultExpense = transactions.filter(t => t.source?.startsWith("vault_") && t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    const salaryIncome = realIncome - vaVrIncomeReal;
    const generalExpense = realExpense - vaVrExpenseReal - vaultExpense;
    const balanceGeral = salaryIncome - generalExpense - vaultExpense;
    return {
      income: salaryIncome,
      expense: generalExpense + vaultExpense,
      balance: balanceGeral,
      vaVrBalance: vaVrIncomeReal - vaVrExpenseReal,
      vaVrExpense: vaVrExpenseReal,
      transactions,
      recurringPreview: [],
      vaultPreview: [],
      isFuture: false,
    };
  }

  // Para meses futuros: recorrências e cofres que ainda NÃO foram lançados
  const launchedSources = new Set(transactions.map((t) => t.source));

  const recurringPreview = recurringExpenses
    .filter((e) => !launchedSources.has(`recurring_${e.id}`))
    .map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      category: e.category,
      dayOfMonth: e.dayOfMonth,
      type: "EXPENSE" as const,
      pending: true,
    }));

  const vaultPreview = vaults
    .filter((v) => !launchedSources.has(`vault_${v.id}`))
    .map((v) => ({
      id: v.id,
      description: v.name,
      amount: Number(v.monthlyAmount),
      category: "Cofre",
      dayOfMonth: v.dayOfMonth,
      type: "EXPENSE" as const,
      pending: true,
    }));

  const salaryAlreadyLaunched = launchedSources.has("fixed_salary");
  const salaryPreview = salary && !salaryAlreadyLaunched
    ? [{ id: salary.id, description: salary.description, amount: Number(salary.amount), category: "Salário", dayOfMonth: salary.dayOfMonth, type: "INCOME" as const, pending: true }]
    : [];

  const vaVrAlreadyLaunched = launchedSources.has("va_vr");
  const vaVrPreview = vaVr && !vaVrAlreadyLaunched
    ? [{ id: vaVr.id, description: "VA/VR", amount: Number(vaVr.amount), category: "VA/VR", dayOfMonth: vaVr.dayOfMonth, type: "INCOME" as const, pending: true }]
    : [];

  const salaryPreviewIncome = salaryPreview.reduce((s, i) => s + i.amount, 0);
  const vaVrPreviewIncome = vaVrPreview.reduce((s, i) => s + i.amount, 0);
  const recurringPreviewExpense = recurringPreview.reduce((s, i) => s + i.amount, 0);
  const vaultPreviewExpense = vaultPreview.reduce((s, i) => s + i.amount, 0);

  const salaryIncomeFuture = (realIncome - vaVrIncomeReal) + salaryPreviewIncome;
  const generalExpenseFuture = (realExpense - vaVrExpenseReal) + recurringPreviewExpense + vaultPreviewExpense;

  const vaVrIncomeTotal = vaVrIncomeReal + vaVrPreviewIncome;
  const vaVrBalance = vaVrIncomeTotal - vaVrExpenseReal;

  return {
    income: salaryIncomeFuture,
    expense: generalExpenseFuture,
    balance: salaryIncomeFuture - generalExpenseFuture,
    vaVrBalance,
    vaVrExpense: vaVrExpenseReal,
    transactions,
    recurringPreview: [...salaryPreview, ...vaVrPreview, ...recurringPreview],
    vaultPreview,
    isFuture: true,
  };
}

// ── Salário fixo ───────────────────────────────────────────────────────────

export async function getFixedSalary() {
  const session = await getSession();
  if (!session) return null;
  return prisma.fixedSalary.findUnique({ where: { userId: session.user.id } });
}

// ── VA/VR ──────────────────────────────────────────────────────────────────

export async function getVaVr() {
  const session = await getSession();
  if (!session) return null;
  return prisma.vaVr.findUnique({ where: { userId: session.user.id } });
}

export async function upsertVaVr(data: {
  amount: number;
  dayOfMonth?: number;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (data.amount <= 0) return { ok: false, error: "Valor inválido" };

  try {
    await prisma.vaVr.upsert({
      where: { userId: session.user.id },
      update: { amount: data.amount, dayOfMonth: data.dayOfMonth ?? 5, active: true, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), userId: session.user.id, amount: data.amount, dayOfMonth: data.dayOfMonth ?? 5 },
    });
    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[upsertVaVr]", err);
    return { ok: false, error: "Erro ao salvar VA/VR" };
  }
}

export async function processVaVrForCurrentMonth(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    const vaVr = await prisma.vaVr.findUnique({ where: { userId: session.user.id, active: true } });
    if (!vaVr) return { ok: true, data: undefined };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const existing = await prisma.transaction.findFirst({
      where: { userId: session.user.id, source: "va_vr", date: { gte: startOfMonth, lte: endOfMonth } },
    });
    if (existing) return { ok: true, data: undefined };

    const creditDate = new Date(now.getFullYear(), now.getMonth(), Math.min(vaVr.dayOfMonth, endOfMonth.getDate()));

    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        userId: session.user.id,
        description: "VA/VR",
        amount: vaVr.amount,
        type: "INCOME",
        category: "VA/VR",
        source: "va_vr",
        date: creditDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[processVaVr]", err);
    return { ok: false, error: "Erro ao processar VA/VR" };
  }
}

export async function getVaVrMonthBalance(year: number, month: number): Promise<{ credited: number; spent: number; balance: number }> {
  const session = await getSession();
  if (!session) return { credited: 0, spent: 0, balance: 0 };

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const [credited, spent] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: session.user.id, category: "VA/VR", type: "INCOME", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: session.user.id, category: "VA/VR", type: "EXPENSE", date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
  ]);

  const creditedAmt = Number(credited._sum.amount ?? 0);
  const spentAmt = Number(spent._sum.amount ?? 0);
  return { credited: creditedAmt, spent: spentAmt, balance: creditedAmt - spentAmt };
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

export async function processVaultsForCurrentMonth(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const vaults = await prisma.vault.findMany({
      where: {
        userId: session.user.id,
        active: true,
        startDate: { lte: endOfMonth },
        targetDate: { gte: startOfMonth },
      },
    });

    for (const vault of vaults) {
      const existing = await prisma.transaction.findFirst({
        where: { userId: session.user.id, source: `vault_${vault.id}`, date: { gte: startOfMonth, lte: endOfMonth } },
      });
      if (existing) continue;

      const vaultDate = new Date(now.getFullYear(), now.getMonth(), Math.min(vault.dayOfMonth, endOfMonth.getDate()));

      await prisma.transaction.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          description: `Cofre: ${vault.name}`,
          amount: vault.monthlyAmount,
          type: "EXPENSE",
          category: "Cofre",
          source: `vault_${vault.id}`,
          date: vaultDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[processVaults]", err);
    return { ok: false, error: "Erro ao processar cofres" };
  }
}

export async function createVault(data: {
  name: string;
  monthlyAmount: number;
  targetDate: string;
  startDate?: string;
  dayOfMonth?: number;
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (data.monthlyAmount <= 0) return { ok: false, error: "Valor inválido" };
  if (!data.name) return { ok: false, error: "Nome obrigatório" };

  try {
    const vault = await prisma.vault.create({
      data: { id: crypto.randomUUID(), userId: session.user.id, name: data.name, monthlyAmount: data.monthlyAmount, dayOfMonth: data.dayOfMonth ?? 5, targetDate: new Date(data.targetDate), startDate: data.startDate ? new Date(data.startDate) : new Date() },
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