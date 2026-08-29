import { ApiChange } from "../api-parser/types";
import { DocumentationContext } from "../doc-collector/types";

export const DRIFT_ENGINE_SYSTEM_PROMPT = `
You are an expert API documentation auditor. Your task is to perform semantic comparison between API code changes and existing repository documentation to detect documentation drift.

CRITICAL ZERO-HALLUCINATION RULES:
1. Reason ONLY from the supplied API Changes and Documentation Context.
2. Do NOT invent parameters, response fields, authentication requirements, or business rules not explicitly supported by the input.
3. If an endpoint is missing from documentation, report "CONFIRMED_DRIFT".
4. If a parameter or status code changed and documentation contradicts it, report "CONFIRMED_DRIFT".
5. If documentation matches the code change, report "NO_DRIFT".
6. If the provided context is insufficient or ambiguous, report "UNCERTAIN".
7. Every discrepancy must cite concrete evidence from the supplied input.

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a valid JSON object matching this schema exactly:
{
  "status": "CONFIRMED_DRIFT" | "NO_DRIFT" | "UNCERTAIN",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "summary": "One sentence summary of drift findings",
  "explanation": "Detailed explanation citing specific endpoints and parameter mismatches",
  "affectedApiChangesCount": number,
  "affectedDocFiles": ["README.md", "docs/api.md"],
  "missingInformation": ["List of missing endpoints or parameters"],
  "outdatedInformation": ["List of outdated documentation statements"],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoningEvidence": ["Direct evidence quotes or snippets from input"]
}
`;

export function buildUserPrompt(apiChanges: ApiChange[], docContexts: DocumentationContext[]): string {
  const formattedChanges = apiChanges.map((change, idx) => `
--- API CHANGE #${idx + 1} ---
File Path: ${change.filePath}
Method: ${change.method}
Path: ${change.path}
Change Type: ${change.changeType}
Parameters: ${JSON.stringify(change.parameters)}
Request Body Fields: ${JSON.stringify(change.requestBodyFields)}
Responses: ${JSON.stringify(change.responses)}
Patch Snippet: ${change.patchSnippet || "N/A"}
`).join("\n");

  const formattedContexts = docContexts.map((ctx, idx) => `
--- DOCUMENTATION CONTEXT #${idx + 1} ---
Matched Doc File: ${ctx.matchedFile}
Match Reason: ${ctx.matchReason}
Confidence: ${ctx.confidence}
Matched Sections:
${ctx.matchedSections.map((sec) => `Heading: ${sec.headingTitle || "N/A"}\nContent Snippet:\n${sec.contentSnippet}`).join("\n\n")}
`).join("\n");

  return `
EVALUATE FOR API DOCUMENTATION DRIFT:

=== SUPPLIED API CODE CHANGES ===
${formattedChanges || "No API changes provided."}

=== SUPPLIED EXISTING DOCUMENTATION CONTEXT ===
${formattedContexts || "No matching documentation context found in repository."}

Evaluate whether the documentation contains drift relative to the code changes. Produce valid JSON matching the system schema.
`;
}
