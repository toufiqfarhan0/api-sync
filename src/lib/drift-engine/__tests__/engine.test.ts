import { describe, expect, it } from "vitest";
import { ApiChange } from "../../api-parser/types";
import { DocumentationContext } from "../../doc-collector/types";
import {
  analyzeDocDrift,
  validateAndParseDriftResult,
} from "../engine";
import { DriftEngineError } from "../types";

describe("Gemini Semantic Drift Engine", () => {
  const sampleApiChange: ApiChange = {
    filePath: "src/routes/users.ts",
    method: "POST",
    path: "/api/v1/users",
    changeType: "ADDED",
    parameters: [],
    requestBodyFields: [{ fieldName: "confirmPassword" }],
    responses: [{ statusCode: 201 }, { statusCode: 400 }],
    confidence: "HIGH",
  };

  const sampleDocContext: DocumentationContext = {
    apiChange: sampleApiChange,
    matchedFile: "README.md",
    matchedSections: [
      {
        headingTitle: "POST /api/v1/users",
        contentSnippet: "POST /api/v1/users - Creates a user with { name, email }. Returns 201.",
      },
    ],
    matchReason: "METHOD_AND_PATH",
    confidence: "HIGH",
  };

  describe("Input Validation & Early Exits", () => {
    it("returns NO_DRIFT when empty API changes are supplied", async () => {
      const result = await analyzeDocDrift({ apiChanges: [], docContexts: [] });
      expect(result.status).toBe("NO_DRIFT");
      expect(result.summary).toContain("No API changes");
    });

    it("returns CONFIRMED_DRIFT when API changes have zero matching docs", async () => {
      const result = await analyzeDocDrift({
        apiChanges: [sampleApiChange],
        docContexts: [],
      });

      expect(result.status).toBe("CONFIRMED_DRIFT");
      expect(result.severity).toBe("HIGH");
      expect(result.missingInformation[0]).toContain("Complete documentation missing");
    });

    it("throws MISSING_API_KEY when GEMINI_API_KEY is not set and no client override is provided", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        await expect(
          analyzeDocDrift({
            apiChanges: [sampleApiChange],
            docContexts: [sampleDocContext],
          })
        ).rejects.toThrowError(DriftEngineError);
      } finally {
        if (originalKey) process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  describe("JSON Output Validation", () => {
    it("parses valid JSON response from Gemini correctly", () => {
      const rawJson = JSON.stringify({
        status: "CONFIRMED_DRIFT",
        severity: "HIGH",
        summary: "Documentation is missing confirmPassword field.",
        explanation: "Code diff adds confirmPassword field to req.body.",
        affectedApiChangesCount: 1,
        affectedDocFiles: ["README.md"],
        missingInformation: ["confirmPassword field in request body"],
        outdatedInformation: [],
        confidence: "HIGH",
        reasoningEvidence: ["Code adds confirmPassword"],
      });

      const parsed = validateAndParseDriftResult(rawJson);
      expect(parsed.status).toBe("CONFIRMED_DRIFT");
      expect(parsed.missingInformation).toContain("confirmPassword field in request body");
    });

    it("throws MALFORMED_OUTPUT on invalid JSON", () => {
      expect(() => validateAndParseDriftResult("Not JSON")).toThrowError(DriftEngineError);
    });

    it("throws MALFORMED_OUTPUT on invalid status string", () => {
      const rawJson = JSON.stringify({ status: "INVALID_STATUS" });
      expect(() => validateAndParseDriftResult(rawJson)).toThrowError(DriftEngineError);
    });
  });

  describe("Mock Client Interactions for Semantic Evaluation", () => {
    it("handles CONFIRMED_DRIFT response for added required parameter", async () => {
      const mockClient = {
        generateContent: async () => ({
          response: {
            text: JSON.stringify({
              status: "CONFIRMED_DRIFT",
              severity: "HIGH",
              summary: "Missing confirmPassword field and 400 response code in README.md",
              explanation: "Code diff shows confirmPassword and status 400 added.",
              affectedApiChangesCount: 1,
              affectedDocFiles: ["README.md"],
              missingInformation: ["confirmPassword field", "400 Bad Request status code"],
              outdatedInformation: [],
              confidence: "HIGH",
              reasoningEvidence: ["req.body destructuring includes confirmPassword"],
            }),
          },
        }),
      };

      const result = await analyzeDocDrift(
        { apiChanges: [sampleApiChange], docContexts: [sampleDocContext] },
        { clientOverride: mockClient }
      );

      expect(result.status).toBe("CONFIRMED_DRIFT");
      expect(result.affectedDocFiles).toContain("README.md");
      expect(result.missingInformation).toHaveLength(2);
    });

    it("handles NO_DRIFT response when documentation is up to date", async () => {
      const mockClient = {
        generateContent: async () => ({
          response: {
            text: JSON.stringify({
              status: "NO_DRIFT",
              severity: "NONE",
              summary: "Documentation matches code changes accurately.",
              explanation: "Documentation already lists POST /api/v1/users and status 201.",
              affectedApiChangesCount: 0,
              affectedDocFiles: ["README.md"],
              missingInformation: [],
              outdatedInformation: [],
              confidence: "HIGH",
              reasoningEvidence: ["Documentation snippet matches code"],
            }),
          },
        }),
      };

      const result = await analyzeDocDrift(
        { apiChanges: [sampleApiChange], docContexts: [sampleDocContext] },
        { clientOverride: mockClient }
      );

      expect(result.status).toBe("NO_DRIFT");
      expect(result.severity).toBe("NONE");
    });

    it("handles UNCERTAIN response when context is ambiguous", async () => {
      const mockClient = {
        generateContent: async () => ({
          response: {
            text: JSON.stringify({
              status: "UNCERTAIN",
              severity: "LOW",
              summary: "Insufficient context to determine if documentation is outdated.",
              explanation: "Documentation snippet mentions /users but omits request body details.",
              affectedApiChangesCount: 1,
              affectedDocFiles: ["README.md"],
              missingInformation: ["Request body specification"],
              outdatedInformation: [],
              confidence: "LOW",
              reasoningEvidence: ["Documentation snippet is ambiguous"],
            }),
          },
        }),
      };

      const result = await analyzeDocDrift(
        { apiChanges: [sampleApiChange], docContexts: [sampleDocContext] },
        { clientOverride: mockClient }
      );

      expect(result.status).toBe("UNCERTAIN");
      expect(result.confidence).toBe("LOW");
    });

    it("maps Gemini provider network or API failure to RATE_LIMITED / API_FAILURE", async () => {
      const mockClient = {
        generateContent: async () => {
          throw new Error("429 Too Many Requests");
        },
      };

      await expect(
        analyzeDocDrift(
          { apiChanges: [sampleApiChange], docContexts: [sampleDocContext] },
          { clientOverride: mockClient }
        )
      ).rejects.toThrowError(DriftEngineError);

      try {
        await analyzeDocDrift(
          { apiChanges: [sampleApiChange], docContexts: [sampleDocContext] },
          { clientOverride: mockClient }
        );
      } catch (err: unknown) {
        const error = err as DriftEngineError;
        expect(error.code).toBe("RATE_LIMITED");
      }
    });
  });
});
