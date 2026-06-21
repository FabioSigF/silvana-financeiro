import { GeminiError, GeminiErrorType } from "./types";

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

/**
 * Aguarda um determinado período de tempo em milissegundos.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executa uma função assíncrona com mecanismo de retry com Exponential Backoff.
 * Aplica retry apenas se o erro gerado for classificado como temporário:
 * TIMEOUT, NETWORK_ERROR ou SERVER_ERROR.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2; // Tentativa inicial + 2 retries (total 3 tentativas)
  let initialDelayMs = options.initialDelayMs ?? 2000;
  const backoffFactor = options.backoffFactor ?? 2;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      
      // Se estourou o número máximo de retries, joga o erro para a frente
      if (attempt > maxRetries) {
        throw err;
      }

      // Determina se o erro é elegível para retry
      let shouldRetry = false;

      if (err instanceof GeminiError) {
        // Retry apenas para erros temporários
        shouldRetry =
          err.type === GeminiErrorType.TIMEOUT ||
          err.type === GeminiErrorType.NETWORK_ERROR ||
          err.type === GeminiErrorType.SERVER_ERROR;
      } else {
        // Se ainda não é um GeminiError estruturado (ex: falhas de rede no fetch inicial)
        const errorMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        const isTimeout = errorMsg.includes("timeout") || errorMsg.includes("abort");
        const isNetwork = errorMsg.includes("fetch failed") || errorMsg.includes("network error") || errorMsg.includes("dns");
        
        shouldRetry = isTimeout || isNetwork;
      }

      if (!shouldRetry) {
        throw err;
      }

      // Calcula o delay com exponential backoff (Tentativa 1 -> 2s, Tentativa 2 -> 4s, etc.)
      const delayMs = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      
      console.warn(
        `[Gemini Retry] Tentativa ${attempt} falhou. Agendando retry em ${delayMs}ms. Erro: ${
          err instanceof Error ? err.message : String(err)
        }`
      );

      if (onRetry) {
        onRetry(attempt, delayMs, err);
      }

      await delay(delayMs);
    }
  }
}
