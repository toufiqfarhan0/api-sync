import { ApiChange } from "../api-parser/types";

export interface DocumentationFile {
  filePath: string;
  content: string;
}

export interface MatchedSection {
  headingTitle?: string;
  headingLevel?: number;
  contentSnippet: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface DocumentationContext {
  apiChange: ApiChange;
  matchedFile: string;
  matchedSections: MatchedSection[];
  matchReason: "EXACT_PATH" | "METHOD_AND_PATH" | "ROUTE_KEYWORD" | "HEADING_MATCH";
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface CollectorResult {
  contexts: DocumentationContext[];
  totalDocFilesInspected: number;
  matchedFilesCount: number;
  unmatchedChanges: ApiChange[];
}
