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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return prisma.transaction.findMany({
    where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfMonth } },
    orderBy: { date: "desc" },
  });
}

export async function getTransactionStats() {
  const session = await getSession();
  if (!session)
    return { income: 0, expense: 0, balance: 0, monthIncome: 0, monthExpense: 0, monthBalance: 0, monthVaVrBalance: 0, monthVaVrExpense: 0, monthGeneralExpense: 0 };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [allTime, thisMonth, thisMonthTransactions] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: session.user.id },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfCurrentMonth } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth, lte: endOfCurrentMonth } },
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
  const monthGeneralExpense = monthExpense - monthVaVrExpense;
  const monthVaVrBalance = monthVaVrIncome - monthVaVrExpense;
  // monthBalance = Salário - (Geral + Cofres)
  const monthBalance = monthSalaryIncome - monthGeneralExpense;

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
      where: {
        userId: session.user.id,
        active: true,
        startDate: { lte: endOfMonth },
        OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
      },
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
  endDate?: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  if (data.amount <= 0) return { ok: false, error: "Valor inválido" };
  if (!data.description) return { ok: false, error: "Descrição obrigatória" };

  // Assinaturas são contínuas — sem data de término
  const isSubscription = data.category === "Assinaturas";
  if (!isSubscription && !data.endDate) return { ok: false, error: "Data de término obrigatória" };
  if (!data.startDate) return { ok: false, error: "Data de início obrigatória" };

  const startDate = new Date(data.startDate);
  if (isNaN(startDate.getTime())) return { ok: false, error: "Data de início inválida" };

  let endDate: Date | null = null;
  if (!isSubscription && data.endDate) {
    endDate = new Date(data.endDate);
    if (isNaN(endDate.getTime())) return { ok: false, error: "Data de término inválida" };
  }

  try {
    const expense = await prisma.recurringExpense.create({
      data: {
        userId: session.user.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        dayOfMonth: data.dayOfMonth,
        startDate,
        endDate,
      },
      select: { id: true },
    });
    revalidateAll();
    return { ok: true, data: { id: expense.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createRecurringExpense]", message);
    return { ok: false, error: message };
  }
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };

  try {
    const expense = await prisma.recurringExpense.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, category: true },
    });
    if (!expense) return { ok: false, error: "Despesa não encontrada" };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (expense.category === "Assinaturas") {
      // Soft-delete: desativa e define endDate como início do mês atual
      // A assinatura para de aparecer a partir deste mês em diante
      await prisma.$transaction([
        prisma.recurringExpense.update({
          where: { id },
          data: { active: false, endDate: startOfMonth, updatedAt: new Date() },
        }),
        // Remove a transação deste mês se já foi lançada
        prisma.transaction.deleteMany({
          where: {
            userId: session.user.id,
            source: `recurring_${id}`,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
      ]);
    } else {
      await prisma.recurringExpense.deleteMany({ where: { id, userId: session.user.id } });
    }

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
      where: {
        userId: session.user.id,
        active: true,
        startDate: { lte: endOfMonth },
        OR: [{ endDate: null }, { endDate: { gte: startOfMonth } }],
      },
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
  const vaults = await prisma.vault.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: "desc" },
  });

  const vaultsWithSaved = await Promise.all(
    vaults.map(async (v) => {
      const saved = await prisma.transaction.aggregate({
        where: { userId: session.user.id, source: `vault_${v.id}`, type: "EXPENSE" },
        _sum: { amount: true },
      });
      return { ...v, savedAmount: Number(saved._sum.amount ?? 0) };
    })
  );

  return vaultsWithSaved;
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Deleta o cofre e também as transações dele do MÊS ATUAL
    await prisma.$transaction([
      prisma.transaction.deleteMany({
        where: { userId: session.user.id, source: `vault_${id}`, date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.vault.deleteMany({ where: { id, userId: session.user.id } }),
    ]);

    revalidateAll();
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[deleteVault]", err);
    return { ok: false, error: "Erro ao excluir cofre" };
  }
}

// ── Acumulativo separado: salário e VA/VR ─────────────────────────────────

export async function getAccumulativeBalance(): Promise<{
  salary: { totalIncome: number; totalExpense: number; balance: number };
  vaVr: { totalIncome: number; totalExpense: number; balance: number };
}> {
  const session = await getSession();
  const empty = { salary: { totalIncome: 0, totalExpense: 0, balance: 0 }, vaVr: { totalIncome: 0, totalExpense: 0, balance: 0 } };
  if (!session) return empty;

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    select: { type: true, amount: true, category: true, source: true, date: true },
    orderBy: { date: "asc" },
  });

  let salaryIncome = 0, salaryExpense = 0, vaVrIncome = 0, vaVrExpense = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    const isVaVr = t.category === "VA/VR";

    if (t.type === "INCOME") {
      if (isVaVr) vaVrIncome += amount;
      else salaryIncome += amount;
    } else {
      if (isVaVr) vaVrExpense += amount;
      else salaryExpense += amount;
    }
  }

  return {
    salary: { totalIncome: salaryIncome, totalExpense: salaryExpense, balance: salaryIncome - salaryExpense },
    vaVr: { totalIncome: vaVrIncome, totalExpense: vaVrExpense, balance: vaVrIncome - vaVrExpense },
  };
}

// ── Saldo carry-over acumulado (real + projeções intermediárias) ──────────
// Para meses passados/atual: soma transações reais até o fim do mês anterior.
// Para meses futuros: soma o real até hoje + simula cada mês intermediário
// usando salário fixo, VA/VR e despesas recorrentes, acumulando o saldo.

export async function getMonthlyCarryOver(year: number, month: number): Promise<{
  salary: number;
  vaVr: number;
}> {
  const session = await getSession();
  if (!session) return { salary: 0, vaVr: 0 };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // ── 1. Saldo real até o fim do mês atual ──────────────────────────────────
  const realEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const realTransactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, date: { lte: realEnd } },
    select: { type: true, amount: true, category: true },
  });

  let salaryBal = 0, vaVrBal = 0;

  for (const t of realTransactions) {
    const amount = Number(t.amount);
    const isVaVr = t.category === "VA/VR";
    if (t.type === "INCOME") {
      if (isVaVr) vaVrBal += amount; else salaryBal += amount;
    } else {
      if (isVaVr) vaVrBal -= amount; else salaryBal -= amount;
    }
  }

  // Se o mês alvo é o mês atual ou anterior, retorna só o real (fim do mês anterior)
  const targetIsCurrent = year === currentYear && month === currentMonth;
  const targetIsPast = year < currentYear || (year === currentYear && month < currentMonth);

  if (targetIsPast || targetIsCurrent) {
    // Precisa do saldo até o fim do mês ANTERIOR ao alvo
    const prevEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const prevTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id, date: { lte: prevEnd } },
      select: { type: true, amount: true, category: true },
    });

    let s = 0, v = 0;
    for (const t of prevTransactions) {
      const amount = Number(t.amount);
      const isVaVr = t.category === "VA/VR";
      if (t.type === "INCOME") {
        if (isVaVr) v += amount; else s += amount;
      } else {
        if (isVaVr) v -= amount; else s -= amount;
      }
    }
    return { salary: s, vaVr: v };
  }

  // ── 2. Para meses futuros: simular cada mês entre currentMonth+1 e month-1 ─
  const [salary, vaVr, recurringExpenses] = await Promise.all([
    prisma.fixedSalary.findUnique({ where: { userId: session.user.id, active: true } }),
    prisma.vaVr.findUnique({ where: { userId: session.user.id, active: true } }),
    prisma.recurringExpense.findMany({ where: { userId: session.user.id, active: true } }),
  ]);

  // Itera mês a mês de (currentMonth+1) até (month-1), acumulando projeções
  let simYear = currentYear;
  let simMonth = currentMonth + 1;
  if (simMonth > 11) { simMonth = 0; simYear++; }

  while (simYear < year || (simYear === year && simMonth < month)) {
    const simStart = new Date(simYear, simMonth, 1);
    const simEnd = new Date(simYear, simMonth + 1, 0, 23, 59, 59, 999);

    // Transações reais já lançadas nesse mês (pode haver lançamentos antecipados)
    const simReal = await prisma.transaction.findMany({
      where: { userId: session.user.id, date: { gte: simStart, lte: simEnd } },
      select: { type: true, amount: true, category: true, source: true },
    });

    const launchedSources = new Set(simReal.map(t => t.source));

    // Contabiliza reais do mês simulado
    for (const t of simReal) {
      const amount = Number(t.amount);
      const isVaVr = t.category === "VA/VR";
      if (t.type === "INCOME") {
        if (isVaVr) vaVrBal += amount; else salaryBal += amount;
      } else {
        if (isVaVr) vaVrBal -= amount; else salaryBal -= amount;
      }
    }

    // Adiciona receitas/despesas fixas que ainda não foram lançadas
    if (salary && !launchedSources.has("fixed_salary")) {
      salaryBal += Number(salary.amount);
    }
    if (vaVr && !launchedSources.has("va_vr")) {
      vaVrBal += Number(vaVr.amount);
    }
    for (const exp of recurringExpenses) {
      const expStart = new Date(exp.startDate);
      const expEnd = exp.endDate ? new Date(exp.endDate) : null;
      if (simStart <= (expEnd ?? new Date(9999, 0)) && simEnd >= expStart && !launchedSources.has(`recurring_${exp.id}`)) {
        salaryBal -= Number(exp.amount);
      }
    }

    // Avança para o próximo mês
    simMonth++;
    if (simMonth > 11) { simMonth = 0; simYear++; }
  }

  return { salary: salaryBal, vaVr: vaVrBal };
}

// ── Acumulativo até um mês específico ─────────────────────────────────────

export async function getAccumulativeUpTo(year: number, month: number): Promise<{
  salary: { totalIncome: number; totalExpense: number; balance: number };
  vaVr: { totalIncome: number; totalExpense: number; balance: number };
}> {
  const session = await getSession();
  const empty = { salary: { totalIncome: 0, totalExpense: 0, balance: 0 }, vaVr: { totalIncome: 0, totalExpense: 0, balance: 0 } };
  if (!session) return empty;

  // Último instante do mês selecionado
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, date: { lte: endOfMonth } },
    select: { type: true, amount: true, category: true },
  });

  let salaryIncome = 0, salaryExpense = 0, vaVrIncome = 0, vaVrExpense = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    const isVaVr = t.category === "VA/VR";
    if (t.type === "INCOME") {
      if (isVaVr) vaVrIncome += amount; else salaryIncome += amount;
    } else {
      if (isVaVr) vaVrExpense += amount; else salaryExpense += amount;
    }
  }

  return {
    salary: { totalIncome: salaryIncome, totalExpense: salaryExpense, balance: salaryIncome - salaryExpense },
    vaVr: { totalIncome: vaVrIncome, totalExpense: vaVrExpense, balance: vaVrIncome - vaVrExpense },
  };
}