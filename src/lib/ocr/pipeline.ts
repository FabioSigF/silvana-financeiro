// ============================================================
// OCR Pipeline — Orquestrador principal (Gemini Vision)
// Silvana Financeiro
// ============================================================
// Fluxo:
//   1. preprocessImage  → melhora a imagem (opcional)
//   2. runGeminiOCR     → envia à API Route → Gemini 2.0 Flash
//   3. validateRows     → normaliza datas, valores e defaults
// ============================================================

import { preprocessImage } from "./imagePreprocessor";
import { extractFinancialEntries } from "../gemini/financial-extractor";
import { validateRows } from "./validator";
import type {
  OCRPipelineResult,
  OCRPipelineConfig,
  OCRProgressState,
  ParsedOCRRow,
} from "./types";

export type { OCRPipelineResult, OCRPipelineConfig, OCRProgressState };
export type { ParsedOCRRow, OCRConfidence } from "./types";

// ============================================================
// Helper: emite estado de progresso
// ============================================================
function makeProgress(
  phase: OCRProgressState["phase"],
  progress: number,
  label: string
): OCRProgressState {
  return { phase, progress, label };
}

// ============================================================
// Pipeline principal
// ============================================================

/**
 * Executa o pipeline completo de OCR com Gemini Vision:
 * 1. Pré-processamento de imagem (opcional, melhora qualidade)
 * 2. Envio ao Gemini Vision via API Route /api/ocr
 * 3. Validação e normalização dos registros
 *
 * @param source     Arquivo de imagem (File, Blob ou Data URL string)
 * @param config     Configuração opcional do pipeline
 * @param onProgress Callback chamado a cada atualização de progresso
 */
export async function runOCRPipeline(
  source: File | Blob | string,
  config: OCRPipelineConfig = {},
  onProgress?: (state: OCRProgressState) => void
): Promise<OCRPipelineResult> {
  const start = Date.now();
  const { upscaleFactor = 2, binarize = false, exportPreview = true } = config;

  const emit = (
    phase: OCRProgressState["phase"],
    progress: number,
    label: string
  ) => {
    onProgress?.(makeProgress(phase, progress, label));
  };

  // ──────────────────────────────────────────────
  // ETAPA 1: Pré-processamento (opcional)
  // Melhora a imagem antes de enviar ao Gemini
  // ──────────────────────────────────────────────
  emit("preprocessing", 10, "Preparando imagem...");

  let imageForOCR: File | Blob;
  let previewUrl: string | undefined;

  try {
    emit("preprocessing", 20, "Otimizando qualidade da imagem...");

    // Converte string (data URL) para Blob
    let sourceBlob: File | Blob;
    if (typeof source === "string") {
      const res = await fetch(source);
      sourceBlob = await res.blob();
    } else {
      sourceBlob = source;
    }

    const preprocessed = await preprocessImage(sourceBlob, upscaleFactor, binarize);
    imageForOCR = preprocessed.blob;

    if (exportPreview) {
      previewUrl = preprocessed.previewUrl;
    }

    emit("preprocessing", 35, "Imagem otimizada ✓");
  } catch (err) {
    console.warn("[OCR Pipeline] Pré-processamento falhou, usando imagem original:", err);
    // Usa a imagem original sem pré-processamento
    if (typeof source === "string") {
      const res = await fetch(source);
      imageForOCR = await res.blob();
    } else {
      imageForOCR = source;
    }
    emit("preprocessing", 35, "Usando imagem original...");
  }

  // ──────────────────────────────────────────────
  // ETAPA 2: Gemini Vision
  // ──────────────────────────────────────────────
  emit("gemini_reading", 40, "Enviando para Gemini Vision...");

  let rawRows: ParsedOCRRow[] = [];
  let rawText = "";

  try {
    emit("gemini_reading", 55, "Gemini analisando caderno...");

    const fileName = imageForOCR instanceof File ? imageForOCR.name : "imagem.jpg";
    const extractResult = await extractFinancialEntries(imageForOCR, {
      fileName,
      fileSize: imageForOCR.size,
    });

    rawText = extractResult.rawText;
    rawRows = extractResult.entries.map((entry, i) => {
      const confidencePercent = Math.round(entry.confidence * 100);
      const level: "high" | "medium" | "low" =
        entry.confidence >= 0.9 ? "high" : entry.confidence >= 0.7 ? "medium" : "low";

      return {
        date: entry.date,
        description: entry.description,
        type: entry.type as "entrada" | "saída",
        amount: entry.amount,
        confidence: confidencePercent,
        confidenceLevel: level,
        category: inferCategory(entry.description, entry.type as "entrada" | "saída"),
        rawText: `[Gemini linha ${i + 1}] ${entry.description}`,
      };
    });

    emit("gemini_reading", 80, `${rawRows.length} lançamentos detectados ✓`);
  } catch (err) {
    console.error("[OCR Pipeline] Gemini falhou:", err);
    emit("error", 0, "Erro ao processar com Gemini Vision");
    throw err;
  }

  // ──────────────────────────────────────────────
  // ETAPA 3: Validação e normalização
  // ──────────────────────────────────────────────
  emit("validating", 85, "Validando e normalizando dados...");

  const rows = validateRows(rawRows);

  emit("validating", 95, "Calculando confiança dos dados...");

  const overallConfidence =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length)
      : 0;

  emit("done", 100, "Leitura concluída!");

  return {
    rows,
    rawText,
    overallConfidence,
    preprocessedImageUrl: previewUrl,
    durationMs: Date.now() - start,
  };
}

// ============================================================
// Reprocessamento: envia sem pré-processamento
// (útil para imagens que o pré-processamento degradou)
// ============================================================

/**
 * Tenta uma segunda leitura sem pré-processamento de imagem.
 * Compara com o resultado anterior e retorna o melhor.
 */
export async function reprocessOCR(
  source: File | Blob | string,
  previousResult: OCRPipelineResult,
  onProgress?: (state: OCRProgressState) => void
): Promise<OCRPipelineResult> {
  // Segunda tentativa: sem pré-processamento (imagem crua)
  const altConfig: OCRPipelineConfig = {
    upscaleFactor: 1,
    binarize: false,
    exportPreview: true,
  };

  const newResult = await runOCRPipeline(source, altConfig, onProgress);

  // Escolhe o resultado com mais linhas de alta confiança
  const prevHighConf = previousResult.rows.filter((r) => r.confidence >= 70).length;
  const newHighConf = newResult.rows.filter((r) => r.confidence >= 70).length;

  if (
    newHighConf > prevHighConf ||
    (newHighConf === prevHighConf &&
      newResult.overallConfidence > previousResult.overallConfidence)
  ) {
    return newResult;
  }

  return previousResult;
}

// ============================================================
// Categoria Padrão baseada no contexto
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
