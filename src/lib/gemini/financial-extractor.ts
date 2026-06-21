import { ExtractorResult, GeminiError, GeminiErrorType, RawFinancialEntry } from "./types";
import { validateImage, cleanJsonText, validateResponseStructure, normalizeEntry } from "./validator";
import { sendToOcrApi } from "./client";
import { retryWithBackoff } from "./retry";
import { parseToGeminiError } from "./error-handler";

interface ExtractorMetadata {
  fileName?: string;
  fileSize?: number;
}

/**
 * Ponto de entrada robusto para extração de lançamentos financeiros via Gemini Vision.
 * Executa validações locais, chamadas protegidas com retry temporário e normalizações completas.
 */
export async function extractFinancialEntries(
  imageFile: File | Blob,
  metadata: ExtractorMetadata = {}
): Promise<ExtractorResult> {
  const start = Date.now();
  const fileName = metadata.fileName || (imageFile instanceof File ? imageFile.name : "imagem.jpg");
  const fileSize = metadata.fileSize || imageFile.size;

  try {
    // 1. Validação local da Imagem (Tamanho e Formato)
    validateImage(imageFile);

    // 2. Prepara FormData
    const formData = new FormData();
    const uploadFile =
      imageFile instanceof File
        ? imageFile
        : new File([imageFile], fileName, { type: imageFile.type || "image/jpeg" });
    
    formData.append("image", uploadFile);

    // 3. Execução da chamada API com Retry Automático
    const rawResponse = await retryWithBackoff(
      async () => {
        return await sendToOcrApi(formData);
      },
      {
        maxRetries: 2, // tentativa inicial + 2 retries = total 3 tentativas
        initialDelayMs: 2000,
        backoffFactor: 2,
      }
    );

    // 4. Limpeza e Parse do JSON retornado pela API Route
    // A API Route nos devolve { entries: [...] }
    let rawEntries: any[] = [];
    let textForParsing = "";

    if (rawResponse && rawResponse.entries) {
      rawEntries = rawResponse.entries;
      textForParsing = JSON.stringify(rawResponse);
    } else if (rawResponse && typeof rawResponse === "string") {
      // Caso a API Route retorne texto bruto ou JSON envelopado como string
      const cleanedText = cleanJsonText(rawResponse);
      try {
        const parsed = JSON.parse(cleanedText);
        rawEntries = validateResponseStructure(parsed);
        textForParsing = cleanedText;
      } catch (jsonErr) {
        throw new GeminiError(GeminiErrorType.INVALID_JSON, {
          message: "A resposta da IA não pôde ser decodificada no formato de dados correto (JSON inválido).",
          rawError: jsonErr,
        });
      }
    } else {
      throw new GeminiError(GeminiErrorType.INVALID_RESPONSE, {
        message: "Resposta da API com estrutura inesperada ou nula.",
      });
    }

    // 5. Validação estrutural de "entries"
    if (!Array.isArray(rawEntries)) {
      throw new GeminiError(GeminiErrorType.INVALID_RESPONSE, {
        message: "Estrutura JSON inválida: 'entries' não é uma lista.",
      });
    }

    if (rawEntries.length === 0) {
      throw new GeminiError(GeminiErrorType.EMPTY_RESULT, {
        message: "Nenhum lançamento financeiro foi identificado. Verifique a qualidade da imagem.",
      });
    }

    // 6. Normalização de dados individuais de cada linha
    const normalizedEntries = rawEntries.map(normalizeEntry);

    const durationMs = Date.now() - start;

    // Log de sucesso estruturado
    console.log(
      `[Gemini Extraction Success] Arquivo: ${fileName} | Tamanho: ${(fileSize / 1024).toFixed(1)} KB | Lançamentos: ${
        normalizedEntries.length
      } | Tempo: ${(durationMs / 1000).toFixed(1)}s`
    );

    // Constrói rawText de compatibilidade
    const rawText = normalizedEntries
      .map((e) => `${e.date} | ${e.description} | ${e.amount}`)
      .join("\n");

    return {
      entries: normalizedEntries,
      rawText,
      processingTimeMs: durationMs,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    // Garante que o erro retornado seja do tipo GeminiError
    throw parseToGeminiError(err, {
      fileName,
      fileSize,
      processingTime: durationMs,
    });
  }
}
