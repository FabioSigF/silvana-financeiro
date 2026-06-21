// ============================================================
// OCR Pipeline — Tipos compartilhados
// Silvana Financeiro
// ============================================================

export type OCRConfidence = "high" | "medium" | "low";

/** Linha estruturada extraída pelo pipeline OCR */
export interface ParsedOCRRow {
  date: string;
  description: string;
  category: string;
  type: "entrada" | "saída";
  amount: number;
  /** Confiança do OCR nesta linha (0–100) */
  confidence: number;
  /** Nível de confiança para UI */
  confidenceLevel: OCRConfidence;
  /** Texto bruto original do OCR que gerou esta linha */
  rawText?: string;
  /** Coordenadas físicas da linha na imagem pré-processada */
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  /** Outros valores numéricos/monetários detectados na mesma linha */
  suggestedAmounts?: number[];
}

/** Resultado completo do pipeline OCR */
export interface OCRPipelineResult {
  rows: ParsedOCRRow[];
  /** Texto bruto retornado pelo Tesseract */
  rawText: string;
  /** Confiança geral do resultado (média das linhas) */
  overallConfidence: number;
  /** Data URL da imagem pré-processada (para preview) */
  preprocessedImageUrl?: string;
  /** Duração do pipeline em ms */
  durationMs: number;
}

/** Configuração do pipeline */
export interface OCRPipelineConfig {
  /** Nível de upscale: 1x, 2x, 3x */
  upscaleFactor?: 1 | 2 | 3;
  /** Se deve aplicar binarização adaptativa */
  binarize?: boolean;
  /** Modo PSM do Tesseract (6=bloco uniforme, 11=esparso) */
  psmMode?: 6 | 11;
  /** Se deve exportar preview da imagem processada */
  exportPreview?: boolean;
}

/** Fases do pipeline para exibição de progresso */
export type OCRPhase =
  | "idle"
  | "preprocessing"
  | "ocr_loading"
  | "ocr_reading"
  | "parsing"
  | "done"
  | "error";

export interface OCRProgressState {
  phase: OCRPhase;
  progress: number; // 0–100
  label: string;
}
