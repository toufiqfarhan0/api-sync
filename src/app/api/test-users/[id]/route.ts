import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const users = [
    { id: "1", name: "Alice", email: "alice@example.com" },
    { id: "2", name: "Bob", email: "bob@example.com" },
  ];

  const user = users.find((u) => u.id === id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
