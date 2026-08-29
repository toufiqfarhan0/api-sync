import { ApiChange } from "../api-parser/types";
import {
  CollectorResult,
  DocumentationContext,
  DocumentationFile,
  MatchedSection,
} from "./types";

export function isDocFileCandidate(filePath: string): boolean {
  if (!filePath) return false;
  const lower = filePath.toLowerCase();
  if (!lower.endsWith(".md") && !lower.endsWith(".markdown")) return false;
  return lower === "readme.md" || lower.startsWith("docs/") || lower.includes("/docs/");
}

interface MarkdownSection {
  headingTitle?: string;
  headingLevel?: number;
  content: string;
  lineStart: number;
  lineEnd: number;
}

export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  if (!markdown || !markdown.trim()) return [];

  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];

  let currentHeadingTitle: string | undefined;
  let currentHeadingLevel: number | undefined;
  let currentLines: string[] = [];
  let sectionStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      if (currentLines.join("").trim().length > 0 || currentHeadingTitle) {
        sections.push({
          headingTitle: currentHeadingTitle,
          headingLevel: currentHeadingLevel,
          content: currentLines.join("\n").trim(),
          lineStart: sectionStartLine,
          lineEnd: i,
        });
      }

      currentHeadingLevel = headingMatch[1].length;
      currentHeadingTitle = headingMatch[2].trim();
      currentLines = [line];
      sectionStartLine = i + 1;
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.join("").trim().length > 0 || currentHeadingTitle) {
    sections.push({
      headingTitle: currentHeadingTitle,
      headingLevel: currentHeadingLevel,
      content: currentLines.join("\n").trim(),
      lineStart: sectionStartLine,
      lineEnd: lines.length,
    });
  }

  return sections;
}

export function matchChangeToSections(
  apiChange: ApiChange,
  docFile: DocumentationFile
): DocumentationContext | null {
  if (!docFile.content || !docFile.content.trim()) return null;

  const sections = parseMarkdownSections(docFile.content);
  const matchedSections: MatchedSection[] = [];
  let matchReason: DocumentationContext["matchReason"] = "EXACT_PATH";
  let confidence: DocumentationContext["confidence"] = "LOW";

  const pathLower = apiChange.path.toLowerCase();
  const methodLower = apiChange.method.toLowerCase();
  const normalizedPath = pathLower.replace(/[:{}]/g, "");

  for (const section of sections) {
    const contentLower = section.content.toLowerCase();
    const headingLower = (section.headingTitle || "").toLowerCase();

    const containsPathExact = contentLower.includes(pathLower);
    const containsMethod = contentLower.includes(methodLower) || headingLower.includes(methodLower);
    const containsNormalizedPath = normalizedPath.length > 2 && contentLower.includes(normalizedPath);

    if (containsPathExact && containsMethod) {
      matchedSections.push({
        headingTitle: section.headingTitle,
        headingLevel: section.headingLevel,
        contentSnippet: section.content,
        lineStart: section.lineStart,
        lineEnd: section.lineEnd,
      });
      matchReason = "METHOD_AND_PATH";
      confidence = "HIGH";
    } else if (containsPathExact) {
      matchedSections.push({
        headingTitle: section.headingTitle,
        headingLevel: section.headingLevel,
        contentSnippet: section.content,
        lineStart: section.lineStart,
        lineEnd: section.lineEnd,
      });
      matchReason = "EXACT_PATH";
      confidence = "HIGH";
    } else if (headingLower.includes(pathLower) || (normalizedPath.length > 3 && headingLower.includes(normalizedPath))) {
      matchedSections.push({
        headingTitle: section.headingTitle,
        headingLevel: section.headingLevel,
        contentSnippet: section.content,
        lineStart: section.lineStart,
        lineEnd: section.lineEnd,
      });
      matchReason = "HEADING_MATCH";
      confidence = "MEDIUM";
    } else if (containsNormalizedPath) {
      matchedSections.push({
        headingTitle: section.headingTitle,
        headingLevel: section.headingLevel,
        contentSnippet: section.content,
        lineStart: section.lineStart,
        lineEnd: section.lineEnd,
      });
      matchReason = "ROUTE_KEYWORD";
      confidence = "MEDIUM";
    }
  }

  if (matchedSections.length === 0) return null;

  return {
    apiChange,
    matchedFile: docFile.filePath,
    matchedSections,
    matchReason,
    confidence,
  };
}

export function collectDocContextForChanges(
  apiChanges: ApiChange[],
  docFiles: DocumentationFile[]
): CollectorResult {
  const contexts: DocumentationContext[] = [];
  const candidateDocFiles = docFiles.filter((f) => isDocFileCandidate(f.filePath));
  const matchedFilePaths = new Set<string>();
  const unmatchedChanges: ApiChange[] = [];

  for (const change of apiChanges) {
    let matchedForChange = false;

    for (const docFile of candidateDocFiles) {
      const match = matchChangeToSections(change, docFile);
      if (match) {
        contexts.push(match);
        matchedFilePaths.add(docFile.filePath);
        matchedForChange = true;
      }
    }

    if (!matchedForChange) {
      unmatchedChanges.push(change);
    }
  }

  return {
    contexts,
    totalDocFilesInspected: candidateDocFiles.length,
    matchedFilesCount: matchedFilePaths.size,
    unmatchedChanges,
  };
}
