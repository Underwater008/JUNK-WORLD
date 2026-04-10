export const PORTAL_READ_ONLY_MESSAGE =
  "Portal writes are disabled in local development. You can browse live content, but saving drafts, publishing, and uploads are blocked.";

function parseBoolean(value: string | undefined) {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;

  return null;
}

export function isPortalWriteDisabled() {
  const explicitValue = parseBoolean(process.env.PORTAL_READ_ONLY);
  if (explicitValue !== null) return explicitValue;

  return process.env.NODE_ENV === "development";
}

export function getPortalWriteDisabledMessage() {
  return PORTAL_READ_ONLY_MESSAGE;
}
