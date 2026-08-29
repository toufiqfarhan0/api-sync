import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, STATE_COOKIE_NAME } from "../../../../lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(STATE_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
