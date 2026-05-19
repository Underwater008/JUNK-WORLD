export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function uploadAsset(file: File, prefix?: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return Promise.reject(
      new Error(
        `That file is ${sizeMb} MB. Please keep uploads under 4 MB — try compressing it (tinypng.com works well) or resizing to ~2000px on the long edge.`
      )
    );
  }

  if (file.type.startsWith("image/") && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return Promise.reject(
      new Error(
        `That image format (${file.type}) isn't supported. Please upload JPEG, PNG, WebP, or GIF.`
      )
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const url = prefix
    ? `/api/portal/uploads?prefix=${encodeURIComponent(prefix)}`
    : "/api/portal/uploads";

  return fetch(url, {
    method: "POST",
    body: formData,
  }).then(async (response) => {
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? "Upload failed.");
    }
    return payload.url;
  });
}
