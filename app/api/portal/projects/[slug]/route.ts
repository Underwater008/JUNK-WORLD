import { NextResponse } from "next/server";
import {
  getPortalWriteDisabledMessage,
  isPortalWriteDisabled,
} from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import { deleteProject, updateProjectDraft } from "@/lib/projects/server";

function toErrorResponse(error: unknown) {
  if (error instanceof Error) {
    const status = error.message.toLowerCase().includes("duplicate") ||
      error.message.toLowerCase().includes("unique")
      ? 409
      : error.message.toLowerCase().includes("not found")
        ? 404
        : 400;

    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ error: "Project update failed." }, { status: 500 });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string }> }
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

  const { slug } = await context.params;

  try {
    const body = await request.json();
    const result = await updateProjectDraft(slug, body);
    return NextResponse.json({
      slug: result.record.slug,
      status: result.record.publishedContent ? "published" : "draft",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
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

  const { slug } = await context.params;

  try {
    const result = await deleteProject(slug);
    return NextResponse.json({ slug: result.deletedSlug });
  } catch (error) {
    return toErrorResponse(error);
  }
}
