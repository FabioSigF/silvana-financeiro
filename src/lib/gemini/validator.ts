import { GeminiError, GeminiErrorType, RawFinancialEntry } from "./types";

// ============================================================
// 1. Validação de Imagem
// ============================================================
const MAX_IMAGE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function validateImage(file: File | Blob) {
  // Tamanho
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new GeminiError(GeminiErrorType.IMAGE_TOO_LARGE, {
      message: "Imagem muito grande. Envie uma imagem menor.",
      fileSize: file.size,
    });
  }

  // Formato / Tipo MIME
  let type = file.type || "";
  let name = "";
  
  if (file instanceof File) {
    name = file.name || "";
  }

  const isAllowedMime = ALLOWED_MIME_TYPES.includes(type.toLowerCase());
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);

  if (!isAllowedMime && !isAllowedExt) {
    throw new GeminiError(GeminiErrorType.UNSUPPORTED_FORMAT, {
      message: "Formato de arquivo não suportado. Use JPG, JPEG, PNG ou WEBP.",
      fileName: name,
      fileSize: file.size,
    });
  }
}

// ============================================================
// 2. Limpeza de JSON
// ============================================================
export function cleanJsonText(rawText: string): string {
  if (!rawText) return "";

  let cleaned = rawText.trim();

  // Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, ""); // Remove ```json ou ``` inicial
  cleaned = cleaned.replace(/\s*```$/i, "");      // Remove ``` final

  // Se houver texto antes de um '{' ou depois de um '}', tenta recortar o JSON real
  const firstCurly = cleaned.indexOf("{");
  const lastCurly = cleaned.lastIndexOf("}");
  
  if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
    cleaned = cleaned.substring(firstCurly, lastCurly + 1);
  }

  return cleaned.trim();
}

// ============================================================
// 3. Validação de Estrutura da Resposta
// ============================================================
export function validateResponseStructure(parsedJson: any): any[] {
  if (!parsedJson || typeof parsedJson !== "object") {
    throw new GeminiError(GeminiErrorType.INVALID_RESPONSE, {
      message: "Resposta da IA não é um JSON válido.",
    });
  }

  if (!("entries" in parsedJson) || !Array.isArray(parsedJson.entries)) {
    throw new GeminiError(GeminiErrorType.INVALID_RESPONSE, {
      message: "Estrutura JSON inválida: chave 'entries' ausente ou não é uma lista.",
    });
  }

  if (parsedJson.entries.length === 0) {
    throw new GeminiError(GeminiErrorType.EMPTY_RESULT, {
      message: "Nenhum lançamento financeiro foi identificado. Verifique a qualidade da imagem.",
    });
  }

  return parsedJson.entries;
}

// ============================================================
// 4. Normalizadores Individuais
// ============================================================

/**
 * Converte formatos de data (DD/MM, DD/MM/YYYY, YYYY-MM-DD) para YYYY-MM-DD.
 */
export function normalizeDate(raw: string): string {
  if (!raw || raw.trim() === "") {
    return new Date().toISOString().split("T")[0]; // default: hoje
  }

  const cleaned = raw.trim().replace(/[-_.]/g, "/");

  // DD/MM/YYYY ou DD/MM/YY
  const fullMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (fullMatch) {
    const day = fullMatch[1].padStart(2, "0");
    const month = fullMatch[2].padStart(2, "0");
    let year = fullMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  // DD/MM (sem ano)
  const shortMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const day = shortMatch[1].padStart(2, "0");
    const month = shortMatch[2].padStart(2, "0");
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Formato americano ISO YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Fallback: hoje
  return new Date().toISOString().split("T")[0];
}

/**
 * Normaliza valores em string para número Float:
 * 1.500,00 -> 1500.00
 * R$ 250 -> 250
 */
export function normalizeAmount(raw: number | string): number {
  if (typeof raw === "number") {
    return Math.max(0, Math.round(raw * 100) / 100);
  }

  const cleaned = String(raw)
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .trim();

  // Formato brasileiro: 1.500,00 -> 1500.00
  if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return Math.max(0, parseFloat(normalized) || 0);
  }

  // Formato internacional ou genérico (com vírgula substituída por ponto)
  const value = parseFloat(cleaned.replace(",", "."));
  return Math.max(0, isNaN(value) ? 0 : Math.round(value * 100) / 100);
}

/**
 * Normaliza o tipo do lançamento para 'entrada' ou 'saída'.
 */
export function normalizeType(raw: string): "entrada" | "saída" {
  const cleaned = String(raw).trim().toLowerCase();

  const entradas = ["entrada", "recebimento", "venda"];
  const saidas = ["saída", "saida", "pagamento", "compra", "despesa"];

  if (entradas.some((e) => cleaned.includes(e))) {
    return "entrada";
  }

  if (saidas.some((s) => cleaned.includes(s))) {
    return "saída";
  }

  return "entrada"; // fallback padrão seguro
}

/**
 * Normaliza um lançamento individual bruto para o formato estruturado final.
 */
export function normalizeEntry(raw: any): RawFinancialEntry {
  return {
    date: normalizeDate(raw.date || ""),
    description: String(raw.description || "Sem descrição").trim(),
    type: normalizeType(raw.type || "entrada"),
    amount: normalizeAmount(raw.amount ?? 0),
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.5,
  };
}
