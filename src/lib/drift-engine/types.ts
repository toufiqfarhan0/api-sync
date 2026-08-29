import { ApiChange } from "../api-parser/types";
import { DocumentationContext } from "../doc-collector/types";

export type DriftStatus = "CONFIRMED_DRIFT" | "NO_DRIFT" | "UNCERTAIN";

export type DriftSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface DriftAnalysisInput {
  apiChanges: ApiChange[];
  docContexts: DocumentationContext[];
}

export interface DriftAnalysisResult {
  status: DriftStatus;
  severity: DriftSeverity;
  summary: string;
  explanation: string;
  affectedApiChangesCount: number;
  affectedDocFiles: string[];
  missingInformation: string[];
  outdatedInformation: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoningEvidence: string[];
}

export class DriftEngineError extends Error {
  public readonly code: "MISSING_API_KEY" | "INVALID_INPUT" | "API_FAILURE" | "MALFORMED_OUTPUT" | "RATE_LIMITED";

  constructor(
    message: string,
    code: "MISSING_API_KEY" | "INVALID_INPUT" | "API_FAILURE" | "MALFORMED_OUTPUT" | "RATE_LIMITED"
  ) {
    super(message);
    this.name = "DriftEngineError";
    this.code = code;
  }
}
