import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getPortalWriteDisabledMessage,
  isPortalWriteDisabled,
} from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import { getProjectStorageBucketName, getSupabaseStorageClient } from "@/lib/supabase";

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

    const storage = getSupabaseStorageClient();
    const bucket = getProjectStorageBucketName();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const objectPath = `projects/${new Date().getFullYear()}/${randomUUID()}.${extension}`;

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
            : "Upload failed. Check Supabase URL, anon key, and storage configuration.",
      },
      { status: 500 }
    );
  }
}
