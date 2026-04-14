import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  assertSupabaseConfig,
  assertSupabaseServerConfig,
  getProjectStorageBucket,
} from "@/lib/env";

export function getSupabaseStorageClient() {
  const { url, anonKey } = assertSupabaseConfig();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSupabaseServerClient() {
  const { url, serviceRoleKey } = assertSupabaseServerConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getProjectStorageBucketName() {
  return getProjectStorageBucket();
}
