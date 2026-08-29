import { describe, expect, it } from "vitest";
import { ApiChange } from "../../api-parser/types";
import { DocumentationContext } from "../../doc-collector/types";
import { DriftAnalysisResult } from "../../drift-engine/types";
import { generateDocUpdate, validateAndParseGenerationResult } from "../generator";
import { buildDocGeneratorPrompt } from "../prompt";
import { DocGeneratorError, loadApiDocumentationSkill } from "../skillLoader";

describe("SkillPatch Documentation Generator Engine", () => {
  const sampleApiChange: ApiChange = {
    filePath: "src/routes/users.ts",
    method: "POST",
    path: "/api/v1/users",
    changeType: "ADDED",
    parameters: [],
    requestBodyFields: [{ fieldName: "email" }, { fieldName: "confirmPassword" }],
    responses: [{ statusCode: 201 }, { statusCode: 400 }],
    confidence: "HIGH",
  };

  const sampleDocContext: DocumentationContext = {
    apiChange: sampleApiChange,
    matchedFile: "docs/api.md",
    matchedSections: [
      {
        headingTitle: "POST /api/v1/users",
        contentSnippet: "POST /api/v1/users - Creates a user with email. Returns 201.",
      },
    ],
    matchReason: "METHOD_AND_PATH",
    confidence: "HIGH",
  };

  const sampleDriftResult: DriftAnalysisResult = {
    status: "CONFIRMED_DRIFT",
    severity: "HIGH",
    summary: "Missing confirmPassword field and 400 response code in documentation.",
    explanation: "Code diff adds confirmPassword field and 400 response code.",
    affectedApiChangesCount: 1,
    affectedDocFiles: ["docs/api.md"],
    missingInformation: ["confirmPassword field", "400 Bad Request status code"],
    outdatedInformation: [],
    confidence: "HIGH",
    reasoningEvidence: ["Code adds confirmPassword field"],
  };

  describe("SkillPatch Loader Verification", () => {
    it("successfully loads installed .latentcode/skills/api-documentation/SKILL.md file", () => {
      const skillContent = loadApiDocumentationSkill();
      expect(skillContent).toBeDefined();
      expect(skillContent).toContain("api-documentation");
    });

    it("throws MISSING_SKILL_FILE error if skill file does not exist in directory", () => {
      expect(() => loadApiDocumentationSkill("/invalid/path")).toThrowError(DocGeneratorError);
      try {
        loadApiDocumentationSkill("/invalid/path");
      } catch (err: unknown) {
        const error = err as DocGeneratorError;
        expect(error.code).toBe("MISSING_SKILL_FILE");
      }
    });

    it("verifies prompt includes exact loaded SkillPatch instructions and target file", () => {
      const skillContent = loadApiDocumentationSkill();
      const prompt = buildDocGeneratorPrompt(
        [sampleApiChange],
        [sampleDocContext],
        sampleDriftResult,
        skillContent,
        "docs/api.md"
      );

      expect(prompt).toContain(skillContent);
      expect(prompt).toContain(".latentcode/skills/api-documentation/SKILL.md");
      expect(prompt).toContain("docs/api.md");
    });
  });

  describe("Doc Generation Execution & Early Exits", () => {
    it("returns early with empty content when status is NO_DRIFT", async () => {
      const noDriftResult: DriftAnalysisResult = {
        ...sampleDriftResult,
        status: "NO_DRIFT",
      };

      const res = await generateDocUpdate({
        apiChanges: [sampleApiChange],
        docContexts: [sampleDocContext],
        driftAnalysis: noDriftResult,
      });

      expect(res.success).toBe(true);
      expect(res.generatedContent).toBe("");
      expect(res.summary).toContain("No documentation update generated");
      expect(res.targetFile).toBe("docs/api.md");
    });

    it("generates structured Markdown documentation update using mock Gemini client and preserves matched target file", async () => {
      let capturedPrompt = "";
      const mockClient = {
        generateContent: async (args: { contents: string[] }) => {
          capturedPrompt = args.contents[0];
          return {
            response: {
              text: JSON.stringify({
                success: true,
                format: "markdown",
                targetFile: "random-hallucinated-file.md",
                generatedContent: "### POST /api/v1/users\n\n| Parameter | Type | Required |\n| --- | --- | --- |\n| email | string | Yes |\n| confirmPassword | string | Yes |",
                summary: "Updated request body fields for POST /api/v1/users.",
                warnings: [],
                confidence: "HIGH",
              }),
            },
          };
        },
      };

      const result = await generateDocUpdate(
        {
          apiChanges: [sampleApiChange],
          docContexts: [sampleDocContext],
          driftAnalysis: sampleDriftResult,
        },
        { clientOverride: mockClient }
      );

      expect(capturedPrompt).toContain("api-documentation");
      expect(result.success).toBe(true);
      expect(result.targetFile).toBe("docs/api.md"); // Enforced docs/api.md over LLM output
      expect(result.generatedContent).toContain("confirmPassword");
    });

    it("validates raw JSON generation responses correctly and enforces target file", () => {
      const raw = JSON.stringify({
        success: true,
        format: "markdown",
        targetFile: "other.md",
        generatedContent: "## Endpoint Updated",
        summary: "Updated docs",
        warnings: ["Field inferred"],
        confidence: "MEDIUM",
      });

      const parsed = validateAndParseGenerationResult(raw, "docs/api.md");
      expect(parsed.targetFile).toBe("docs/api.md");
      expect(parsed.warnings).toContain("Field inferred");
    });

    it("throws MALFORMED_OUTPUT on invalid JSON", () => {
      expect(() => validateAndParseGenerationResult("Invalid JSON", "README.md")).toThrowError(DocGeneratorError);
    });
  });
});
