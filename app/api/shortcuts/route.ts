import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EXPENSE_CATEGORIES = ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Reserva", "VA/VR", "Outros"];
const INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Renda Extra", "VA/VR", "Outros"];

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
};

function json(body: unknown, status = 200) {
    return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) return json({ error: "Servidor não configurado" }, 500);
    if (req.headers.get("x-webhook-secret") !== secret)
        return json({ error: "Não autorizado" }, 401);

    let body: { userId?: string; text?: string; category?: string };
    try { body = await req.json(); }
    catch { return json({ error: "JSON inválido" }, 400); }

    const { userId, text, category } = body;
    if (!userId || !text?.trim()) return json({ error: "userId e text são obrigatórios" }, 400);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return json({ error: "Usuário não encontrado" }, 404);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: "IA não configurada" }, 500);

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Você é um parser de notificações bancárias brasileiras. Analise a notificação abaixo e extraia os dados da transação.

Notificação: "${text}"
${category ? `Categoria sugerida pelo usuário: "${category}". Use esta categoria se fizer sentido, mas sinta-se livre para classificá-la em outra se o texto da notificação indicar claramente que pertence a uma categoria diferente.` : ""}

Responda APENAS com um JSON válido, sem markdown, sem explicação:
{
  "description": "descrição curta e clara (máx 60 chars)",
  "amount": 123.45,
  "type": "EXPENSE" ou "INCOME",
  "category": "uma das categorias listadas",
  "date": "${today}"
}

Categorias EXPENSE: ${EXPENSE_CATEGORIES.join(", ")}
Categorias INCOME: ${INCOME_CATEGORIES.join(", ")}

Regras:
- Compras, pagamentos, débitos, saques = EXPENSE
- PIX recebido, depósito, crédito, estorno = INCOME
- amount é número positivo sem símbolo (ex: 45.90)
- Converta vírgula em ponto no amount
- Se não for notificação bancária, retorne {"error": "não é uma notificação bancária"}`;

    let parsed: { description: string; amount: number; type: "INCOME" | "EXPENSE"; category: string; date: string; error?: string };

    try {
        const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 200, temperature: 0.1 },
                }),
            }
        );
        const aiData = await aiRes.json();
        const raw = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        return json({ error: "Falha ao interpretar notificação" }, 422);
    }

    if (parsed.error) return json({ error: parsed.error }, 422);

    try {
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                description: parsed.description,
                amount: parsed.amount,
                type: parsed.type,
                category: parsed.category,
                date: new Date(parsed.date),
                source: "shortcuts",
            },
            select: { id: true, description: true, amount: true, type: true, category: true },
        });

        return json({
            ok: true,
            message: `✅ ${parsed.type === "EXPENSE" ? "Despesa" : "Receita"} de R$ ${Number(parsed.amount).toFixed(2)} registrada — ${parsed.description}`,
            transaction,
        }, 201);
    } catch (err) {
        console.error("[shortcuts]", err);
        return json({ error: "Erro ao salvar transação" }, 500);
    }
}