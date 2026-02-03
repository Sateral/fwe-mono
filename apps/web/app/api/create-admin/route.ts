import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

export async function POST(request: NextRequest) {
  if (!bootstrapSecret) {
    return NextResponse.json({ error: "Bootstrap disabled" }, { status: 403 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${bootstrapSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, password, name } = body ?? {};

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const user = await auth.api.createUser({
    body: {
      email,
      password,
      name: name || "Admin",
      role: "admin",
    },
  });

  return NextResponse.json({ id: user.user.id });
}
