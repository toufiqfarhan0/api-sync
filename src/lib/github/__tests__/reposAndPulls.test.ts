import { Octokit } from "@octokit/rest";
import { describe, expect, it } from "vitest";
import { listOpenPullRequests, listUserRepositories } from "../service";
import { GitHubServiceError } from "../types";

describe("GitHub Repositories and Open Pull Requests Listing", () => {
  describe("listUserRepositories with Mock Octokit", () => {
    it("returns normalized UserRepoSummary array", async () => {
      const mockOctokit = {
        rest: {
          repos: {
            listForAuthenticatedUser: async () => ({
              data: [
                {
                  id: 101,
                  name: "api-sync",
                  full_name: "toufiqfarhan0/api-sync",
                  owner: { login: "toufiqfarhan0" },
                  default_branch: "main",
                  private: false,
                  description: "API Documentation Sync AI",
                  html_url: "https://github.com/toufiqfarhan0/api-sync",
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const repos = await listUserRepositories("test-token", mockOctokit);
      expect(repos).toHaveLength(1);
      expect(repos[0].name).toBe("api-sync");
      expect(repos[0].fullName).toBe("toufiqfarhan0/api-sync");
      expect(repos[0].isPrivate).toBe(false);
    });
  });

  describe("listOpenPullRequests with Mock Octokit", () => {
    it("returns normalized OpenPRSummary array for repository", async () => {
      const mockOctokit = {
        rest: {
          pulls: {
            list: async () => ({
              data: [
                {
                  number: 11,
                  title: "test: introduce API documentation drift",
                  user: { login: "toufiqfarhan0" },
                  head: { ref: "test/e2e-api-drift" },
                  base: { ref: "main" },
                  created_at: "2026-08-29T10:00:00Z",
                  updated_at: "2026-08-29T10:00:00Z",
                  draft: false,
                  html_url: "https://github.com/toufiqfarhan0/api-sync/pull/11",
                },
              ],
            }),
          },
        },
      } as unknown as Octokit;

      const prs = await listOpenPullRequests("toufiqfarhan0", "api-sync", "test-token", mockOctokit);
      expect(prs).toHaveLength(1);
      expect(prs[0].number).toBe(11);
      expect(prs[0].title).toBe("test: introduce API documentation drift");
      expect(prs[0].author).toBe("toufiqfarhan0");
      expect(prs[0].headRef).toBe("test/e2e-api-drift");
    });

    it("throws INVALID_INPUT when owner or repo is missing", async () => {
      await expect(listOpenPullRequests("", "api-sync")).rejects.toThrowError(GitHubServiceError);
      await expect(listOpenPullRequests("toufiqfarhan0", "")).rejects.toThrowError(GitHubServiceError);
    });
  });
});
