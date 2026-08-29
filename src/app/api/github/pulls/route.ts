import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSession, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { GitHubServiceError, listOpenPullRequests } from "../../../../lib/github";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  const repo = url.searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { success: false, error: "Missing required query parameters: owner and repo are required." },
      { status: 400 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = parseSession(sessionCookie);
    const userToken = session?.accessToken;

    const pullRequests = await listOpenPullRequests(owner, repo, userToken);
    return NextResponse.json({ success: true, pullRequests });
  } catch (err: unknown) {
    if (err instanceof GitHubServiceError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode || 400 }
      );
    }

    const error = err as { message?: string };
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch open pull requests." },
      { status: 500 }
    );
  }
}
