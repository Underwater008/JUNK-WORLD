import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assertPortalPassword } from "@/lib/env";

const SESSION_COOKIE_NAME = "junk_portal_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function signPayload(payload: string) {
  const secret = assertPortalPassword();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return Buffer.from(signature).toString("base64url");
}

async function verifyPayload(payload: string, signature: string) {
  const expectedSignature = await signPayload(payload);
  return expectedSignature === signature;
}

export async function createPortalSessionCookie() {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_TTL_MS,
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function isPortalSessionTokenValid(token: string | undefined) {
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const isValidSignature = await verifyPayload(encodedPayload, signature);
  if (!isValidSignature) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function setPortalSession() {
  const cookieStore = await cookies();
  const token = await createPortalSessionCookie();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearPortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function hasPortalSession() {
  const cookieStore = await cookies();
  return isPortalSessionTokenValid(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requirePortalSession(nextPath?: string) {
  const sessionIsValid = await hasPortalSession();
  if (sessionIsValid) return;

  const loginUrl = nextPath
    ? `/portal/login?next=${encodeURIComponent(nextPath)}`
    : "/portal/login";
  redirect(loginUrl);
}

export async function assertPortalPasswordMatch(password: string) {
  const expected = assertPortalPassword();
  return password === expected;
}
