import "server-only";

import fs from "node:fs";
import path from "node:path";

type EnvKey =
  | "supabaseUrl"
  | "supabaseAnonKey"
  | "supabaseDbUrl"
  | "portalPassword"
  | "storageBucket";

const envKeyCandidates: Record<EnvKey, string[]> = {
  supabaseUrl: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "SUPABASE PROJECT URL",
  ],
  supabaseAnonKey: [
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLIC_KEY",
    "SUPABASE PUBLIC KEY",
  ],
  supabaseDbUrl: [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "SUPABASE_DIRECT_CONNECTION_STRING",
    "SUPABASE DIRECT CONNECTION STRING",
  ],
  portalPassword: [
    "PROJECT_PORTAL_PASSWORD",
    "PORTAL_PASSWORD",
    "SUPABASE_PROJECT_PASSWORD",
    "SUPABASE PROJECT PASSWORD",
  ],
  storageBucket: ["SUPABASE_STORAGE_BUCKET", "PROJECT_STORAGE_BUCKET"],
};

let rawEnvCache: Map<string, string> | null = null;

function getEnvFiles() {
  return [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
  ];
}

function parseDotEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value] as const;
}

function getRawEnvMap() {
  if (rawEnvCache) return rawEnvCache;

  const envMap = new Map<string, string>();

  for (const filePath of getEnvFiles()) {
    if (!fs.existsSync(filePath)) continue;

    const fileContents = fs.readFileSync(filePath, "utf8");
    for (const line of fileContents.split(/\r?\n/)) {
      const parsed = parseDotEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      envMap.set(key, value);
    }
  }

  rawEnvCache = envMap;
  return envMap;
}

function readEnvValue(key: EnvKey) {
  for (const candidate of envKeyCandidates[key]) {
    const runtimeValue = process.env[candidate];
    if (runtimeValue) return runtimeValue;

    const fileValue = getRawEnvMap().get(candidate);
    if (fileValue) return fileValue;
  }

  return "";
}

export function getPortalPassword() {
  return readEnvValue("portalPassword");
}

export function getProjectStorageBucket() {
  return readEnvValue("storageBucket") || "project-assets";
}

export function getSupabaseConfig() {
  const url = readEnvValue("supabaseUrl");
  const anonKey = readEnvValue("supabaseAnonKey");
  const dbUrl = readEnvValue("supabaseDbUrl");

  return {
    url,
    anonKey,
    dbUrl,
    isConfigured: Boolean(url && anonKey && dbUrl),
  };
}

export function assertSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || !config.dbUrl) {
    throw new Error(
      "Supabase is not fully configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL, and PROJECT_PORTAL_PASSWORD (or their existing equivalents)."
    );
  }

  return config;
}

export function assertPortalPassword() {
  const password = getPortalPassword();
  if (!password) {
    throw new Error(
      "Portal password is missing. Set PROJECT_PORTAL_PASSWORD or SUPABASE PROJECT PASSWORD."
    );
  }

  return password;
}
