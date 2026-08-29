import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_GEMINI_MODEL_SEQUENCE,
  GeminiGenerationOptions,
  GeminiRouterError,
  GeminiRouterResult,
} from "./types";

export function isRetryableModelError(err: unknown): boolean {
  if (!err) return false;

  const error = err as { message?: string; status?: number; statusCode?: number; code?: number };
  const message = (error.message || "").toLowerCase();
  const status = error.status || error.statusCode || error.code;

  // 1. Rate limits / Quota
  if (status === 429 || message.includes("429") || message.includes("rate limit") || message.includes("resource_exhausted")) {
    return true;
  }

  // 2. Model 404 / unavailable / deprecated
  if (
    status === 404 ||
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("no longer available") ||
    message.includes("model_not_found")
  ) {
    return true;
  }

  // 3. Temporary server 5xx errors
  if (status && status >= 500 && status <= 599) {
    return true;
  }

  if (message.includes("500") || message.includes("503") || message.includes("service unavailable")) {
    return true;
  }

  return false;
}

export async function generateWithGemini(
  prompt: string,
  options?: GeminiGenerationOptions
): Promise<GeminiRouterResult> {
  if (!prompt || !prompt.trim()) {
    throw new GeminiRouterError("Prompt cannot be empty.", "INVALID_INPUT");
  }

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey && !options?.clientOverride) {
    throw new GeminiRouterError(
      "GEMINI_API_KEY environment variable is missing. Server-side Gemini credential is required.",
      "MISSING_API_KEY"
    );
  }

  const modelsToAttempt = options?.modelSequence || DEFAULT_GEMINI_MODEL_SEQUENCE;
  const attemptedModels: string[] = [];
  let lastError: unknown;

  for (let i = 0; i < modelsToAttempt.length; i++) {
    const currentModel = modelsToAttempt[i];
    attemptedModels.push(currentModel);

    try {
      let responseText = "";

      if (options?.clientOverride) {
        const res = await options.clientOverride.generateContent({
          model: currentModel,
          contents: [prompt],
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: options.responseMimeType,
          },
        });
        responseText = res.response?.text || "";
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            systemInstruction: options?.systemInstruction,
            responseMimeType: options?.responseMimeType,
          },
        });
        responseText = response.text || "";
      }

      const fallbackUsed = i > 0;

      return {
        responseText,
        metadata: {
          modelUsed: currentModel,
          fallbackUsed,
          attemptedModels: [...attemptedModels],
        },
      };
    } catch (err: unknown) {
      lastError = err;

      // Check if error is retryable for model fallback
      if (isRetryableModelError(err)) {
        // Continue to next fallback model in sequence
        continue;
      }

      // Non-retryable error (e.g. prompt bug / bad auth) -> throw immediately
      const errMsg = err instanceof Error ? err.message : "Non-retryable Gemini error.";
      throw new GeminiRouterError(`Non-retryable error: ${errMsg}`, "NON_RETRYABLE_ERROR", attemptedModels);
    }
  }

  const lastErrMsg = lastError instanceof Error ? lastError.message : "All fallback models failed.";
  throw new GeminiRouterError(
    `All configured Gemini models failed. Attempted: [${attemptedModels.join(", ")}]. Last error: ${lastErrMsg}`,
    "ALL_MODELS_FAILED",
    attemptedModels
  );
}
