import "server-only";

import postgres from "postgres";
import { assertSupabaseConfig } from "@/lib/env";

declare global {
  var __junkSql: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  if (!global.__junkSql) {
    const { dbUrl } = assertSupabaseConfig();
    global.__junkSql = postgres(dbUrl, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 20,
      onnotice: () => {},
    });
  }

  return global.__junkSql;
}
