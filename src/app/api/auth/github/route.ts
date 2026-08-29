import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { buildGitHubAuthUrl, generateOAuthState, STATE_COOKIE_NAME } from "../../../../lib/auth";

export async function GET(req: Request) {
  const clientId = process.env.GITHUB_APP_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "GITHUB_APP_CLIENT_ID environment variable is missing.",
        message: "To connect GitHub, register a GitHub App and configure GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET in .env.local.",
      },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/github/callback`;
  const state = generateOAuthState();

  const authUrl = buildGitHubAuthUrl(clientId, state, redirectUri);

  // Set HTTP-only state cookie for CSRF protection
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  return NextResponse.redirect(authUrl);
}
