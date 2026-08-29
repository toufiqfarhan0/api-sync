import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getSafeSessionResponse, parseSession, SESSION_COOKIE_NAME } from "../../../../lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSession(sessionCookie);

  const safeResponse = getSafeSessionResponse(session);
  return NextResponse.json(safeResponse);
}
