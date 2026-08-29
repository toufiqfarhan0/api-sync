import { NextResponse } from "next/server";
import { parseApiChangesFromFiles } from "../../../lib/api-parser";
import { collectDocContextForChanges, DocumentationFile } from "../../../lib/doc-collector";
import { analyzeDocDrift } from "../../../lib/drift-engine";
import { createOctokitClient, fetchPullRequestData, GitHubServiceError } from "../../../lib/github";
import { parseGitHubUrlOrInput } from "./parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, repo, pullNumber } = parseGitHubUrlOrInput(body.repoInput || body.url || "", body.pullNumber);

    // 1. Fetch GitHub PR data
    const prData = await fetchPullRequestData({ owner, repo, pullNumber });

    // 2. Parse API code changes
    const parseResult = parseApiChangesFromFiles(prData.files);

    // 3. Collect Documentation Context (fetch repo docs via Octokit or use PR changed .md files)
    const docFiles: DocumentationFile[] = [];
    const client = createOctokitClient();

    // Fetch README.md from repo base
    try {
      const readmeRes = await client.rest.repos.getReadme({ owner, repo, ref: prData.metadata.head.ref });
      if ("content" in readmeRes.data && readmeRes.data.content) {
        const decodedContent = Buffer.from(readmeRes.data.content, "base64").toString("utf-8");
        docFiles.push({ filePath: "README.md", content: decodedContent });
      }
    } catch {
      // Ignore if README.md doesn't exist
    }

    // Include any Markdown files present in the PR changes
    for (const file of prData.files) {
      if (file.filename.endsWith(".md") && file.filename !== "README.md") {
        if (file.patch) {
          docFiles.push({ filePath: file.filename, content: file.patch });
        }
      }
    }

    const collectorResult = collectDocContextForChanges(parseResult.changes, docFiles);

    // 4. Gemini Drift Detection (Stage 1 ends here)
    const driftResult = await analyzeDocDrift({
      apiChanges: parseResult.changes,
      docContexts: collectorResult.contexts,
    });

    return NextResponse.json({
      success: true,
      prMetadata: prData.metadata,
      summary: prData.summary,
      apiChanges: parseResult.changes,
      totalRoutesIdentified: parseResult.totalRoutesIdentified,
      docContexts: collectorResult.contexts,
      driftAnalysis: driftResult,
    });
  } catch (err: unknown) {
    if (err instanceof GitHubServiceError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode || 400 }
      );
    }

    const error = err as { message?: string };
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred during analysis." },
      { status: 400 }
    );
  }
}
