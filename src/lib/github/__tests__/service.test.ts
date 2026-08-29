import { Octokit } from "@octokit/rest";
import { describe, expect, it } from "vitest";
import {
  fetchPullRequestData,
  normalizePRFiles,
  normalizePRMetadata,
} from "../service";
import { GitHubServiceError } from "../types";

describe("GitHub PR Ingestion Service", () => {
  describe("Input Validation", () => {
    it("throws INVALID_INPUT error if owner is missing or empty", async () => {
      await expect(
        fetchPullRequestData({ owner: "", repo: "api-sync", pullNumber: 1 })
      ).rejects.toThrowError(GitHubServiceError);

      try {
        await fetchPullRequestData({ owner: "   ", repo: "api-sync", pullNumber: 1 });
      } catch (err: unknown) {
        const error = err as GitHubServiceError;
        expect(error.code).toBe("INVALID_INPUT");
      }
    });

    it("throws INVALID_INPUT error if repo is missing or empty", async () => {
      try {
        await fetchPullRequestData({ owner: "toufiqfarhan0", repo: "", pullNumber: 1 });
      } catch (err: unknown) {
        const error = err as GitHubServiceError;
        expect(error.code).toBe("INVALID_INPUT");
      }
    });

    it("throws INVALID_INPUT error if pullNumber is invalid", async () => {
      try {
        await fetchPullRequestData({ owner: "toufiqfarhan0", repo: "api-sync", pullNumber: -5 });
      } catch (err: unknown) {
        const error = err as GitHubServiceError;
        expect(error.code).toBe("INVALID_INPUT");
      }
    });
  });

  describe("Normalization Logic", () => {
    it("correctly normalizes raw PR metadata", () => {
      const rawPR = {
        id: 1001,
        number: 42,
        title: "feat: update user endpoints",
        body: "Added new query parameter and error code.",
        state: "open",
        html_url: "https://github.com/toufiqfarhan0/api-sync/pull/42",
        created_at: "2026-08-29T10:00:00Z",
        updated_at: "2026-08-29T10:30:00Z",
        closed_at: null,
        merged_at: null,
        user: {
          login: "toufiqfarhan0",
          avatar_url: "https://github.com/avatar.png",
        },
        head: {
          label: "toufiqfarhan0:feat/user-endpoints",
          ref: "feat/user-endpoints",
          sha: "abc123sha",
        },
        base: {
          label: "toufiqfarhan0:main",
          ref: "main",
          sha: "mainsha123",
        },
      };

      const normalized = normalizePRMetadata(rawPR);

      expect(normalized.id).toBe(1001);
      expect(normalized.number).toBe(42);
      expect(normalized.title).toBe("feat: update user endpoints");
      expect(normalized.author.login).toBe("toufiqfarhan0");
      expect(normalized.head.ref).toBe("feat/user-endpoints");
      expect(normalized.base.ref).toBe("main");
    });

    it("correctly normalizes raw PR files and patches", () => {
      const rawFiles = [
        {
          filename: "src/routes/users.ts",
          status: "modified",
          additions: 10,
          deletions: 2,
          changes: 12,
          patch: "@@ -1,3 +1,5 @@\n+ router.get('/users/search');",
          raw_url: "https://github.com/raw/users.ts",
        },
        {
          filename: "docs/api.md",
          status: "modified",
          additions: 4,
          deletions: 0,
          changes: 4,
          patch: "@@ -10,3 +10,7 @@\n+ ## GET /users/search",
          raw_url: "https://github.com/raw/api.md",
        },
      ];

      const normalizedFiles = normalizePRFiles(rawFiles);

      expect(normalizedFiles).toHaveLength(2);
      expect(normalizedFiles[0].filename).toBe("src/routes/users.ts");
      expect(normalizedFiles[0].status).toBe("modified");
      expect(normalizedFiles[0].patch).toContain("+ router.get('/users/search');");
      expect(normalizedFiles[1].filename).toBe("docs/api.md");
    });
  });

  describe("Service Fetching with Mock Octokit Client", () => {
    it("fetches and normalizes pull request data using mock Octokit", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            get: async () => ({
              data: {
                id: 1234,
                number: 1,
                title: "feat: add user route",
                body: "Initial implementation",
                state: "open",
                html_url: "https://github.com/owner/repo/pull/1",
                created_at: "2026-08-29T10:00:00Z",
                updated_at: "2026-08-29T10:00:00Z",
                user: { login: "dev", avatar_url: "" },
                head: { label: "feat", ref: "feat", sha: "sha1" },
                base: { label: "main", ref: "main", sha: "sha0" },
              },
            }),
            listFiles: async () => ({
              data: [
                {
                  filename: "src/routes/user.js",
                  status: "added",
                  additions: 15,
                  deletions: 0,
                  changes: 15,
                  patch: "+ router.post('/users');",
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const result = await fetchPullRequestData(
        { owner: "owner", repo: "repo", pullNumber: 1 },
        mockOctokit
      );

      expect(result.owner).toBe("owner");
      expect(result.repo).toBe("repo");
      expect(result.pullNumber).toBe(1);
      expect(result.totalFilesChanged).toBe(1);
      expect(result.files[0].filename).toBe("src/routes/user.js");
      expect(result.summary.additions).toBe(15);
      expect(result.summary.deletions).toBe(0);
    });

    it("maps 404 response to NOT_FOUND error", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            get: async () => {
              const err = new Error("Not Found") as Error & { status?: number };
              err.status = 404;
              throw err;
            },
            listFiles: async () => ({ data: [] }),
          },
        },
      } as unknown as Octokit;

      await expect(
        fetchPullRequestData({ owner: "owner", repo: "repo", pullNumber: 999 }, mockOctokit)
      ).rejects.toThrowError(GitHubServiceError);

      try {
        await fetchPullRequestData({ owner: "owner", repo: "repo", pullNumber: 999 }, mockOctokit);
      } catch (err: unknown) {
        const error = err as GitHubServiceError;
        expect(error.code).toBe("NOT_FOUND");
        expect(error.statusCode).toBe(404);
      }
    });

    it("maps 401 response to UNAUTHORIZED error", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            get: async () => {
              const err = new Error("Bad credentials") as Error & { status?: number };
              err.status = 401;
              throw err;
            },
            listFiles: async () => ({ data: [] }),
          },
        },
      } as unknown as Octokit;

      try {
        await fetchPullRequestData({ owner: "owner", repo: "repo", pullNumber: 1 }, mockOctokit);
      } catch (err: unknown) {
        const error = err as GitHubServiceError;
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.statusCode).toBe(401);
      }
    });
  });
});
