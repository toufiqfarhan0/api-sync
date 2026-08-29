import { ApiChange } from "../api-parser/types";
import { DocumentationContext } from "../doc-collector/types";
import { DriftAnalysisResult } from "../drift-engine/types";
import { GeminiRouterMetadata } from "../gemini/types";

export interface DocGeneratorInput {
  apiChanges: ApiChange[];
  docContexts: DocumentationContext[];
  driftAnalysis: DriftAnalysisResult;
}

export interface DocumentationGenerationResult {
  success: boolean;
  format: "markdown";
  targetFile: string;
  generatedContent: string;
  summary: string;
  warnings: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  modelMetadata?: GeminiRouterMetadata;
}
