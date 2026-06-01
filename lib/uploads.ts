export const MAX_UPLOAD_MB = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function getUploadSizeError(fileSize: number) {
  const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
  return `That file is ${sizeMb} MB. Please keep uploads under ${MAX_UPLOAD_MB} MB - try compressing it (tinypng.com works well) or resizing to ~2000px on the long edge.`;
}

export function getUploadTypeError(fileType: string) {
  return `That image format (${fileType || "unknown"}) isn't supported. Please upload JPEG, PNG, WebP, or GIF.`;
}

export function uploadAsset(file: File, prefix?: string): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error(getUploadSizeError(file.size)));
  }

  if (file.type.startsWith("image/") && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return Promise.reject(new Error(getUploadTypeError(file.type)));
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
