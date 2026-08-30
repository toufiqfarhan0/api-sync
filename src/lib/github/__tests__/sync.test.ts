import { Octokit } from "@octokit/rest";
import { describe, expect, it } from "vitest";
import { commitDocumentationFile } from "../service";

describe("GitHub Documentation Synchronization Service", () => {
  describe("commitDocumentationFile Validation & Security", () => {
    it("returns FAILED status when required input parameters are missing", async () => {
      const result = await commitDocumentationFile({
        owner: "",
        repo: "api-sync",
        pullNumber: 1,
        filePath: "README.md",
        content: "# Test",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.message).toContain("Missing required input parameters");
    });

    it("prohibits path traversal attempts", async () => {
      const result = await commitDocumentationFile({
        owner: "owner",
        repo: "repo",
        pullNumber: 1,
        filePath: "../../etc/passwd",
        content: "malicious content",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.message).toContain("path traversal is prohibited");
    });
  });

  describe("commitDocumentationFile Execution with Mock Octokit", () => {
    it("successfully commits updated documentation file to PR head branch", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            get: async () => ({
              data: {
                head: { ref: "feat/add-users" },
              },
            }),
          },
          repos: {
            getContent: async () => ({
              data: { sha: "oldfilesha123" },
            }),
            createOrUpdateFileContents: async () => ({
              data: {
                commit: {
                  sha: "newcommitsha999",
                  html_url: "https://github.com/owner/repo/commit/newcommitsha999",
                },
              },
            }),
          },
        },
      } as unknown as Octokit;

      const result = await commitDocumentationFile(
        {
          owner: "owner",
          repo: "repo",
          pullNumber: 1,
          filePath: "README.md",
          content: "# Updated API Docs",
          expectedSha: "oldfilesha123",
        },
        mockOctokit
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("SYNCED");
      expect(result.branch).toBe("feat/add-users");
      expect(result.commitSha).toBe("newcommitsha999");
      expect(result.commitUrl).toContain("newcommitsha999");
    });

    it("detects stale file SHA and returns CONFLICT status", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            get: async () => ({
              data: {
                head: { ref: "feat/add-users" },
              },
            }),
          },
          repos: {
            getContent: async () => ({
              data: { sha: "newerfilesha456" }, // Different from expectedSha
            }),
          },
        },
      } as unknown as Octokit;

      const result = await commitDocumentationFile(
        {
          owner: "owner",
          repo: "repo",
          pullNumber: 1,
          filePath: "README.md",
          content: "# Updated API Docs",
          expectedSha: "staleexpectedsha123",
        },
        mockOctokit
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("CONFLICT");
      expect(result.message).toContain("modified on GitHub");
    });

    it("returns UNAUTHORIZED status on 401 / 403 write permission errors", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            get: async () => {
              const err = new Error("Write permission denied") as Error & { status?: number };
              err.status = 403;
              throw err;
            },
          },
        },
      } as unknown as Octokit;

      const result = await commitDocumentationFile(
        {
          owner: "owner",
          repo: "repo",
          pullNumber: 1,
          filePath: "README.md",
          content: "# Content",
        },
        mockOctokit
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("UNAUTHORIZED");
      expect(result.message).toContain("GitHub authorization failed: Write permissions required");
    });
  });
});
