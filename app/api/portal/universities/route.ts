import { NextResponse } from "next/server";
import {
  getPortalWriteDisabledMessage,
  isPortalWriteDisabled,
} from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import { getAllUniversities, createUniversity } from "@/lib/universities/server";

function toErrorResponse(error: unknown) {
  if (error instanceof Error) {
    const status =
      error.message.toLowerCase().includes("duplicate") ||
      error.message.toLowerCase().includes("unique")
        ? 409
        : 400;

    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ error: "Operation failed." }, { status: 500 });
}

export async function GET() {
  const sessionIsValid = await hasPortalSession();
  if (!sessionIsValid) {
    return NextResponse.json({ error: "Portal session expired." }, { status: 401 });
  }

  try {
    const universities = await getAllUniversities();
    return NextResponse.json({ universities });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const sessionIsValid = await hasPortalSession();
  if (!sessionIsValid) {
    return NextResponse.json({ error: "Portal session expired." }, { status: 401 });
  }

  if (isPortalWriteDisabled()) {
    return NextResponse.json(
      { error: getPortalWriteDisabledMessage() },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const university = await createUniversity(body);
    return NextResponse.json({ university });
  } catch (error) {
    return toErrorResponse(error);
  }
}
