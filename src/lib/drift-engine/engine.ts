import { GoogleGenAI } from "@google/genai";
import { buildUserPrompt, DRIFT_ENGINE_SYSTEM_PROMPT } from "./prompt";
import {
  DriftAnalysisInput,
  DriftAnalysisResult,
  DriftEngineError,
} from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

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

export function validateAndParseDriftResult(rawJson: string): DriftAnalysisResult {
  if (!rawJson || !rawJson.trim()) {
    throw new DriftEngineError("Gemini returned an empty response.", "MALFORMED_OUTPUT");
  }

  let parsed: unknown;
  try {
    const cleanedJson = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleanedJson);
  } catch {
    throw new DriftEngineError("Gemini output was not valid JSON.", "MALFORMED_OUTPUT");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new DriftEngineError("Parsed Gemini output is not an object.", "MALFORMED_OUTPUT");
  }

  const res = parsed as Record<string, unknown>;

  const validStatuses = ["CONFIRMED_DRIFT", "NO_DRIFT", "UNCERTAIN"];
  if (!validStatuses.includes(res.status as string)) {
    throw new DriftEngineError(`Invalid or missing drift status: ${res.status}`, "MALFORMED_OUTPUT");
  }

  return {
    status: res.status as DriftAnalysisResult["status"],
    severity: (res.severity as DriftAnalysisResult["severity"]) || "NONE",
    summary: (res.summary as string) || "No summary provided.",
    explanation: (res.explanation as string) || "No explanation provided.",
    affectedApiChangesCount: typeof res.affectedApiChangesCount === "number" ? res.affectedApiChangesCount : 0,
    affectedDocFiles: Array.isArray(res.affectedDocFiles) ? (res.affectedDocFiles as string[]) : [],
    missingInformation: Array.isArray(res.missingInformation) ? (res.missingInformation as string[]) : [],
    outdatedInformation: Array.isArray(res.outdatedInformation) ? (res.outdatedInformation as string[]) : [],
    confidence: (res.confidence as DriftAnalysisResult["confidence"]) || "MEDIUM",
    reasoningEvidence: Array.isArray(res.reasoningEvidence) ? (res.reasoningEvidence as string[]) : [],
  };
}

export async function analyzeDocDrift(
  input: DriftAnalysisInput,
  options?: { apiKey?: string; model?: string; clientOverride?: CustomGeminiClient }
): Promise<DriftAnalysisResult> {
  const { apiChanges, docContexts } = input;

  if (!apiChanges || apiChanges.length === 0) {
    return {
      status: "NO_DRIFT",
      severity: "NONE",
      summary: "No API changes were provided to evaluate.",
      explanation: "Without code changes, no documentation drift can be identified.",
      affectedApiChangesCount: 0,
      affectedDocFiles: [],
      missingInformation: [],
      outdatedInformation: [],
      confidence: "HIGH",
      reasoningEvidence: ["No API changes supplied in input."],
    };
  }

  // Handle case where docContexts is empty (e.g. new endpoint with zero existing docs)
  if (!docContexts || docContexts.length === 0) {
    const undocumentedPaths = apiChanges.map((c) => `${c.method} ${c.path}`);
    return {
      status: "CONFIRMED_DRIFT",
      severity: "HIGH",
      summary: "API changes detected but no matching documentation was found in repository.",
      explanation: `The following API endpoints have code changes but lack any matching documentation sections: ${undocumentedPaths.join(", ")}.`,
      affectedApiChangesCount: apiChanges.length,
      affectedDocFiles: [],
      missingInformation: undocumentedPaths.map((p) => `Complete documentation missing for ${p}`),
      outdatedInformation: [],
      confidence: "HIGH",
      reasoningEvidence: undocumentedPaths.map((p) => `Endpoint ${p} exists in code diff but not in repository docs.`),
    };
  }

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  const model = options?.model || DEFAULT_GEMINI_MODEL;

  if (!apiKey && !options?.clientOverride) {
    throw new DriftEngineError(
      "GEMINI_API_KEY environment variable is missing. Server-side Gemini credential is required.",
      "MISSING_API_KEY"
    );
  }

  const userPrompt = buildUserPrompt(apiChanges, docContexts);

  try {
    let responseText = "";

    if (options?.clientOverride) {
      const res = await options.clientOverride.generateContent({
        model,
        contents: [userPrompt],
        config: {
          systemInstruction: DRIFT_ENGINE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });
      responseText = res.response.text;
    } else {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: DRIFT_ENGINE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "";
    }

    return validateAndParseDriftResult(responseText);
  } catch (err: unknown) {
    if (err instanceof DriftEngineError) throw err;

    const error = err as { message?: string; status?: number };
    const errMsg = error.message || "Gemini API request failed.";

    if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
      throw new DriftEngineError("Gemini API rate limit exceeded.", "RATE_LIMITED");
    }

    throw new DriftEngineError(`Gemini API call failed: ${errMsg}`, "API_FAILURE");
  }
}
