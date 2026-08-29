import { describe, expect, it } from "vitest";
import { GET as getPulls } from "../pulls/route";

describe("GitHub Repos & Pulls API Routes", () => {
  describe("GET /api/github/pulls", () => {
    it("returns 400 when owner or repo query parameters are missing", async () => {
      const req = new Request("http://localhost:3000/api/github/pulls");
      const res = await getPulls(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Missing required query parameters");
    });
  });
});
