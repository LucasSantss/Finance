import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const EXPENSE_CATEGORIES = ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Reserva", "Outros"];
const INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Renda Extra", "Outros"];

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Texto vazio" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "IA não configurada" }, { status: 500 });

    const today = new Date().toISOString().slice(0, 10);

    const prompt = `Você é um parser de notificações bancárias brasileiras. Analise a notificação abaixo e extraia os dados da transação.

Notificação: "${text}"

Responda APENAS com um JSON válido, sem markdown, sem explicação:
{
  "description": "descrição curta e clara da transação (máx 80 chars)",
  "amount": 123.45,
  "type": "EXPENSE" ou "INCOME",
  "category": "uma das categorias abaixo",
  "date": "${today}",
  "confidence": 0.0 a 1.0,
  "bank": "nome do banco identificado ou null"
}

Categorias para EXPENSE: ${EXPENSE_CATEGORIES.join(", ")}
Categorias para INCOME: ${INCOME_CATEGORIES.join(", ")}

Regras:
- Compras, pagamentos, débitos = EXPENSE
- PIX recebido, depósito, crédito, estorno = INCOME
- amount deve ser número positivo sem símbolo de moeda
- Se não conseguir extrair os dados com confiança, retorne {"error": "motivo"}
- Converta vírgula para ponto no amount (ex: 45,90 → 45.90)`;

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 300,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("[parse-notification] Anthropic error:", response.status, errBody);
            return NextResponse.json({ error: "Erro ao chamar a IA" }, { status: 502 });
        }

        const data = await response.json();
        const raw = data.content?.[0]?.text ?? "";

        let parsed;
        try {
            parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
            console.error("[parse-notification] JSON parse failed. Raw:", raw);
            return NextResponse.json({ error: "Não foi possível interpretar a notificação" }, { status: 422 });
        }

        if (parsed.error) {
            return NextResponse.json({ error: parsed.error }, { status: 422 });
        }

        return NextResponse.json(parsed);
    } catch (err) {
        console.error("[parse-notification]", err);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}