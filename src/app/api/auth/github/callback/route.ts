import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import {
  exchangeCodeForAccessToken,
  fetchGitHubUserProfile,
  serializeSession,
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
} from "../../../../../lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE_NAME)?.value;

  // Clear state cookie
  cookieStore.delete(STATE_COOKIE_NAME);

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/?authError=oauth_canceled`);
  }

  if (!savedState || !state || savedState !== state) {
    return NextResponse.redirect(`${url.origin}/?authError=invalid_state`);
  }

  const clientId = process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/?authError=missing_credentials`);
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(code, clientId, clientSecret);
    const profile = await fetchGitHubUserProfile(accessToken);

    const sessionData = {
      user: {
        login: profile.login,
        avatarUrl: profile.avatarUrl,
      },
      accessToken,
      createdAt: Date.now(),
    };

    const sessionToken = serializeSession(sessionData);

    // Set secure HTTP-only session cookie
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.redirect(`${url.origin}/?authSuccess=true`);
  } catch (err: unknown) {
    console.error("GitHub Auth Error:", err);
    return NextResponse.redirect(`${url.origin}/?authError=exchange_failed`);
  }
}
