import { describe, expect, it } from "vitest";
import { generateDocUpdate } from "../../doc-generator/generator";
import { analyzeDocDrift } from "../../drift-engine/engine";
import { generateWithGemini, isRetryableModelError } from "../router";
import { DEFAULT_GEMINI_MODEL_SEQUENCE, GeminiRouterError } from "../types";

describe("Gemini Model Router & Fallback Engine", () => {
  describe("isRetryableModelError Classification", () => {
    it("identifies HTTP 429 / rate limits as retryable", () => {
      expect(isRetryableModelError({ status: 429, message: "Too many requests" })).toBe(true);
      expect(isRetryableModelError({ message: "RESOURCE_EXHAUSTED" })).toBe(true);
    });

    it("identifies model-specific 404 / unavailable as retryable", () => {
      expect(isRetryableModelError({ status: 404, message: "This model is no longer available" })).toBe(true);
    });

    it("identifies temporary server 5xx errors as retryable", () => {
      expect(isRetryableModelError({ status: 503, message: "Service unavailable" })).toBe(true);
      expect(isRetryableModelError({ status: 500 })).toBe(true);
    });

    it("rejects non-retryable application / prompt errors", () => {
      expect(isRetryableModelError({ status: 400, message: "Bad prompt parameter" })).toBe(false);
      expect(isRetryableModelError({ message: "Invalid API key" })).toBe(false);
    });
  });

  describe("generateWithGemini Router Execution", () => {
    it("succeeds with primary model gemini-3.7-flash when no errors occur", async () => {
      const mockClient = {
        generateContent: async (args: { model: string }) => ({
          response: { text: `Generated response from ${args.model}` },
        }),
      };

      const result = await generateWithGemini("Test prompt", {
        apiKey: "fake-test-key",
        clientOverride: mockClient,
      });

      expect(result.metadata.modelUsed).toBe("gemini-3.7-flash");
      expect(result.metadata.fallbackUsed).toBe(false);
      expect(result.metadata.attemptedModels).toEqual(["gemini-3.7-flash"]);
      expect(result.responseText).toContain("gemini-3.7-flash");
    });

    it("automatically falls back to gemini-3.6-flash when primary model encounters HTTP 429 rate limit", async () => {
      const mockClient = {
        generateContent: async (args: { model: string }) => {
          if (args.model === "gemini-3.7-flash") {
            const err = new Error("429 Rate limit exceeded") as Error & { status: number };
            err.status = 429;
            throw err;
          }
          return { response: { text: `Response from ${args.model}` } };
        },
      };

      const result = await generateWithGemini("Test prompt", {
        apiKey: "fake-test-key",
        clientOverride: mockClient,
      });

      expect(result.metadata.modelUsed).toBe("gemini-3.6-flash");
      expect(result.metadata.fallbackUsed).toBe(true);
      expect(result.metadata.attemptedModels).toEqual(["gemini-3.7-flash", "gemini-3.6-flash"]);
      expect(result.responseText).toContain("gemini-3.6-flash");
    });

    it("automatically falls back when primary model encounters 404 model no longer available", async () => {
      const mockClient = {
        generateContent: async (args: { model: string }) => {
          if (args.model === "gemini-3.7-flash") {
            const err = new Error("404 model_not_found") as Error & { status: number };
            err.status = 404;
            throw err;
          }
          return { response: { text: `Response from ${args.model}` } };
        },
      };

      const result = await generateWithGemini("Test prompt", {
        apiKey: "fake-test-key",
        clientOverride: mockClient,
      });

      expect(result.metadata.modelUsed).toBe("gemini-3.6-flash");
      expect(result.metadata.fallbackUsed).toBe(true);
    });

    it("falls back through first two models to third model gemini-3.5-flash-lite when necessary", async () => {
      const mockClient = {
        generateContent: async (args: { model: string }) => {
          if (args.model === "gemini-3.7-flash" || args.model === "gemini-3.6-flash") {
            const err = new Error("503 Service Unavailable") as Error & { status: number };
            err.status = 503;
            throw err;
          }
          return { response: { text: `Response from ${args.model}` } };
        },
      };

      const result = await generateWithGemini("Test prompt", {
        apiKey: "fake-test-key",
        clientOverride: mockClient,
      });

      expect(result.metadata.modelUsed).toBe("gemini-3.5-flash-lite");
      expect(result.metadata.fallbackUsed).toBe(true);
      expect(result.metadata.attemptedModels).toEqual([
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
      ]);
    });

    it("throws ALL_MODELS_FAILED error when all models in sequence fail", async () => {
      const mockClient = {
        generateContent: async () => {
          const err = new Error("500 Internal Error") as Error & { status: number };
          err.status = 500;
          throw err;
        },
      };

      await expect(
        generateWithGemini("Test prompt", {
          apiKey: "fake-test-key",
          clientOverride: mockClient,
        })
      ).rejects.toThrowError(GeminiRouterError);

      try {
        await generateWithGemini("Test prompt", {
          apiKey: "fake-test-key",
          clientOverride: mockClient,
        });
      } catch (err: unknown) {
        const error = err as GeminiRouterError;
        expect(error.code).toBe("ALL_MODELS_FAILED");
        expect(error.attemptedModels).toEqual([...DEFAULT_GEMINI_MODEL_SEQUENCE]);
      }
    });

    it("throws MISSING_API_KEY when GEMINI_API_KEY is not set and no client override is provided", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        await expect(generateWithGemini("Test prompt")).rejects.toThrowError(GeminiRouterError);
      } finally {
        if (originalKey) process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it("does NOT fallback on non-retryable error", async () => {
      const mockClient = {
        generateContent: async () => {
          const err = new Error("Invalid prompt schema") as Error & { status: number };
          err.status = 400;
          throw err;
        },
      };

      try {
        await generateWithGemini("Test prompt", {
          apiKey: "fake-test-key",
          clientOverride: mockClient,
        });
      } catch (err: unknown) {
        const error = err as GeminiRouterError;
        expect(error.code).toBe("NON_RETRYABLE_ERROR");
        expect(error.attemptedModels).toEqual(["gemini-3.7-flash"]);
      }
    });
  });

  describe("Integration Refactoring Verification", () => {
    it("drift engine returns modelMetadata from router result", async () => {
      const mockClient = {
        generateContent: async () => ({
          response: {
            text: JSON.stringify({
              status: "NO_DRIFT",
              severity: "NONE",
              summary: "No drift detected",
              explanation: "Documentation matches code",
              affectedApiChangesCount: 0,
              affectedDocFiles: ["README.md"],
              missingInformation: [],
              outdatedInformation: [],
              confidence: "HIGH",
              reasoningEvidence: [],
            }),
          },
        }),
      };

      const result = await analyzeDocDrift(
        {
          apiChanges: [
            {
              filePath: "src/routes/user.ts",
              method: "GET",
              path: "/api/users",
              changeType: "ADDED",
              parameters: [],
              requestBodyFields: [],
              responses: [],
              confidence: "HIGH",
            },
          ],
          docContexts: [
            {
              apiChange: {
                filePath: "src/routes/user.ts",
                method: "GET",
                path: "/api/users",
                changeType: "ADDED",
                parameters: [],
                requestBodyFields: [],
                responses: [],
                confidence: "HIGH",
              },
              matchedFile: "README.md",
              matchedSections: [{ headingTitle: "GET /api/users", contentSnippet: "GET /api/users" }],
              matchReason: "EXACT_PATH",
              confidence: "HIGH",
            },
          ],
        },
        { apiKey: "fake-key", clientOverride: mockClient }
      );

      expect(result.modelMetadata).toBeDefined();
      expect(result.modelMetadata?.modelUsed).toBe("gemini-3.7-flash");
      expect(result.modelMetadata?.fallbackUsed).toBe(false);
    });

    it("doc generator returns modelMetadata from router result", async () => {
      const mockClient = {
        generateContent: async () => ({
          response: {
            text: JSON.stringify({
              success: true,
              format: "markdown",
              targetFile: "README.md",
              generatedContent: "### GET /api/users",
              summary: "Generated docs",
              warnings: [],
              confidence: "HIGH",
            }),
          },
        }),
      };

      const result = await generateDocUpdate(
        {
          apiChanges: [
            {
              filePath: "src/routes/user.ts",
              method: "GET",
              path: "/api/users",
              changeType: "ADDED",
              parameters: [],
              requestBodyFields: [],
              responses: [],
              confidence: "HIGH",
            },
          ],
          docContexts: [],
          driftAnalysis: {
            status: "CONFIRMED_DRIFT",
            severity: "HIGH",
            summary: "Missing docs",
            explanation: "Docs missing",
            affectedApiChangesCount: 1,
            affectedDocFiles: [],
            missingInformation: ["GET /api/users"],
            outdatedInformation: [],
            confidence: "HIGH",
            reasoningEvidence: [],
          },
        },
        { apiKey: "fake-key", clientOverride: mockClient }
      );

      expect(result.modelMetadata).toBeDefined();
      expect(result.modelMetadata?.modelUsed).toBe("gemini-3.7-flash");
    });
  });
});
