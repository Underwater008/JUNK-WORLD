export function uploadAsset(file: File, prefix?: string): Promise<string> {
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
