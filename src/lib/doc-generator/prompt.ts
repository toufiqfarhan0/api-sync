import { ApiChange } from "../api-parser/types";
import { DocumentationContext } from "../doc-collector/types";
import { DriftAnalysisResult } from "../drift-engine/types";

export function buildDocGeneratorPrompt(
  apiChanges: ApiChange[],
  docContexts: DocumentationContext[],
  driftAnalysis: DriftAnalysisResult,
  skillInstructions: string
): string {
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
--- EXISTING DOCUMENTATION SNIPPET #${idx + 1} ---
File: ${ctx.matchedFile}
Reason: ${ctx.matchReason}
Matched Sections:
${ctx.matchedSections.map((sec) => `Heading: ${sec.headingTitle || "N/A"}\nContent:\n${sec.contentSnippet}`).join("\n\n")}
`).join("\n");

  return `
You are an expert API documentation generator.
Use the following AUTHORITATIVE SKILLPATCH INSTRUCTIONS to format and structure the documentation update.

=== AUTHORITATIVE SKILLPATCH INSTRUCTIONS (.latentcode/skills/api-documentation/SKILL.md) ===
${skillInstructions}

=== DRIFT ANALYSIS ANALYSIS RESULTS ===
Status: ${driftAnalysis.status}
Severity: ${driftAnalysis.severity}
Summary: ${driftAnalysis.summary}
Explanation: ${driftAnalysis.explanation}
Missing Info: ${JSON.stringify(driftAnalysis.missingInformation)}
Outdated Info: ${JSON.stringify(driftAnalysis.outdatedInformation)}

=== CHANGED API CODE ===
${formattedChanges || "No code changes provided."}

=== EXISTING DOCUMENTATION CONTEXT ===
${formattedContexts || "No existing documentation found."}

TASK:
Generate a targeted Markdown documentation update section that resolves the detected documentation drift according to the SkillPatch formatting instructions.

REQUIRED OUTPUT SCHEMA (JSON):
Respond with a JSON object matching this schema exactly:
{
  "success": true,
  "format": "markdown",
  "targetFile": "README.md" (or primary affected doc file name),
  "generatedContent": "Precise, formatted Markdown documentation snippet or section containing endpoint table, parameter descriptions, request/response models, and curl example",
  "summary": "One sentence summary of generated documentation updates",
  "warnings": ["Any warnings or uncertainties about inferred details"],
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}
`;
}
