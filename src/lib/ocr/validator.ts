// ============================================================
// Validator — Silvana Financeiro
// ============================================================
// Normaliza e valida os registros extraídos pelo Gemini Vision.
// Responsável por:
//   - Converter formatos de data variados para YYYY-MM-DD
//   - Normalizar valores monetários (vírgulas, pontos, símbolos)
//   - Aplicar defaults para campos ausentes
//   - Garantir integridade do ParsedOCRRow
// ============================================================

import type { ParsedOCRRow } from "./types";

// ============================================================
// Normalização de Data
// ============================================================

/**
 * Converte formatos variados de data para YYYY-MM-DD.
 *
 * Suporta:
 *   - DD/MM/YYYY → 2025-06-12
 *   - DD/MM      → 2025-06-12 (ano corrente)
 *   - DD-MM      → normalizado
 *   - D/M        → normalizado (dia/mês sem zero à esquerda)
 *   - "" ou inválido → hoje
 */
export function normalizeDate(raw: string): string {
  if (!raw || raw.trim() === "") {
    return todayISO();
  }

  // Substitui hífens e pontos por barras
  const cleaned = raw.trim().replace(/[-_.]/g, "/");

  // Tenta DD/MM/YYYY
  const fullMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (fullMatch) {
    const day = fullMatch[1].padStart(2, "0");
    const month = fullMatch[2].padStart(2, "0");
    let year = fullMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Tenta DD/MM (sem ano)
  const shortMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const day = shortMatch[1].padStart(2, "0");
    const month = shortMatch[2].padStart(2, "0");
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Fallback: hoje
  return todayISO();
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================
// Normalização de Valor Monetário
// ============================================================

/**
 * Garante que o valor é um número positivo válido.
 *
 * Exemplos de entrada:
 *   1.500,00 → 1500.00
 *   R$ 250   → 250
 *   1500.50  → 1500.50
 *   0        → 0
 */
export function normalizeAmount(raw: number | string): number {
  if (typeof raw === "number") {
    return Math.max(0, Math.round(raw * 100) / 100);
  }

  const cleaned = String(raw)
    .replace(/R\$\s*/gi, "")
    .replace(/\s/g, "")
    .trim();

  // Formato brasileiro: 1.500,00 → 1500.00
  if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return Math.max(0, parseFloat(normalized) || 0);
  }

  // Formato internacional ou simples
  const value = parseFloat(cleaned.replace(",", "."));
  return Math.max(0, isNaN(value) ? 0 : Math.round(value * 100) / 100);
}

// ============================================================
// Validação completa de um ParsedOCRRow
// ============================================================

/**
 * Aplica normalização de data e valor e garante defaults para
 * campos ausentes de um registro financeiro.
 */
export function validateRow(row: Partial<ParsedOCRRow> & Pick<ParsedOCRRow, "description" | "type" | "amount">): ParsedOCRRow {
  return {
    date: normalizeDate(row.date ?? ""),
    description: (row.description || "").trim() || "Sem descrição",
    category: row.category || "Geral",
    type: row.type === "saída" ? "saída" : "entrada",
    amount: normalizeAmount(row.amount),
    confidence: Math.min(100, Math.max(0, row.confidence ?? 0)),
    confidenceLevel: row.confidenceLevel ?? "low",
    rawText: row.rawText,
    bbox: row.bbox,
    suggestedAmounts: row.suggestedAmounts,
  };
}

/**
 * Valida e normaliza um array de ParsedOCRRow,
 * descartando linhas sem descrição e sem valor.
 */
export function validateRows(rows: Partial<ParsedOCRRow>[]): ParsedOCRRow[] {
  return rows
    .filter(
      (r) =>
        // Mantém linhas que têm pelo menos descrição OU valor
        (r.description && r.description.trim().length > 0) ||
        (r.amount && r.amount > 0)
    )
    .map((r) =>
      validateRow(r as Partial<ParsedOCRRow> & Pick<ParsedOCRRow, "description" | "type" | "amount">)
    );
}
