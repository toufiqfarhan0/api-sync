import { describe, expect, it } from "vitest";
import { POST } from "../route";

describe("POST /api/generate Route Handler", () => {
  it("returns 400 when required parameters are missing", async () => {
    const req = new Request("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Missing required parameters");
  });

  it("returns success early with empty content when drift status is NO_DRIFT", async () => {
    const req = new Request("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({
        apiChanges: [
          {
            filePath: "src/routes/users.ts",
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
          status: "NO_DRIFT",
          severity: "NONE",
          summary: "No drift",
          explanation: "Docs match code",
          affectedApiChangesCount: 0,
          affectedDocFiles: ["README.md"],
          missingInformation: [],
          outdatedInformation: [],
          confidence: "HIGH",
          reasoningEvidence: [],
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.generationResult.generatedContent).toBe("");
    expect(json.generationResult.summary).toContain("no documentation drift was detected");
  });
});
