import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getPortalWriteDisabledMessage,
  isPortalWriteDisabled,
} from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  getUploadSizeError,
  getUploadTypeError,
} from "@/lib/uploads";
import {
  getProjectStorageBucketName,
  getSupabaseServerClient,
} from "@/lib/supabase";

function sanitizeObjectPrefix(prefix: string) {
  return prefix
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(Boolean)
    .join("/");
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
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: getUploadSizeError(file.size) },
        { status: 413 }
      );
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: getUploadTypeError(file.type) },
        { status: 415 }
      );
    }

    const storage = getSupabaseServerClient();
    const bucket = getProjectStorageBucketName();
    const extension = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
      : "bin";
    const requestedPrefix =
      new URL(request.url).searchParams.get("prefix") ||
      "projects/" + new Date().getFullYear();
    const prefix = sanitizeObjectPrefix(requestedPrefix) || "uploads";
    const objectPath = `${prefix}/${randomUUID()}.${extension}`;

    const { error } = await storage.storage.from(bucket).upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message ||
            "Supabase Storage upload failed. Check your bucket name and storage policies.",
        },
        { status: 400 }
      );
    }

    const {
      data: { publicUrl },
    } = storage.storage.from(bucket).getPublicUrl(objectPath);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed. Check Supabase URL, service role key, and storage configuration.",
      },
      { status: 500 }
    );
  }
}
