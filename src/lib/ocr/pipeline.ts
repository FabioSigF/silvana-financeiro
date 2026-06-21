// ============================================================
// OCR Pipeline — Orquestrador principal
// Silvana Financeiro
// ============================================================
// Fluxo completo:
//   1. preprocessImage    → melhora a imagem
//   2. runTesseract        → extrai texto
//   3. parseOCRText        → estrutura os dados
// ============================================================

import { preprocessImage } from "./imagePreprocessor";
import { runTesseractWithFallback } from "./tesseractEngine";
import { parseOCRText, parseTableByColumns } from "./parser";
import type { OCRPipelineResult, OCRPipelineConfig, OCRProgressState, ParsedOCRRow } from "./types";

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
 * Executa o pipeline completo de OCR:
 * 1. Pré-processamento (Canvas API)
 * 2. OCR (Tesseract.js LSTM)
 * 3. Parsing e estruturação
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
  const {
    upscaleFactor = 2,
    binarize = false,      // ← default: sem binarização (melhor para cadernos manuscritos)
    psmMode = 6,
    exportPreview = true,
  } = config;

  const emit = (phase: OCRProgressState["phase"], progress: number, label: string) => {
    onProgress?.(makeProgress(phase, progress, label));
  };

  // ──────────────────────────────────────────────
  // ETAPA 1: Pré-processamento de imagem
  // ──────────────────────────────────────────────
  emit("preprocessing", 5, "Preparando imagem...");

  let preprocessedBlob: Blob;
  let previewUrl: string | undefined;
  let skewAngle = 0;

  try {
    emit("preprocessing", 15, "Convertendo para escala de cinza...");
    const preprocessed = await preprocessImage(source, upscaleFactor, binarize);
    preprocessedBlob = preprocessed.blob;
    skewAngle = preprocessed.skewAngle;

    if (exportPreview) {
      previewUrl = preprocessed.previewUrl;
    }

    emit("preprocessing", 30, "Imagem otimizada para leitura ✓");
  } catch (err) {
    // Se o pré-processamento falhar, usa a imagem original
    console.warn("[OCR Pipeline] Pré-processamento falhou, usando imagem original:", err);
    if (typeof source === "string") {
      // Converte data URL para Blob
      const res = await fetch(source);
      preprocessedBlob = await res.blob();
    } else {
      preprocessedBlob = source;
    }
    emit("preprocessing", 30, "Usando imagem original...");
  }

  // ──────────────────────────────────────────────
  // ETAPA 2: OCR com Tesseract
  // ──────────────────────────────────────────────
  emit("ocr_loading", 35, "Carregando motor de reconhecimento...");

  let ocrResult: Awaited<ReturnType<typeof runTesseractWithFallback>>;

  try {
    emit("ocr_loading", 45, "Iniciando leitura do texto...");

    ocrResult = await runTesseractWithFallback(
      previewUrl || preprocessedBlob,
      (ocrProgress) => {
        // Mapeia progresso do OCR para 45–80%
        const mapped = 45 + Math.round(ocrProgress * 0.35);
        emit("ocr_reading", mapped, `Extraindo texto... ${ocrProgress}%`);
      }
    );

    emit("ocr_reading", 80, "Texto extraído com sucesso ✓");
  } catch (err) {
    console.error("[OCR Pipeline] OCR falhou:", err);
    // Retorna resultado vazio mas estruturado
    return {
      rows: [],
      rawText: "",
      overallConfidence: 0,
      preprocessedImageUrl: previewUrl,
      durationMs: Date.now() - start,
    };
  }

  // ──────────────────────────────────────────────
  // ETAPA 3: Parsing e estruturação
  // ──────────────────────────────────────────────
  emit("parsing", 85, "Organizando e estruturando dados...");

  let rows: ParsedOCRRow[] = [];
  if (ocrResult.structuredLines && ocrResult.structuredLines.length > 0) {
    console.log("[OCR Pipeline] Usando parser baseado em colunas...");
    rows = parseTableByColumns(ocrResult.structuredLines, {
      ocrBaseConfidence: ocrResult.confidence,
    });
    console.log(`[OCR Pipeline] Parser de colunas retornou ${rows.length} linhas.`);
  }

  if (rows.length === 0) {
    console.log("[OCR Pipeline] Usando parser de texto padrão...");
    rows = parseOCRText(ocrResult.lines, {
      ocrBaseConfidence: ocrResult.confidence,
    });
  }

  // ── FALLBACK ADICIONAL: Se mesmo após o parser padrão não houver linhas, tenta rodar o OCR diretamente na imagem original (raw)
  if (rows.length === 0) {
    console.log("[OCR Pipeline] 0 linhas detectadas com imagem pré-processada. Tentando leitura direta na imagem original...");
    emit("ocr_reading", 85, "Tentando leitura direta da imagem original...");
    try {
      const rawOcrResult = await runTesseractWithFallback(
        source,
        (ocrProgress) => {
          const mapped = 85 + Math.round(ocrProgress * 0.10);
          emit("ocr_reading", mapped, `Lendo imagem original... ${ocrProgress}%`);
        }
      );
      
      let rawRows: ParsedOCRRow[] = [];
      if (rawOcrResult.structuredLines && rawOcrResult.structuredLines.length > 0) {
        console.log("[OCR Pipeline Fallback] Usando parser baseado em colunas...");
        rawRows = parseTableByColumns(rawOcrResult.structuredLines, {
          ocrBaseConfidence: rawOcrResult.confidence,
        });
      }
      if (rawRows.length === 0) {
        console.log("[OCR Pipeline Fallback] Usando parser de texto padrão...");
        rawRows = parseOCRText(rawOcrResult.lines, {
          ocrBaseConfidence: rawOcrResult.confidence,
        });
      }

      if (rawRows.length > 0) {
        console.log(`[OCR Pipeline Fallback] Sucesso! Extraídas ${rawRows.length} linhas.`);
        emit("done", 100, "Leitura concluída!");
        return {
          rows: rawRows,
          rawText: rawOcrResult.text,
          overallConfidence: Math.round(rawRows.reduce((sum, r) => sum + r.confidence, 0) / rawRows.length),
          preprocessedImageUrl: previewUrl,
          durationMs: Date.now() - start,
        };
      }
    } catch (rawErr) {
      console.error("[OCR Pipeline Fallback] Falhou:", rawErr);
    }
  }

  emit("parsing", 95, "Calculando confiança dos dados...");

  const overallConfidence =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.confidence, 0) / rows.length)
      : 0;

  emit("done", 100, "Leitura concluída!");

  return {
    rows,
    rawText: ocrResult.text,
    overallConfidence,
    preprocessedImageUrl: previewUrl,
    durationMs: Date.now() - start,
  };
}

// ============================================================
// Reprocessamento inteligente
// ============================================================

/**
 * Reprocessa a imagem com parâmetros alternativos e
 * compara com o resultado anterior, mantendo o melhor.
 * Estratégia:
 *   - Primeiro: upscale 2x + binarização
 *   - Segundo: upscale 3x + sem binarização (melhor para texto impresso)
 *   - Vence quem tiver maior overallConfidence e mais linhas
 */
export async function reprocessOCR(
  source: File | Blob | string,
  previousResult: OCRPipelineResult,
  onProgress?: (state: OCRProgressState) => void
): Promise<OCRPipelineResult> {
  // Estratégia de reprocessamento (inversa ao default):
  // 1ª tentativa (default): upscale 2x, sem binarização, PSM 6
  // Reprocessamento:        upscale 3x, COM binarização suave, PSM 11
  const altConfig: OCRPipelineConfig = {
    upscaleFactor: 3,
    binarize: true,    // binarização mais suave (blockSize=64, C=15)
    psmMode: 11,       // PSM 11: texto esparso
    exportPreview: true,
  };

  const newResult = await runOCRPipeline(source, altConfig, onProgress);

  // Escolhe o melhor resultado com base em:
  // 1. Mais linhas com confiança alta
  // 2. Maior confiança geral
  const prevHighConf = previousResult.rows.filter((r) => r.confidence >= 60).length;
  const newHighConf = newResult.rows.filter((r) => r.confidence >= 60).length;

  if (
    newHighConf > prevHighConf ||
    (newHighConf === prevHighConf && newResult.overallConfidence > previousResult.overallConfidence)
  ) {
    return newResult;
  }

  return previousResult;
}
