import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSession, SESSION_COOKIE_NAME } from "../../../../lib/auth";
import { GitHubServiceError, listUserRepositories } from "../../../../lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = parseSession(sessionCookie);
    const userToken = session?.accessToken;

    const repos = await listUserRepositories(userToken);
    return NextResponse.json({ success: true, repos });
  } catch (err: unknown) {
    if (err instanceof GitHubServiceError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode || 400 }
      );
    }

    const error = err as { message?: string };
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch user repositories." },
      { status: 500 }
    );
  }
}
