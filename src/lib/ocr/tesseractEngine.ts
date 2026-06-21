// ============================================================
// Tesseract Engine — OCR configurado para texto manuscrito
// financeiro em português
// ============================================================

import { createWorker, PSM, OEM } from "tesseract.js";

export interface TesseractResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  /** Linhas estruturadas com palavras individuais e posição X (para detecção de colunas de tabela) */
  structuredLines?: StructuredOCRLine[];
  /** Largura da imagem processada (pixels) — usada para normalizar xPercent */
  imageWidth?: number;
}

/**
 * Extrai linhas da estrutura de dados do Tesseract.js v7.
 *
 * Na v7, `data.lines` é `undefined`.
 * As linhas ficam em data.blocks[].paragraphs[].lines[] (com bbox),
 * e também são acessíveis via TSV (mais confiável para bboxes).
 *
 * Estratégia:
 * 1. TSV (prioritário — bboxes verificados e precisos)
 * 2. blocks.paragraphs.lines (fallback com bbox)
 * 3. Texto bruto dividido por \n (sem bbox)
 */
function extractLinesFromData(data: any): TesseractResult["lines"] {
  // 1. Tenta via TSV — mais confiável para bboxes
  if (typeof data.tsv === "string" && data.tsv.length > 0) {
    const fromTSV = extractLinesFromTSV(data.tsv);
    if (fromTSV.length > 0) return fromTSV;
  }

  // 2. Tenta extrair de blocks.paragraphs.lines (estrutura nativa v7)
  if (Array.isArray(data.blocks) && data.blocks.length > 0) {
    const lines: TesseractResult["lines"] = [];
    for (const block of data.blocks) {
      if (!block.paragraphs) continue;
      for (const para of block.paragraphs) {
        if (!para.lines) continue;
        for (const line of para.lines) {
          const text = (line.text ?? "").trim();
          if (!text) continue;
          lines.push({
            text,
            confidence: line.confidence ?? 0,
            bbox: line.bbox ?? { x0: 0, y0: 0, x1: 0, y1: 0 },
          });
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  // 3. Último fallback: divide o texto bruto em linhas (sem bbox)
  return (data.text ?? "")
    .split("\n")
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0)
    .map((t: string) => ({
      text: t,
      confidence: data.confidence ?? 0,
      bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
    }));
}

/**
 * Parseia TSV do Tesseract para reconstruir linhas com bbox.
 * Colunas TSV: level page_num block_num par_num line_num word_num left top width height conf text
 * level 1=página, 4=linha, 5=palavra
 */
function extractLinesFromTSV(tsv: string): TesseractResult["lines"] {
  const { lines } = extractStructuredLinesFromTSV(tsv);
  return lines.map((l) => ({
    text: l.text,
    confidence: l.confidence,
    bbox: l.bbox,
  }));
}

/** Palavra individual com posição X relativa à largura da imagem (0–100%) */
export interface TSVWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  /** Posição X relativa (0–100%) da palavra na imagem */
  xPercent: number;
}

/** Linha do OCR com palavras individuais e suas posições */
export interface StructuredOCRLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: TSVWord[];
}

/**
 * Extrai linhas ESTRUTURADAS do TSV do Tesseract — inclui cada palavra
 * com sua posição X relativa (xPercent) para detectar colunas de tabela.
 *
 * Para tabelas de caderno, as colunas ficam em faixas de X:
 *   - Data:       xPercent < 25%
 *   - Descrição:  25% ≤ xPercent < 65%
 *   - Valor:      xPercent ≥ 65%
 */
export function extractStructuredLinesFromTSV(
  tsv: string
): { lines: StructuredOCRLine[]; imageWidth: number; imageHeight: number } {
  const rows = tsv.split("\n");

  let imageWidth = 1000;
  let imageHeight = 1000;

  const lineMap = new Map<
    string,
    { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number }; words: { text: string; conf: number; x0: number; y0: number; x1: number; y1: number }[] }
  >();

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split("\t");
    if (cols.length < 11) continue;

    const level = parseInt(cols[0]);
    const blockNum = parseInt(cols[2]);
    const parNum = parseInt(cols[3]);
    const lineNum = parseInt(cols[4]);
    const left = parseInt(cols[6]);
    const top = parseInt(cols[7]);
    const width = parseInt(cols[8]);
    const height = parseInt(cols[9]);
    const conf = parseFloat(cols[10]);
    const text = cols.slice(11).join("\t").trim();

    if (level === 1) {
      // Linha de página — contém dimensões da imagem processada
      imageWidth = width || imageWidth;
      imageHeight = height || imageHeight;
    } else if (level === 4) {
      const key = `${blockNum}-${parNum}-${lineNum}`;
      lineMap.set(key, {
        text: "",
        confidence: -1,
        bbox: { x0: left, y0: top, x1: left + width, y1: top + height },
        words: [],
      });
    } else if (level === 5 && text) {
      const key = `${blockNum}-${parNum}-${lineNum}`;
      const line = lineMap.get(key);
      if (line) {
        line.words.push({ text, conf: conf < 0 ? 0 : conf, x0: left, y0: top, x1: left + width, y1: top + height });
        line.text = line.words.map((w) => w.text).join(" ");
        if (conf > 0) {
          line.confidence = line.confidence < 0 ? conf : (line.confidence + conf) / 2;
        }
      }
    }
  }

  const lines: StructuredOCRLine[] = [];
  for (const l of lineMap.values()) {
    if (!l.text.trim()) continue;
    lines.push({
      text: l.text.trim(),
      confidence: Math.max(0, Math.round(l.confidence)),
      bbox: l.bbox,
      words: l.words.map((w) => ({
        text: w.text,
        confidence: Math.max(0, Math.round(w.conf)),
        bbox: { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 },
        xPercent: imageWidth > 0 ? (w.x0 / imageWidth) * 100 : 0,
      })),
    });
  }

  return { lines, imageWidth, imageHeight };
}

/**
 * Executa OCR usando Tesseract.js com configurações otimizadas
 * para documentos financeiros manuscritos em português.
 *
 * Configurações:
 * - Idioma: por + eng (fallback inglês para números)
 * - PSM 6: Assume bloco uniforme de texto (bom para tabelas)
 * - OEM 1: LSTM neural network (mais preciso)
 * - Whitelist de caracteres financeiros
 */
export async function runTesseract(
  imageSource: Blob | string,
  psmMode: 6 | 11 = 6,
  onProgress?: (progress: number) => void
): Promise<TesseractResult> {
  const worker = await createWorker("por+eng", OEM.LSTM_ONLY, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  await worker.setParameters({
    tessedit_pageseg_mode: psmMode as unknown as PSM,
    // Habilita caracteres úteis para texto financeiro brasileiro
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç" +
      "0123456789.,;:/-+()RrSs$% \n\t",
    // Melhora leitura de texto manuscrito
    preserve_interword_spaces: "1",
  });

  // Requisita explicitamente blocks e tsv — necessário em alguns ambientes
  // (browser vs Node.js podem ter comportamentos diferentes no Tesseract.js v7)
  const { data } = (await worker.recognize(
    imageSource,
    {},
    { text: true, blocks: true, hocr: false, tsv: true }
  )) as any;

  await worker.terminate();

  // ── Diagnóstico: ajuda a identificar problemas em prod/browser
  console.log("[OCR Engine] PSM:", psmMode);
  console.log("[OCR Engine] Confiança geral:", data.confidence);
  console.log("[OCR Engine] Texto bruto:", data.text?.slice(0, 300));
  console.log("[OCR Engine] data.blocks type:", typeof data.blocks, "isArray:", Array.isArray(data.blocks));
  console.log("[OCR Engine] data.tsv type:", typeof data.tsv, "length:", data.tsv?.length);
  if (Array.isArray(data.blocks) && data.blocks.length > 0) {
    const b0 = data.blocks[0];
    console.log("[OCR Engine] blocks[0].paragraphs:", b0?.paragraphs?.length, "linhas em para[0]:", b0?.paragraphs?.[0]?.lines?.length);
  }

  // Extrai linhas corretamente do formato Tesseract.js v7
  const lines = extractLinesFromData(data);

  // Extrai linhas ESTRUTURADAS com posição X de cada palavra (para parsing por coluna)
  let structuredLines: StructuredOCRLine[] | undefined;
  let imageWidth: number | undefined;
  if (typeof data.tsv === "string" && data.tsv.length > 0) {
    const structured = extractStructuredLinesFromTSV(data.tsv);
    if (structured.lines.length > 0) {
      structuredLines = structured.lines;
      imageWidth = structured.imageWidth;
      console.log(
        `[OCR Engine] Linhas estruturadas: ${structuredLines.length}, imageWidth: ${imageWidth}px`
      );
      structuredLines.slice(0, 3).forEach((l, i) => {
        console.log(
          `  Linha ${i}: "${l.text}" | words: ${l.words.map((w) => `"${w.text}"@${w.xPercent.toFixed(0)}%`).join(", ")}`
        );
      });
    }
  }

  // Extrai palavras (para compatibilidade futura com highlight de bbox)
  const words: TesseractResult["words"] = [];
  if (Array.isArray(data.blocks)) {
    for (const block of data.blocks) {
      for (const para of block?.paragraphs ?? []) {
        for (const line of para?.lines ?? []) {
          for (const word of line?.words ?? []) {
            if (word.text?.trim()) {
              words.push({
                text: word.text.trim(),
                confidence: word.confidence ?? 0,
                bbox: word.bbox ?? { x0: 0, y0: 0, x1: 0, y1: 0 },
              });
            }
          }
        }
      }
    }
  }

  return {
    text: data.text ?? "",
    confidence: data.confidence ?? 0,
    words,
    lines,
    structuredLines,
    imageWidth,
  };
}

/**
 * Estratégia de reprocessamento:
 * Executa OCR duas vezes com PSM diferentes e
 * escolhe o resultado com maior confiança média.
 */
export async function runTesseractWithFallback(
  imageSource: Blob | string,
  onProgress?: (progress: number) => void
): Promise<TesseractResult> {
  // Primeira tentativa: PSM 6 (bloco uniforme — ideal para tabelas)
  const result6 = await runTesseract(imageSource, 6, (p) =>
    onProgress?.(Math.round(p * 0.5))
  );

  // Se a confiança for boa, retorna logo
  if (result6.confidence >= 55) {
    onProgress?.(100);
    return result6;
  }

  // Segunda tentativa: PSM 11 (esparso — melhor para texto irregular)
  const result11 = await runTesseract(imageSource, 11, (p) =>
    onProgress?.(50 + Math.round(p * 0.5))
  );

  // Retorna o melhor resultado (mais linhas extraídas + maior confiança)
  const score6  = result6.lines.length  * 10 + result6.confidence;
  const score11 = result11.lines.length * 10 + result11.confidence;
  return score6 >= score11 ? result6 : result11;
}

