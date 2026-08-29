import { GoogleGenAI } from "@google/genai";
import { CustomGeminiClient, DEFAULT_GEMINI_MODEL } from "../drift-engine/engine";
import { buildDocGeneratorPrompt } from "./prompt";
import { DocGeneratorError, loadApiDocumentationSkill } from "./skillLoader";
import { DocGeneratorInput, DocumentationGenerationResult } from "./types";

export function validateAndParseGenerationResult(rawJson: string): DocumentationGenerationResult {
  if (!rawJson || !rawJson.trim()) {
    throw new DocGeneratorError("Gemini returned an empty response.", "MALFORMED_OUTPUT");
  }

  let parsed: unknown;
  try {
    const cleanedJson = rawJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleanedJson);
  } catch {
    throw new DocGeneratorError("Gemini generation output was not valid JSON.", "MALFORMED_OUTPUT");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new DocGeneratorError("Parsed Gemini generation output is not an object.", "MALFORMED_OUTPUT");
  }

  const res = parsed as Record<string, unknown>;

  return {
    success: typeof res.success === "boolean" ? res.success : true,
    format: "markdown",
    targetFile: (res.targetFile as string) || "README.md",
    generatedContent: (res.generatedContent as string) || "",
    summary: (res.summary as string) || "Generated documentation update.",
    warnings: Array.isArray(res.warnings) ? (res.warnings as string[]) : [],
    confidence: (res.confidence as DocumentationGenerationResult["confidence"]) || "HIGH",
  };
}

export async function generateDocUpdate(
  input: DocGeneratorInput,
  options?: {
    apiKey?: string;
    model?: string;
    baseDir?: string;
    clientOverride?: CustomGeminiClient;
  }
): Promise<DocumentationGenerationResult> {
  const { apiChanges, docContexts, driftAnalysis } = input;

  // If no drift was detected, return early
  if (driftAnalysis.status === "NO_DRIFT") {
    return {
      success: true,
      format: "markdown",
      targetFile: docContexts[0]?.matchedFile || "README.md",
      generatedContent: "",
      summary: "No documentation update generated because no documentation drift was detected.",
      warnings: [],
      confidence: "HIGH",
    };
  }

  // Load authoritative SkillPatch instructions from disk
  const skillInstructions = loadApiDocumentationSkill(options?.baseDir);

  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  const model = options?.model || DEFAULT_GEMINI_MODEL;

  if (!apiKey && !options?.clientOverride) {
    throw new DocGeneratorError(
      "GEMINI_API_KEY environment variable is missing. Server-side Gemini credential is required.",
      "MISSING_API_KEY"
    );
  }

  const prompt = buildDocGeneratorPrompt(apiChanges, docContexts, driftAnalysis, skillInstructions);

  try {
    let responseText = "";

    if (options?.clientOverride) {
      const res = await options.clientOverride.generateContent({
        model,
        contents: [prompt],
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = res.response.text;
    } else {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      responseText = response.text || "";
    }

    return validateAndParseGenerationResult(responseText);
  } catch (err: unknown) {
    if (err instanceof DocGeneratorError) throw err;

    const error = err as { message?: string };
    throw new DocGeneratorError(
      `Documentation generation failed: ${error.message || "Unknown error"}`,
      "GENERATION_FAILED"
    );
  }
}
