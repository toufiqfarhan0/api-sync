import { NextResponse } from "next/server";

export async function GET() {
  const users = [
    { id: "1", name: "Alice", email: "alice@example.com" },
    { id: "2", name: "Bob", email: "bob@example.com" },
  ];

  return NextResponse.json({ users }, { status: 200 });
}
