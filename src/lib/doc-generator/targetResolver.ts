import { DocumentationContext } from "../doc-collector/types";

export function resolveTargetDocFile(
  docContexts: DocumentationContext[],
  fallbackFile = "README.md"
): string {
  if (!docContexts || docContexts.length === 0) {
    return fallbackFile;
  }

  // Priority ranking for match reason & confidence
  const rankMatch = (ctx: DocumentationContext): number => {
    let score = 0;
    if (ctx.confidence === "HIGH") score += 100;
    if (ctx.confidence === "MEDIUM") score += 50;

    if (ctx.matchReason === "METHOD_AND_PATH") score += 40;
    else if (ctx.matchReason === "EXACT_PATH") score += 30;
    else if (ctx.matchReason === "HEADING_MATCH") score += 20;
    else if (ctx.matchReason === "ROUTE_KEYWORD") score += 10;

    return score;
  };

  const sorted = [...docContexts].sort((a, b) => rankMatch(b) - rankMatch(a));
  return sorted[0]?.matchedFile || fallbackFile;
}
