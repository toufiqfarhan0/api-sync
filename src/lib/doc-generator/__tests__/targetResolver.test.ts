import { describe, expect, it } from "vitest";
import { ApiChange } from "../../api-parser/types";
import { DocumentationContext } from "../../doc-collector/types";
import { resolveTargetDocFile } from "../targetResolver";

describe("Target Documentation File Resolver", () => {
  const sampleChange: ApiChange = {
    filePath: "src/routes/users.ts",
    method: "GET",
    path: "/api/users",
    changeType: "ADDED",
    parameters: [],
    requestBodyFields: [],
    responses: [],
    confidence: "HIGH",
  };

  it("preserves high-confidence matched file as target (e.g. docs/api.md)", () => {
    const docContexts: DocumentationContext[] = [
      {
        apiChange: sampleChange,
        matchedFile: "docs/api.md",
        matchedSections: [{ headingTitle: "GET /api/users", contentSnippet: "Content" }],
        matchReason: "METHOD_AND_PATH",
        confidence: "HIGH",
      },
    ];

    const target = resolveTargetDocFile(docContexts);
    expect(target).toBe("docs/api.md");
  });

  it("chooses highest confidence match when multiple candidates exist", () => {
    const docContexts: DocumentationContext[] = [
      {
        apiChange: sampleChange,
        matchedFile: "README.md",
        matchedSections: [{ headingTitle: "Overview", contentSnippet: "users keyword" }],
        matchReason: "ROUTE_KEYWORD",
        confidence: "MEDIUM",
      },
      {
        apiChange: sampleChange,
        matchedFile: "docs/users.md",
        matchedSections: [{ headingTitle: "GET /api/users", contentSnippet: "GET /api/users" }],
        matchReason: "METHOD_AND_PATH",
        confidence: "HIGH",
      },
    ];

    const target = resolveTargetDocFile(docContexts);
    expect(target).toBe("docs/users.md");
  });

  it("falls back to README.md when no documentation context matched", () => {
    const target = resolveTargetDocFile([]);
    expect(target).toBe("README.md");
  });
});
