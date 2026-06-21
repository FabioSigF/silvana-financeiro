import { GeminiError, GeminiErrorType } from "./types";
import { parseToGeminiError } from "./error-handler";

const TIMEOUT_LIMIT_MS = 30000; // 30 segundos

/**
 * Envia o FormData contendo a imagem para a API Route '/api/ocr'.
 * Controla tempo de resposta com abortController (timeout de 30s).
 */
export async function sendToOcrApi(formData: FormData): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_LIMIT_MS);

  try {
    const response = await fetch("/api/ocr", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      
      // Converte status HTTP e mensagens para erro estruturado
      throw new GeminiError(
        response.status === 429 ? GeminiErrorType.RATE_LIMIT : GeminiErrorType.SERVER_ERROR,
        {
          message: errorBody?.message || errorBody?.error || response.statusText || "Falha HTTP",
          statusCode: response.status,
        }
      );
    }

    const data = await response.json();
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // Se o erro foi causado pelo abortController (sinal do timeout)
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new GeminiError(GeminiErrorType.TIMEOUT, {
        message: "A análise demorou mais do que o esperado. Tente novamente.",
        statusCode: 408,
      });
    }

    // Se já é um GeminiError estruturado (como a falha HTTP acima)
    if (err instanceof GeminiError) {
      throw err;
    }

    // Outros erros (ex: rede offline)
    throw parseToGeminiError(err);
  }
}
