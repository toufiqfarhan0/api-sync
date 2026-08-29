import { describe, expect, it } from "vitest";
import { parseGitHubUrlOrInput } from "../parser";

describe("Review Studio Analysis Route Helpers", () => {
  describe("parseGitHubUrlOrInput", () => {
    it("parses full GitHub PR URL correctly", () => {
      const parsed = parseGitHubUrlOrInput("https://github.com/toufiqfarhan0/api-sync/pull/12");
      expect(parsed.owner).toBe("toufiqfarhan0");
      expect(parsed.repo).toBe("api-sync");
      expect(parsed.pullNumber).toBe(12);
    });

    it("parses owner/repo and explicit PR number", () => {
      const parsed = parseGitHubUrlOrInput("toufiqfarhan0/api-sync", 5);
      expect(parsed.owner).toBe("toufiqfarhan0");
      expect(parsed.repo).toBe("api-sync");
      expect(parsed.pullNumber).toBe(5);
    });

    it("throws error on invalid input format", () => {
      expect(() => parseGitHubUrlOrInput("invalid-input")).toThrow();
    });
  });
});
