import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const EXPENSE_CATEGORIES = ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Assinaturas", "Compras", "Reserva", "Outros"];
const INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Renda Extra", "Outros"];

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Texto vazio" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
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
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 300,
                        temperature: 0.1,
                        responseMimeType: "application/json", // força retorno JSON puro
                    },
                }),
            }
        );

        // Gemini retornou erro HTTP (chave inválida, cota, etc.)
        if (!response.ok) {
            const errBody = await response.text();
            console.error("[parse-notification] Gemini HTTP error:", response.status, errBody);
            return NextResponse.json({ error: "Erro ao chamar a IA" }, { status: 502 });
        }

        const data = await response.json();

        // Gemini bloqueou por safety filters ou não gerou candidatos
        if (!data.candidates?.length) {
            console.error("[parse-notification] Gemini sem candidatos:", JSON.stringify(data));
            return NextResponse.json({ error: "Não foi possível interpretar a notificação" }, { status: 422 });
        }

        const raw = data.candidates[0]?.content?.parts?.[0]?.text ?? "";

        if (!raw.trim()) {
            console.error("[parse-notification] Gemini retornou texto vazio. data:", JSON.stringify(data));
            return NextResponse.json({ error: "Não foi possível interpretar a notificação" }, { status: 422 });
        }

        let parsed;
        try {
            parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
        } catch {
            console.error("[parse-notification] JSON.parse falhou. raw:", raw);
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