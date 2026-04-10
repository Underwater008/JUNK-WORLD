import "server-only";

import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfig, getProjectStorageBucket } from "@/lib/env";

export function getSupabaseStorageClient() {
  const { url, anonKey } = assertSupabaseConfig();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getProjectStorageBucketName() {
  return getProjectStorageBucket();
}
