import { describe, expect, it } from "vitest";
import { ApiChange } from "../../api-parser/types";
import {
  collectDocContextForChanges,
  isDocFileCandidate,
  matchChangeToSections,
  parseMarkdownSections,
} from "../collector";
import { DocumentationFile } from "../types";

describe("Documentation Context Collector", () => {
  describe("isDocFileCandidate", () => {
    it("identifies documentation files", () => {
      expect(isDocFileCandidate("README.md")).toBe(true);
      expect(isDocFileCandidate("docs/api.md")).toBe(true);
      expect(isDocFileCandidate("src/docs/endpoints.markdown")).toBe(true);
    });

    it("rejects non-documentation files", () => {
      expect(isDocFileCandidate("src/app/page.tsx")).toBe(false);
      expect(isDocFileCandidate("package.json")).toBe(false);
      expect(isDocFileCandidate("src/routes/users.ts")).toBe(false);
    });
  });

  describe("parseMarkdownSections", () => {
    it("parses Markdown content into sections based on headings", () => {
      const md = `
# API Reference

Overview of our endpoints.

## User Endpoints

### GET /users
Returns list of users.

### POST /users
Creates a new user.
      `;

      const sections = parseMarkdownSections(md);
      expect(sections.length).toBeGreaterThanOrEqual(3);
      expect(sections[1].headingTitle).toBe("User Endpoints");
      expect(sections[2].headingTitle).toBe("GET /users");
    });

    it("handles empty or malformed Markdown cleanly", () => {
      expect(parseMarkdownSections("")).toEqual([]);
      expect(parseMarkdownSections("Just text with no headings")).toHaveLength(1);
    });
  });

  describe("matchChangeToSections", () => {
    const sampleChange: ApiChange = {
      filePath: "src/routes/users.ts",
      method: "POST",
      path: "/api/users",
      changeType: "ADDED",
      parameters: [],
      requestBodyFields: [{ fieldName: "email" }],
      responses: [{ statusCode: 201 }],
      confidence: "HIGH",
    };

    it("matches exact path and method in Markdown content", () => {
      const docFile: DocumentationFile = {
        filePath: "README.md",
        content: `
# API Docs

## Users

### POST /api/users
Creates a new user account.
Body: email (string)
        `,
      };

      const context = matchChangeToSections(sampleChange, docFile);
      expect(context).not.toBeNull();
      expect(context?.matchedFile).toBe("README.md");
      expect(context?.confidence).toBe("HIGH");
      expect(context?.matchReason).toBe("METHOD_AND_PATH");
      expect(context?.matchedSections[0].contentSnippet).toContain("POST /api/users");
    });

    it("returns null if no section matches", () => {
      const docFile: DocumentationFile = {
        filePath: "README.md",
        content: `
# Unrelated Section
This section describes database migrations only.
        `,
      };

      const context = matchChangeToSections(sampleChange, docFile);
      expect(context).toBeNull();
    });
  });

  describe("collectDocContextForChanges", () => {
    const change1: ApiChange = {
      filePath: "src/routes/users.ts",
      method: "GET",
      path: "/api/v1/users",
      changeType: "MODIFIED",
      parameters: [],
      requestBodyFields: [],
      responses: [{ statusCode: 200 }],
      confidence: "HIGH",
    };

    const change2: ApiChange = {
      filePath: "src/routes/orders.ts",
      method: "POST",
      path: "/api/v1/orders",
      changeType: "ADDED",
      parameters: [],
      requestBodyFields: [],
      responses: [{ statusCode: 201 }],
      confidence: "HIGH",
    };

    const docFiles: DocumentationFile[] = [
      {
        filePath: "README.md",
        content: `
# API Reference
## GET /api/v1/users
List all registered users.
        `,
      },
      {
        filePath: "docs/orders.md",
        content: `
# Orders API
## POST /api/v1/orders
Create an order.
        `,
      },
      {
        filePath: "src/app/page.tsx",
        content: `// React component - should be ignored`,
      },
    ];

    it("collects documentation context across multiple files and changes", () => {
      const result = collectDocContextForChanges([change1, change2], docFiles);
      expect(result.totalDocFilesInspected).toBe(2); // README.md & docs/orders.md
      expect(result.matchedFilesCount).toBe(2);
      expect(result.contexts).toHaveLength(2);
      expect(result.unmatchedChanges).toHaveLength(0);
    });

    it("reports unmatched API changes if no doc file contains references", () => {
      const orphanChange: ApiChange = {
        filePath: "src/routes/unknown.ts",
        method: "DELETE",
        path: "/api/v1/unknown-endpoint",
        changeType: "REMOVED",
        parameters: [],
        requestBodyFields: [],
        responses: [],
        confidence: "HIGH",
      };

      const result = collectDocContextForChanges([orphanChange], docFiles);
      expect(result.unmatchedChanges).toHaveLength(1);
      expect(result.unmatchedChanges[0].path).toBe("/api/v1/unknown-endpoint");
    });
  });
});
