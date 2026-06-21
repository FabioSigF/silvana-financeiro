import { GeminiError, GeminiErrorType } from "./types";

/**
 * Mapeia erros em mensagens legíveis e amigáveis para o usuário.
 * Nunca expõe stack traces ou chaves de API.
 */
export function getFriendlyMessage(type: GeminiErrorType): string {
  switch (type) {
    case GeminiErrorType.RATE_LIMIT:
      return "Muitas solicitações foram realizadas. Tente novamente em alguns instantes.";
    case GeminiErrorType.QUOTA_EXCEEDED:
      return "O limite diário de processamento foi atingido. Tente novamente mais tarde.";
    case GeminiErrorType.INVALID_API_KEY:
      return "Erro de configuração da IA. Entre em contato com o administrador.";
    case GeminiErrorType.TIMEOUT:
      return "A análise demorou mais do que o esperado. Tente novamente.";
    case GeminiErrorType.NETWORK_ERROR:
      return "Erro de conexão com o servidor. Verifique sua conexão de rede e tente novamente.";
    case GeminiErrorType.IMAGE_TOO_LARGE:
      return "Imagem muito grande. Envie uma imagem menor.";
    case GeminiErrorType.UNSUPPORTED_FORMAT:
      return "Formato de arquivo não suportado. Use JPG, JPEG, PNG ou WEBP.";
    case GeminiErrorType.EMPTY_RESULT:
      return "Nenhum lançamento financeiro foi identificado. Verifique a qualidade da imagem.";
    case GeminiErrorType.INVALID_JSON:
    case GeminiErrorType.INVALID_RESPONSE:
      return "Falha ao ler os dados estruturados da imagem. Tente novamente.";
    case GeminiErrorType.SERVER_ERROR:
      return "Ocorreu um erro temporário no servidor de análise. Tente novamente em breve.";
    case GeminiErrorType.UNKNOWN_ERROR:
    default:
      return "Ocorreu um erro inesperado. Tente novamente.";
  }
}

interface LogMetadata {
  fileName?: string;
  fileSize?: number;
  processingTime?: number;
}

/**
 * Registra o erro de forma estruturada no log do console
 * garantindo a exclusão de dados sensíveis ou chaves de API.
 */
export function logStructuredError(
  type: GeminiErrorType,
  message: string,
  meta?: LogMetadata
): void {
  const logPayload = {
    timestamp: new Date().toISOString(),
    errorType: type,
    message: cleanSensitiveData(message),
    fileName: meta?.fileName,
    fileSize: meta?.fileSize,
    processingTime: meta?.processingTime,
  };
  console.error("[Gemini Error Log]", JSON.stringify(logPayload, null, 2));
}

/**
 * Remove chaves de API e informações que possam ser sensíveis das mensagens de erro.
 */
function cleanSensitiveData(msg: string): string {
  if (!msg) return "";
  // Remove padrões parecidos com chaves do Google (ex: AIzaSy...) ou chaves no formato AQ.
  return msg
    .replace(/AIzaSy[A-Za-z0-9_-]{35}/g, "[API_KEY_REDACTED]")
    .replace(/AQ\.[A-Za-z0-9_-]{40,100}/g, "[API_KEY_REDACTED]");
}

/**
 * Analisa qualquer erro capturado e o converte em um GeminiError estruturado.
 */
export function parseToGeminiError(err: unknown, meta?: LogMetadata): GeminiError {
  if (err instanceof GeminiError) {
    logStructuredError(err.type, err.message, meta);
    return err;
  }

  const rawMessage = err instanceof Error ? err.message : String(err);
  const lowercaseMsg = rawMessage.toLowerCase();
  
  let type = GeminiErrorType.UNKNOWN_ERROR;
  let status: number | undefined = undefined;

  // Analisa código de status HTTP do Next ou da API Gemini
  if (err && typeof err === "object") {
    if ("status" in err && typeof err.status === "number") {
      status = err.status;
    } else if ("statusCode" in err && typeof err.statusCode === "number") {
      status = err.statusCode;
    }
  }

  // Verifica timeouts
  if (lowercaseMsg.includes("timeout") || lowercaseMsg.includes("aborted") || lowercaseMsg.includes("abort")) {
    type = GeminiErrorType.TIMEOUT;
  }
  // Verifica chaves inválidas (401, 403, etc)
  else if (
    status === 401 ||
    status === 403 ||
    lowercaseMsg.includes("invalid api key") ||
    lowercaseMsg.includes("key not valid") ||
    lowercaseMsg.includes("api key") && (lowercaseMsg.includes("not found") || lowercaseMsg.includes("invalid"))
  ) {
    type = GeminiErrorType.INVALID_API_KEY;
  }
  // Verifica cota excedida ou exaustão
  else if (
    lowercaseMsg.includes("quota exceeded") ||
    lowercaseMsg.includes("resource exhausted") ||
    lowercaseMsg.includes("daily limit exceeded") ||
    lowercaseMsg.includes("resource_exhausted")
  ) {
    type = GeminiErrorType.QUOTA_EXCEEDED;
  }
  // Verifica limite de requisições / rate limit (429)
  else if (status === 429 || lowercaseMsg.includes("too many requests") || lowercaseMsg.includes("429")) {
    type = GeminiErrorType.RATE_LIMIT;
  }
  // Erros de rede (fetch failed, net::ERR)
  else if (
    lowercaseMsg.includes("fetch failed") ||
    lowercaseMsg.includes("network error") ||
    lowercaseMsg.includes("dns") ||
    lowercaseMsg.includes("connect")
  ) {
    type = GeminiErrorType.NETWORK_ERROR;
  }
  // Erro 5xx do Servidor
  else if (status && status >= 500 && status < 600) {
    type = GeminiErrorType.SERVER_ERROR;
  }

  const friendlyMessage = getFriendlyMessage(type);
  const finalError = new GeminiError(type, {
    message: friendlyMessage,
    statusCode: status,
    fileName: meta?.fileName,
    fileSize: meta?.fileSize,
    processingTime: meta?.processingTime,
    rawError: err,
  });

  logStructuredError(type, rawMessage, meta);
  return finalError;
}
