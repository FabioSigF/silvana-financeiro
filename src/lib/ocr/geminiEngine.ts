// ============================================================
// Gemini Vision Engine
// Silvana Financeiro
// ============================================================
// Envia a imagem para /api/ocr (Next.js API Route) e retorna
// registros financeiros estruturados como ParsedOCRRow[].
// A chave de API nunca é exposta ao browser.
// ============================================================

import type { ParsedOCRRow, OCRConfidence } from "./types";

// ── Tipos da resposta da API Route
interface GeminiEntry {
  date: string;
  description: string;
  type: "entrada" | "saída";
  amount: number;
  confidence: number; // 0.0 – 1.0
}

interface GeminiAPIResponse {
  entries: GeminiEntry[];
  error?: string;
}

// ============================================================
// Mapeamento de confidence (0–1) → confidenceLevel
// ============================================================
function toConfidenceLevel(confidence: number): OCRConfidence {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}

// ============================================================
// Função principal
// ============================================================

/**
 * Envia a imagem ao servidor via FormData e retorna registros
 * financeiros estruturados extraídos pelo Gemini Vision.
 *
 * @param source  Arquivo de imagem (File ou Blob)
 * @returns       Array de ParsedOCRRow prontos para revisão
 */
export async function runGeminiOCR(
  source: File | Blob
): Promise<{ rows: ParsedOCRRow[]; rawText: string }> {
  // ── Monta FormData com o arquivo bruto
  const formData = new FormData();
  const file =
    source instanceof File
      ? source
      : new File([source], "imagem.jpg", { type: source.type || "image/jpeg" });
  formData.append("image", file);

  // ── Chama a API Route /api/ocr
  const response = await fetch("/api/ocr", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));

    // Quota esgotada — mensagem amigável
    if (response.status === 429) {
      throw new Error(
        errorBody?.message ??
          "Limite da API Gemini atingido. Aguarde alguns minutos e tente novamente."
      );
    }

    throw new Error(
      `Erro na leitura (${response.status}): ${errorBody?.error ?? response.statusText}`
    );
  }

  const data: GeminiAPIResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini retornou erro: ${data.error}`);
  }

  const entries = data.entries ?? [];

  // ── Mapeia GeminiEntry[] → ParsedOCRRow[]
  const rows: ParsedOCRRow[] = entries.map((entry, i) => {
    const confidenceLevel = toConfidenceLevel(entry.confidence);
    const confidencePercent = Math.round(entry.confidence * 100);

    return {
      date: entry.date || "",
      description: entry.description || "",
      category: inferCategory(entry.description, entry.type),
      type: entry.type,
      amount: Math.max(0, entry.amount),
      confidence: confidencePercent,
      confidenceLevel,
      rawText: `[Gemini linha ${i + 1}] ${entry.description}`,
    };
  });

  // rawText agregado para compatibilidade com o campo da OCRPipelineResult
  const rawText = entries
    .map((e) => `${e.date} | ${e.description} | ${e.amount}`)
    .join("\n");

  return { rows, rawText };
}

// ============================================================
// Inferência de categoria padrão baseada no contexto
// ============================================================
function inferCategory(description: string, type: "entrada" | "saída"): string {
  const desc = description.toLowerCase();

  if (type === "entrada") {
    if (desc.includes("venda") || desc.includes("uniform")) return "Venda";
    if (desc.includes("receb") || desc.includes("pagamento recebido")) return "Receita";
    return "Venda";
  }

  // saída
  if (desc.includes("material") || desc.includes("linha") || desc.includes("tecido") || desc.includes("matéria")) return "Matéria Prima";
  if (desc.includes("manutenção") || desc.includes("conserto") || desc.includes("reparo")) return "Manutenção";
  if (desc.includes("luz") || desc.includes("água") || desc.includes("energia") || desc.includes("internet")) return "Utilidades";
  if (desc.includes("salário") || desc.includes("funcionário") || desc.includes("pessoal")) return "Pessoal";
  if (desc.includes("compra") || desc.includes("estoque")) return "Compras";

  return "Geral";
}
