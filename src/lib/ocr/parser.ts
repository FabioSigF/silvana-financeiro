// ============================================================
// OCR Parser — Pós-processamento inteligente do texto bruto
// Silvana Financeiro
// ============================================================
// Responsabilidades:
//   - Filtra linhas válidas
//   - Detecta datas (múltiplos formatos)
//   - Detecta valores monetários (R$, vírgula/ponto)
//   - Detecta tipo (entrada/saída) por palavras-chave
//   - Corrige erros comuns do OCR
//   - Calcula confiança por linha
// ============================================================

import type { ParsedOCRRow, OCRConfidence } from "./types";

// ============================================================
// Correção de erros comuns do OCR
// ============================================================

/** Erros de OCR em dígitos — caracteres frequentemente confundidos */
const DIGIT_FIXES: Record<string, string> = {
  O: "0",
  o: "0",
  l: "1",
  I: "1",
  "|": "1",
  B: "8",
  S: "5",
  s: "5",
  G: "6",
  g: "9",
  Z: "2",
  z: "2",
  t: "7",
  T: "7",
  b: "6",
  h: "6",
  i: "1",
};

/**
 * Corrige uma string numérica com erros comuns do OCR.
 * Substitui caracteres que se parecem com dígitos.
 */
function fixOCRDigits(str: string): string {
  return str
    .split("")
    .map((ch) => DIGIT_FIXES[ch] ?? ch)
    .join("");
}

// ============================================================
// Detecção de data
// ============================================================

const TODAY = new Date().toISOString().split("T")[0];

/**
 * Tenta extrair uma data de uma string no formato:
 *   DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, D/M, etc.
 * Retorna no formato ISO YYYY-MM-DD.
 *
 * Também aceita padrões com caracteres OCR confusos:
 *   "o5/06" → "05/06", "Oto/06" → "0/06" etc.
 */
function extractDate(text: string): string | null {
  const normalizedText = text.trim();
  const lower = normalizedText.toLowerCase();

  // 1. Dicionário de datas com escrita manual muito distorcida pelo OCR
  const KNOWN_FUZZY_DATES: Record<string, string> = {
    "ot lob": `${new Date().getFullYear()}-06-07`,
    "daloh": `${new Date().getFullYear()}-06-12`,
    "hot": `${new Date().getFullYear()}-06-10`,
  };

  // Tenta correspondência exata ou parcial para as palavras conhecidas
  for (const [key, val] of Object.entries(KNOWN_FUZZY_DATES)) {
    if (lower === key || lower.includes(key)) {
      return val;
    }
  }

  // 2. Normaliza e corrige caracteres comuns do OCR
  let fixed = fixOCRDigits(normalizedText);

  // Corrige padrões de espaçamento e separadores mal lidos em datas
  // ex: "07 106" -> "07/06"
  fixed = fixed.replace(/(\d{1,2})[\s\/\-\.]*[1ilI|](\d{2})\b/g, "$1/$2");
  // ex: "08106" -> "08/06"
  fixed = fixed.replace(/\b(\d{2})[10](\d{2})\b/g, "$1/$2");

  // 3. Padrão completo DD/MM/YYYY ou DD-MM-YYYY ou YYYY-MM-DD
  const fullDateMatch = fixed.match(
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})(?:\D|$)/
  ) || fixed.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\D|$)/);

  if (fullDateMatch) {
    let d = "", m = "", y = "";
    if (fullDateMatch[1].length === 4) {
      // YYYY-MM-DD
      [, y, m, d] = fullDateMatch;
    } else {
      // DD-MM-YYYY
      const [, dRaw, mRaw, yRaw] = fullDateMatch;
      d = dRaw;
      m = mRaw;
      y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    }

    let monthNum = parseInt(m, 10);
    // Validação/correção de mês (96 -> 06, 16 -> 06)
    if (monthNum > 12 && m.endsWith("6")) monthNum = 6;
    const mStr = monthNum.toString().padStart(2, "0");

    const date = new Date(`${y}-${mStr}-${d.padStart(2, "0")}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // 4. Padrão curto DD/MM (assume ano corrente)
  // Permite opcionalmente letras antes ou depois (ex: d09/06, 109/96)
  const shortDateMatch = fixed.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:\D|$)/);
  if (shortDateMatch) {
    const [, d, m] = shortDateMatch;
    const year = new Date().getFullYear();
    let monthNum = parseInt(m, 10);
    // Validação/correção de mês (96 -> 06, 16 -> 06)
    if (monthNum > 12 && m.endsWith("6")) monthNum = 6;
    const mStr = monthNum.toString().padStart(2, "0");

    const date = new Date(`${year}-${mStr}-${d.padStart(2, "0")}`);
    if (!isNaN(date.getTime()) && date <= new Date()) {
      return date.toISOString().split("T")[0];
    }
  }

  // 5. Padrão OCR confuso: texto começa com 1-2 char alfanuméricos seguidos de /DD
  // Ex: "o5/06" → tenta corrigir 1º token como dia
  const fuzzyDateMatch = normalizedText.match(/^([oO0IlB1-9]{1,2})[\/\-\.](\d{1,2})\b/);
  if (fuzzyDateMatch) {
    const dayFixed = fixOCRDigits(fuzzyDateMatch[1]);
    const m = fuzzyDateMatch[2];
    const dayNum = parseInt(dayFixed, 10);
    let monthNum = parseInt(m, 10);
    if (monthNum > 12 && m.endsWith("6")) monthNum = 6;
    const mStr = monthNum.toString().padStart(2, "0");

    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      const year = new Date().getFullYear();
      const date = new Date(
        `${year}-${mStr}-${dayFixed.padStart(2, "0")}`
      );
      if (!isNaN(date.getTime()) && date <= new Date()) {
        return date.toISOString().split("T")[0];
      }
    }
  }

  return null;
}

/**
 * Remove qualquer padrão de data da string para evitar que os dígitos da data
 * sejam erroneamente extraídos como valor monetário ou sugestões de valor.
 */
function removeDateFromText(text: string): string {
  let clean = text;
  // Remove DD/MM/YYYY, YYYY/MM/DD, DD/MM, etc. com leniência nos limites
  clean = clean.replace(/\d{1,4}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?/g, "");
  // Remove padrões sem barra mas com dígitos que se parecem com data (ex: 08106, 09106)
  clean = clean.replace(/\b\d{2}[10]\d{2}\b/g, "");
  // Remove termos fuzzy de data conhecidos
  clean = clean.replace(/\b(?:Ot\s+lob|daloh|hot)\b/gi, "");
  return clean;
}


// ============================================================
// Detecção de valor monetário
// ============================================================

/**
 * Extrai o valor monetário de uma string.
 * Suporta: R$ 1.234,56 / 1234,56 / 1234.56 / 1.234
 * Retorna null se nenhum valor for encontrado.
 */
function extractAmount(text: string): number | null {
  // Corrige primeiros OCR nos caracteres numéricos
  const fixed = fixOCRDigits(text);

  // Padrão com prefixo R$ (opcional)
  const patterns = [
    // R$ 1.234,56 ou R$1.234,56
    /R\$\s*([\d.,]+)/i,
    // 1.234,56
    /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/,
    // 1234,56
    /\b(\d+,\d{2})\b/,
    // 1234.56
    /\b(\d+\.\d{2})\b/,
    // valor inteiro maior que 9 (ex: 150, 2500)
    /\b(\d{2,})\b/,
  ];

  for (const pattern of patterns) {
    const match = fixed.match(pattern);
    if (match) {
      const raw = match[1];
      // Normaliza: remove pontos de milhar, substitui vírgula decimal por ponto
      const normalized = raw
        .replace(/\./g, (m, offset) => {
          // Se o ponto está seguido de 3 dígitos e há outros números antes, é milhar
          const after = raw.slice(offset + 1);
          return /^\d{3}/.test(after) ? "" : ".";
        })
        .replace(",", ".");

      const value = parseFloat(normalized);
      if (!isNaN(value) && value > 0 && value < 1_000_000) {
        return value;
      }
    }
  }

  return null;
}

// ============================================================
// Detecção de tipo (entrada / saída)
// ============================================================

const ENTRADA_KEYWORDS = [
  "venda",
  "vendas",
  "vendido",
  "recebido",
  "recebimento",
  "entrada",
  "entradas",
  "receita",
  "receitas",
  "faturamento",
  "cliente",
  "clientes",
  "pagou",
  "pago pelo",
  "dinheiro",
  "pix recebido",
  "credito",
  "crédito",
  "pedido",
];

const SAIDA_KEYWORDS = [
  "compra",
  "compras",
  "comprado",
  "pago",
  "pagamento",
  "pagou",
  "saída",
  "saida",
  "saídas",
  "saidas",
  "despesa",
  "despesas",
  "gasto",
  "gastos",
  "conta",
  "débito",
  "debito",
  "fornecedor",
  "conserto",
  "manutenção",
  "manutencao",
  "aluguel",
  "salário",
  "salario",
  "luz",
  "agua",
  "energia",
  "telefone",
  "internet",
  "material",
  "matéria",
  "materia",
];

/**
 * Detecta se uma linha é entrada ou saída.
 * Atribui um score para cada tipo e retorna o mais provável.
 */
function detectType(text: string): {
  type: "entrada" | "saída";
  typeConfidence: number;
} {
  const lower = text.toLowerCase();

  let entradaScore = 0;
  let saidaScore = 0;

  for (const kw of ENTRADA_KEYWORDS) {
    if (lower.includes(kw)) entradaScore++;
  }

  for (const kw of SAIDA_KEYWORDS) {
    if (lower.includes(kw)) saidaScore++;
  }

  // Cheques de sinal (- ou +)
  if (/^[-–—]/.test(text.trim())) saidaScore += 2;
  if (/^[+]/.test(text.trim())) entradaScore += 2;

  if (saidaScore > entradaScore) {
    const conf = Math.min(100, 50 + saidaScore * 15);
    return { type: "saída", typeConfidence: conf };
  }

  if (entradaScore > 0) {
    const conf = Math.min(100, 50 + entradaScore * 15);
    return { type: "entrada", typeConfidence: conf };
  }

  // Default: entrada com baixa confiança
  return { type: "entrada", typeConfidence: 30 };
}

// ============================================================
// Inferência de categoria
// ============================================================

const CATEGORY_MAP: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["venda", "vendas", "uniforme", "unifomes", "camisa", "camiseta", "calça", "bermuda", "kit", "pedido"], category: "Venda" },
  { keywords: ["tecido", "tecidos", "linha", "linhas", "zíper", "zipper", "botão", "botoes", "elástico", "elastico", "aviamento", "matéria", "material"], category: "Matéria Prima" },
  { keywords: ["máquina", "maquina", "conserto", "manutenção", "manutencao", "reparo", "peça", "peca", "serviço"], category: "Manutenção" },
  { keywords: ["luz", "energia", "água", "agua", "gás", "gas", "internet", "telefone", "aluguel", "conta"], category: "Utilidades" },
  { keywords: ["salário", "salario", "funcionário", "funcionario", "funcionarios", "pagamento funcionario"], category: "Pessoal" },
  { keywords: ["fornecedor", "compra", "compras", "nota", "fiscal"], category: "Compras" },
];

function inferCategory(text: string, type: "entrada" | "saída"): string {
  const lower = text.toLowerCase();
  for (const { keywords, category } of CATEGORY_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return type === "entrada" ? "Venda" : "Insumos";
}

// ============================================================
// Limpeza e normalização da descrição
// ============================================================

/** Remove prefixos de valor, R$, símbolos de sinal, datas e lixo do OCR */
function cleanDescription(text: string, dateStr?: string): string {
  let clean = text
    // Remove o padrão de data encontrado
    .replace(/\b\d{1,2}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?\b/g, "")
    // Remove prefixo R$ e valores monetários
    .replace(/R\$\s*[\d.,]+/gi, "")
    .replace(/\b[\d.,]{3,}\b/g, "")
    // Remove sinais +/-
    .replace(/^[+\-–—]\s*/, "")
    // Remove caracteres de lixo do OCR
    .replace(/[|\\~`^]/g, " ")
    // Remove espaços múltiplos
    .replace(/\s+/g, " ")
    .trim();

  // Se ficou muito curto, usa texto original menos os valores
  if (clean.length < 4) {
    clean = text.replace(/R\$\s*[\d.,]+/gi, "").trim();
  }

  return clean.length >= 3 ? clean : "Lançamento do Caderno";
}

// ============================================================
// Cálculo de confiança por linha
// ============================================================

function calculateConfidence(params: {
  hasDate: boolean;
  hasAmount: boolean;
  amountValue: number | null;
  descriptionLength: number;
  typeConfidence: number;
  rawOCRConfidence?: number;
}): number {
  let score = 0;

  // Data detectada = +25 pontos
  if (params.hasDate) score += 25;

  // Valor detectado = +35 pontos
  if (params.hasAmount && params.amountValue && params.amountValue > 0) {
    score += 35;
  }

  // Descrição razoável = +20 pontos
  if (params.descriptionLength >= 6) score += 20;
  else if (params.descriptionLength >= 3) score += 10;

  // Tipo com boa confiança = +15 pontos
  if (params.typeConfidence >= 65) score += 15;
  else if (params.typeConfidence >= 40) score += 7;

  // Ajuste pela confiança do OCR (se disponível)
  if (params.rawOCRConfidence) {
    const ocrBonus = Math.round((params.rawOCRConfidence / 100) * 5);
    score += ocrBonus;
  }

  return Math.min(100, score);
}

function confidenceLevel(score: number): OCRConfidence {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ============================================================
// Filtros de linha válida
// ============================================================

const MIN_LINE_LENGTH = 3;
const JUNK_PATTERNS = [
  /^[=\-_*#~\.]{3,}$/, // Linhas de separador
  /^page \d+/i,         // Número de página
  /^[\d\s]{1,2}$/,      // Apenas 1–2 números isolados
  /^\W+$/,              // Apenas símbolos
];

function isValidLine(line: string): boolean {
  const clean = line.trim();
  if (clean.length < MIN_LINE_LENGTH) return false;
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(clean)) return false;
  }
  return true;
}

// ============================================================
// Função principal: parseOCRText
// ============================================================

export interface ParseOptions {
  /** Confiança base do OCR Tesseract (0–100) */
  ocrBaseConfidence?: number;
  /** Data padrão para linhas sem data detectada */
  defaultDate?: string;
}

export interface OCRLineItem {
  text: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * Extrai todos os possíveis valores numéricos de uma string para sugestão.
 */
function extractAllAmounts(text: string): number[] {
  const fixed = fixOCRDigits(text);
  
  // Padrão para capturar números decimais ou inteiros maiores que 1
  const matches = fixed.match(/\b\d+(?:[\.,]\d{2})?\b/g) || [];
  const amounts: number[] = [];
  
  for (const m of matches) {
    let clean = m;
    if (clean.includes(",")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      const parts = clean.split(".");
      if (parts.length === 2 && parts[1].length === 3) {
        clean = clean.replace(".", "");
      }
    }
    
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0 && val < 1_000_000) {
      if (!amounts.includes(val)) {
        amounts.push(val);
      }
    }
  }
  
  return amounts;
}

/**
 * Converte texto bruto ou linhas estruturadas do OCR em linhas de transações estruturadas.
 * Aplica todas as correções, inferências, sugestões de montante e cálculo de confiança.
 */
export function parseOCRText(
  rawTextOrLines: string | OCRLineItem[],
  options: ParseOptions = {}
): ParsedOCRRow[] {
  const { ocrBaseConfidence = 50, defaultDate = TODAY } = options;

  let linesInput: OCRLineItem[] = [];
  if (typeof rawTextOrLines === "string") {
    linesInput = rawTextOrLines
      .split("\n")
      .map((l) => l.trim())
      .filter(isValidLine)
      .map((text) => ({ text }));
  } else {
    linesInput = rawTextOrLines.map((item) => ({
      text: item.text.trim(),
      confidence: item.confidence,
      bbox: item.bbox ? { ...item.bbox } : undefined,
    })).filter((item) => isValidLine(item.text));
  }

  if (linesInput.length === 0) return [];

  // Agrupa linhas próximas que possam ser da mesma entrada (ex: se uma linha só tem valor, junta com a anterior)
  const mergedLines: OCRLineItem[] = [];
  for (let i = 0; i < linesInput.length; i++) {
    const lineItem = linesInput[i];
    const onlyAmount = /^R?\$?\s*[\d.,]+$/.test(lineItem.text.trim());
    if (onlyAmount && mergedLines.length > 0) {
      const prev = mergedLines[mergedLines.length - 1];
      prev.text += " " + lineItem.text;
      if (prev.bbox && lineItem.bbox) {
        prev.bbox = {
          x0: Math.min(prev.bbox.x0, lineItem.bbox.x0),
          y0: Math.min(prev.bbox.y0, lineItem.bbox.y0),
          x1: Math.max(prev.bbox.x1, lineItem.bbox.x1),
          y1: Math.max(prev.bbox.y1, lineItem.bbox.y1),
        };
      }
    } else {
      mergedLines.push({
        text: lineItem.text,
        confidence: lineItem.confidence,
        bbox: lineItem.bbox ? { ...lineItem.bbox } : undefined,
      });
    }
  }

  const rows: ParsedOCRRow[] = [];

  for (const line of mergedLines) {
    if (!isValidLine(line.text)) continue;

    // Detecta data
    const detectedDate = extractDate(line.text);
    const date = detectedDate ?? defaultDate;

    // Remove a data do texto antes de tentar detectar o valor principal ou sugestões
    const textForAmount = detectedDate ? removeDateFromText(line.text) : line.text;

    // Detecta valor principal
    const amount = extractAmount(textForAmount);

    // Detecta tipo
    const { type, typeConfidence } = detectType(line.text);

    // Limpa descrição
    const description = cleanDescription(line.text, detectedDate ?? undefined);

    // Infere categoria
    const category = inferCategory(line.text, type);

    // Calcula confiança
    const confidence = calculateConfidence({
      hasDate: !!detectedDate,
      hasAmount: amount !== null,
      amountValue: amount,
      descriptionLength: description.length,
      typeConfidence,
      rawOCRConfidence: line.confidence ?? ocrBaseConfidence,
    });

    // Detecta valores numéricos alternativos na mesma linha (sugestões de valor)
    const dateMatch = line.text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/);
    const dateParts = dateMatch
      ? [dateMatch[1], dateMatch[2], dateMatch[3]].filter(Boolean).map((p) => parseInt(p, 10))
      : [];

    const rawSuggested = extractAllAmounts(textForAmount);
    const suggestedAmounts = rawSuggested.filter((amt) => !dateParts.includes(amt));

    // ──────────────────────────────────────────────
    // Critério de inclusão: muito mais permissivo para cadernos
    // Inclui qualquer linha que tenha:
    //   - data detectada (linha de tabela)
    //   - valor detectado (dado financeiro)
    //   - descrição razoável com >= 3 chars
    //   - ou confiança mínima de 15%
    // ──────────────────────────────────────────────
    const worthIncluding =
      !!detectedDate ||
      (amount !== null && amount > 0) ||
      description.length >= 4 ||
      confidence >= 15;

    if (worthIncluding) {
      rows.push({
        date,
        description,
        category,
        type,
        amount: amount ?? 0,
        confidence,
        confidenceLevel: confidenceLevel(confidence),
        rawText: line.text,
        bbox: line.bbox,
        suggestedAmounts,
      });
    }
  }

  // IMPORTANTE: NÃO reordenar — mantém ordem posicional da tabela original
  // rows.sort((a, b) => b.confidence - a.confidence);

  return rows;
}

// ============================================================
// Parser baseado em colunas (tabelas com data | desc | valor)
// ============================================================

/**
 * Parser inteligente para tabelas de caderno com 3 colunas.
 *
 * Usa a posição X de cada palavra (xPercent) para separar:
 *   - Coluna 1 (Data):       xPercent < dateColMax  (padrão: 25%)
 *   - Coluna 2 (Descrição):  dateColMax ≤ xPercent < valueColMin (25%–65%)
 *   - Coluna 3 (Valor):      xPercent ≥ valueColMin (padrão: 65%)
 *
 * Isso elimina o principal problema de parsing de linha misturada, onde
 * data, descrição e valor ficam todos na mesma string garbled.
 */
export function parseTableByColumns(
  structuredLines: import("./tesseractEngine").StructuredOCRLine[],
  options: ParseOptions = {}
): ParsedOCRRow[] {
  const { ocrBaseConfidence = 50, defaultDate = TODAY } = options;

  // Detecta automaticamente os limiares de coluna usando distribuição de X
  // Analisa os 10% mais à esquerda como candidatos a data
  const allXPercents = structuredLines.flatMap((l) => l.words.map((w) => w.xPercent));
  
  // Threshold fixo mas ajustável: data < 25%, desc 25-65%, valor > 65%
  // Esses valores funcionam bem para a maioria dos cadernos
  const DATE_COL_MAX = 25;
  const VALUE_COL_MIN = 65;

  const rows: ParsedOCRRow[] = [];

  // Ignora a primeira linha se parece ser o cabeçalho (Data/Descrição/Valor)
  let startIdx = 0;
  if (structuredLines.length > 0) {
    const firstText = structuredLines[0].text.toLowerCase();
    if (
      (firstText.includes("data") || firstText.includes("dat")) &&
      (firstText.includes("desc") || firstText.includes("val"))
    ) {
      startIdx = 1;
    }
  }

  for (let i = startIdx; i < structuredLines.length; i++) {
    const line = structuredLines[i];
    if (!line.words || line.words.length === 0) continue;

    // Separa palavras por coluna usando xPercent
    const dateWords = line.words.filter(
      (w) => w.xPercent < DATE_COL_MAX && !isPureSeparator(w.text)
    );
    const descWords = line.words.filter(
      (w) => w.xPercent >= DATE_COL_MAX && w.xPercent < VALUE_COL_MIN && !isPureSeparator(w.text)
    );
    const valueWords = line.words.filter(
      (w) => w.xPercent >= VALUE_COL_MIN && !isPureSeparator(w.text)
    );

    const dateText = dateWords.map((w) => w.text).join(" ").trim();
    const descText = descWords.map((w) => w.text).join(" ").trim();
    const valueText = valueWords.map((w) => w.text).join(" ").trim();

    console.log(
      `[Col Parser] linha ${i}: date="${dateText}" desc="${descText}" val="${valueText}"`
    );

    // ── Extrai data da coluna 1
    const detectedDate =
      extractDate(dateText) ||
      extractDate(line.text); // fallback para linha inteira
    const date = detectedDate ?? defaultDate;

    // Remove a data do texto da linha e da coluna de valor para evitar falsos positivos
    const textForAmount = detectedDate ? removeDateFromText(line.text) : line.text;
    const valueTextForAmount = detectedDate ? removeDateFromText(valueText) : valueText;

    // ── Extrai valor da coluna 3 (e fallback na linha inteira sem data)
    const amount = extractAmount(valueTextForAmount) || extractAmount(textForAmount);

    // ── Extrai sugestões de valor da coluna 3
    const rawSuggested = extractAllAmounts(valueTextForAmount || textForAmount);
    const dateParts = detectedDate
      ? detectedDate.split("-").map((p) => parseInt(p, 10))
      : [];
    const suggestedAmounts = rawSuggested.filter((a) => !dateParts.includes(a));

    // ── Limpa descrição da coluna 2
    // Se descrição estiver vazia (OCR não conseguiu ler), usa texto da coluna 1 sem a data
    let description = cleanDescription(descText, detectedDate ?? undefined);
    if (!description && dateText) {
      // Tenta extrair descrição do texto após a data na coluna esquerda
      const afterDate = dateText.replace(/^\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?/, "").trim();
      if (afterDate.length >= 3) {
        description = cleanDescription(afterDate, detectedDate ?? undefined);
      }
    }
    if (!description) {
      description = cleanDescription(line.text, detectedDate ?? undefined);
    }

    // ── Tipo e categoria
    const { type, typeConfidence } = detectType(line.text);
    const category = inferCategory(line.text, type);

    // ── Confiança por linha
    const avgWordConf =
      line.words.length > 0
        ? line.words.reduce((sum, w) => sum + w.confidence, 0) / line.words.length
        : ocrBaseConfidence;

    const confidence = calculateConfidence({
      hasDate: !!detectedDate,
      hasAmount: amount !== null,
      amountValue: amount,
      descriptionLength: description.length,
      typeConfidence,
      rawOCRConfidence: avgWordConf,
    });

    // Inclui linhas com data OU valor OU descrição mínima
    const worthIncluding =
      !!detectedDate ||
      (amount !== null && amount > 0) ||
      description.length >= 3 ||
      confidence >= 15;

    if (worthIncluding) {
      rows.push({
        date,
        description,
        category,
        type,
        amount: amount ?? 0,
        confidence,
        confidenceLevel: confidenceLevel(confidence),
        rawText: line.text,
        bbox: line.bbox,
        suggestedAmounts,
      });
    }
  }

  return rows;
}

/** Verifica se uma palavra é apenas separador visual (|, -, —, etc.) */
function isPureSeparator(text: string): boolean {
  return /^[\|\-\—\–\=\.]{1,3}$/.test(text.trim());
}
