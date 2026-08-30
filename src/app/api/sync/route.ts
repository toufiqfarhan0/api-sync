import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSession, SESSION_COOKIE_NAME } from "../../../lib/auth";
import { commitDocumentationFile } from "../../../lib/github";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, repo, pullNumber, filePath, content, expectedSha } = body;

    if (!owner || !repo || !pullNumber || !filePath || !content) {
      return NextResponse.json(
        {
          success: false,
          repository: `${owner || "unknown"}/${repo || "unknown"}`,
          branch: "unknown",
          filePath: filePath || "unknown",
          status: "FAILED",
          message: "Missing required parameters: owner, repo, pullNumber, filePath, and content are required.",
        },
        { status: 400 }
      );
    }

    // Extract user session token if authenticated
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = parseSession(sessionCookie);
    const userToken = session?.accessToken;

    const normalizedOwner = String(owner).trim().toLowerCase();
    const normalizedRepo = String(repo).trim().toLowerCase();
    const isDemoRepo = normalizedOwner === "toufiqfarhan0" && normalizedRepo === "test-apy-sync";

    // Demo testbed repository always uses server process.env.GITHUB_TOKEN to guarantee write access for all users;
    // external repositories use the user's OAuth session token (falling back to server token)
    const effectiveToken = isDemoRepo
      ? process.env.GITHUB_TOKEN
      : userToken || process.env.GITHUB_TOKEN;

    const result = await commitDocumentationFile({
      owner: String(owner).trim(),
      repo: String(repo).trim(),
      pullNumber: typeof pullNumber === "number" ? pullNumber : parseInt(String(pullNumber), 10),
      filePath: String(filePath).trim(),
      content: String(content),
      expectedSha: expectedSha ? String(expectedSha) : undefined,
      token: effectiveToken,
    });

    const httpStatus =
      result.status === "SYNCED" ? 200 :
      result.status === "CONFLICT" ? 409 :
      result.status === "UNAUTHORIZED" ? 403 :
      result.status === "NOT_FOUND" ? 404 : 400;

    return NextResponse.json(result, { status: httpStatus });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      {
        success: false,
        repository: "unknown",
        branch: "unknown",
        filePath: "unknown",
        status: "FAILED",
        message: error.message || "An unexpected error occurred during documentation synchronization.",
      },
      { status: 500 }
    );
  }
}
