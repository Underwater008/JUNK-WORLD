import { NextResponse } from "next/server";
import { assertPortalPasswordMatch, setPortalSession } from "@/lib/portal/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;

  if (!body?.password) {
    return NextResponse.json(
      { error: "Enter the shared portal password." },
      { status: 400 }
    );
  }

  const passwordMatches = await assertPortalPasswordMatch(body.password);
  if (!passwordMatches) {
    return NextResponse.json(
      { error: "That password does not match the portal configuration." },
      { status: 401 }
    );
  }

  await setPortalSession();
  return NextResponse.json({ ok: true });
}
