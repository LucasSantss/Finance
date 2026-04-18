import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ─── CORS helpers ──────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

// ─── Payload schema ────────────────────────────────────────────────────────

const payloadSchema = z.object({
  userId: z.string().cuid("userId inválido"),
  description: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(99_999_999),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1).max(60),
  date: z.string().datetime().optional(),
  source: z.string().trim().min(1).max(40).optional(),
});

// ─── OPTIONS (preflight) ───────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ─── POST ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Autenticação via secret compartilhado
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    return json({ error: "Webhook não configurado no servidor" }, 500);
  }
  const provided = req.headers.get("x-webhook-secret");
  if (!provided || provided !== expected) {
    return json({ error: "Não autorizado" }, 401);
  }

  // 2. Parse do corpo
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  // 3. Validação com Zod
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Payload inválido", issues: parsed.error.issues },
      400
    );
  }

  const p = parsed.data;

  // 4. Verifica se o usuário existe no banco
  const user = await prisma.user.findUnique({
    where: { id: p.userId },
    select: { id: true },
  });
  if (!user) {
    return json({ error: "Usuário não encontrado" }, 404);
  }

  // 5. Insere a transação
  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId: p.userId,
        description: p.description,
        amount: p.amount,
        type: p.type,
        category: p.category,
        date: p.date ? new Date(p.date) : new Date(),
        source: p.source ?? "webhook",
      },
      select: { id: true },
    });

    return json({ ok: true, id: transaction.id }, 201);
  } catch (err) {
    console.error("[webhook] insert error", err);
    return json({ error: "Falha ao gravar transação" }, 500);
  }
}
