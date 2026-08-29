export const DEFAULT_GEMINI_MODEL_SEQUENCE = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;

export interface GeminiRouterMetadata {
  modelUsed: string;
  fallbackUsed: boolean;
  attemptedModels: string[];
}

export interface CustomGeminiClient {
  generateContent(args: {
    model: string;
    contents: string[];
    config?: {
      systemInstruction?: string;
      responseMimeType?: string;
    };
  }): Promise<{ response: { text: string } }>;
}

export interface GeminiGenerationOptions {
  apiKey?: string;
  systemInstruction?: string;
  responseMimeType?: string;
  modelSequence?: readonly string[];
  clientOverride?: CustomGeminiClient;
}

export interface GeminiRouterResult {
  responseText: string;
  metadata: GeminiRouterMetadata;
}

export class GeminiRouterError extends Error {
  public readonly code: "MISSING_API_KEY" | "INVALID_INPUT" | "ALL_MODELS_FAILED" | "NON_RETRYABLE_ERROR";
  public readonly attemptedModels: string[];

  constructor(
    message: string,
    code: "MISSING_API_KEY" | "INVALID_INPUT" | "ALL_MODELS_FAILED" | "NON_RETRYABLE_ERROR",
    attemptedModels: string[] = []
  ) {
    super(message);
    this.name = "GeminiRouterError";
    this.code = code;
    this.attemptedModels = attemptedModels;
  }
}
