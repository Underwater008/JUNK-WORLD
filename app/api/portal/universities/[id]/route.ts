import { NextResponse } from "next/server";
import {
  getPortalWriteDisabledMessage,
  isPortalWriteDisabled,
} from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import { updateUniversity, deleteUniversity } from "@/lib/universities/server";

function toErrorResponse(error: unknown) {
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Update failed." }, { status: 500 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();
    const university = await updateUniversity(id, body);
    return NextResponse.json({ university });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    await deleteUniversity(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
