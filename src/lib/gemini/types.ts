export enum GeminiErrorType {
  RATE_LIMIT = "RATE_LIMIT",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  INVALID_API_KEY = "INVALID_API_KEY",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  INVALID_JSON = "INVALID_JSON",
  IMAGE_TOO_LARGE = "IMAGE_TOO_LARGE",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  EMPTY_RESULT = "EMPTY_RESULT",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export interface GeminiErrorDetails {
  message: string;
  statusCode?: number;
  fileName?: string;
  fileSize?: number;
  processingTime?: number;
  rawError?: unknown;
}

export class GeminiError extends Error {
  type: GeminiErrorType;
  details: GeminiErrorDetails;

  constructor(type: GeminiErrorType, details: GeminiErrorDetails) {
    super(details.message);
    this.name = "GeminiError";
    this.type = type;
    this.details = details;
    Object.setPrototypeOf(this, GeminiError.prototype);
  }
}

export interface RawFinancialEntry {
  date: string;
  description: string;
  type: "entrada" | "saída" | string;
  amount: number;
  confidence: number;
}

export interface ExtractorResult {
  entries: RawFinancialEntry[];
  rawText: string;
  processingTimeMs: number;
}
