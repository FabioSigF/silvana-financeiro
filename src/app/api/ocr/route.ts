import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

// ============================================================
// Inicialização do Cliente (FORA do Handler para evitar spam de instâncias)
// ============================================================
const apiKey = process.env.GEMINI_API_KEY;
// Inicializa apenas uma vez no ciclo de vida do nó do servidor
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ============================================================
// Structured Output Schema
// ============================================================
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    entries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: {
            type: Type.STRING,
            description: "Data no formato DD/MM ou DD/MM/YYYY. String vazia se ilegível.",
          },
          description: {
            type: Type.STRING,
            description: "Descrição do lançamento financeiro.",
          },
          type: {
            type: Type.STRING,
            enum: ["entrada", "saída"],
            description: "entrada para vendas/recebimentos; saída para pagamentos/compras/despesas.",
          },
          amount: {
            type: Type.NUMBER,
            description: "Valor numérico em reais (ex: 1500.00). Use 0 se ilegível.",
          },
          confidence: {
            type: Type.NUMBER,
            description: "Confiança na extração desta linha, de 0.0 a 1.0.",
          },
        },
        required: ["date", "description", "type", "amount", "confidence"],
      },
    },
  },
  required: ["entries"],
};

const PROMPT = `Você é um especialista em leitura de cadernos financeiros manuscritos brasileiros.
Identifique cada linha da tabela visível na imagem.

Para cada linha extraia:
- date: data no formato DD/MM ou DD/MM/YYYY. Se ilegível, use "".
- description: descrição do lançamento.
- type: "entrada" para vendas e recebimentos; "saída" para pagamentos, compras e despesas.
- amount: valor numérico em reais (ex: 1500.00). Se ilegível, use 0.
- confidence: sua confiança nesta linha de 0.0 a 1.0.

Não invente lançamentos. Preserve a ordem original dos lançamentos na imagem.
Se um valor não estiver legível, utilize 0. Se uma data não estiver legível, utilize string vazia.`;

function extractGeminiHttpStatus(err: unknown): number {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const match = message.match(/"code"\s*:\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
  } catch {
    // ignora
  }
  return 500;
}

// ============================================================
// Handler POST
// ============================================================
export async function POST(request: NextRequest) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY não configurada no servidor." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "Campo 'image' não encontrado no FormData." },
        { status: 400 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    let response;
    try {
      // Usando a instância persistente 'ai'
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: PROMPT },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Opcional: Adicionar temperatura menor ajuda em tarefas de OCR estrito
          temperature: 0.1, 
        },
      });
    } catch (geminiErr: unknown) {
      const httpStatus = extractGeminiHttpStatus(geminiErr);
      console.error("[API /ocr] Gemini API error:", httpStatus, geminiErr);

      if (httpStatus === 429) {
        return NextResponse.json(
          {
            error: "QUOTA_EXCEEDED",
            message: "Limite de requisições temporário do plano gratuito atingido. Aguarde 1 minuto e tente novamente.",
          },
          { status: 429 }
        );
      }

      const message = geminiErr instanceof Error ? geminiErr.message : "Erro da API Gemini.";
      return NextResponse.json({ error: message }, { status: httpStatus || 502 });
    }

    const text = response.text;
    if (!text) {
      return NextResponse.json(
        { error: "Gemini retornou resposta vazia." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text) as {
      entries: Array<{
        date: string;
        description: string;
        type: "entrada" | "saída";
        amount: number;
        confidence: number;
      }>;
    };

    return NextResponse.json({ entries: parsed.entries ?? [] });
  } catch (err: unknown) {
    console.error("[API /ocr] Erro inesperado:", err);
    const message = err instanceof Error ? err.message : "Erro interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}