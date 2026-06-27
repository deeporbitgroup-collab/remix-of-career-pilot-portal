import { supabase } from "@/integrations/supabase/client";

type TalentPoolDocBucket = "talent-pool-cv" | "talent-pool-covers";

/** Parse a Supabase Storage public/signed URL into bucket + object path. */
export function parseSupabaseStorageUrl(fileUrl: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(fileUrl);
    const after = url.pathname.split("/storage/v1/object/")[1] || "";
    const parts = after.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const isPublic = parts[0] === "public";
    const bucket = isPublic ? parts[1] : parts[0];
    const objectPath = parts.slice(isPublic ? 2 : 1).join("/");
    return { bucket, path: decodeURIComponent(objectPath) };
  } catch {
    return null;
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/**
 * Download a Talent Pool CV or cover letter without opening the browser PDF viewer.
 * Uses the Storage API first (reliable for public buckets), then fetch as fallback.
 */
export async function downloadTalentPoolDocument(
  storedRef: string | null | undefined,
  filename: string,
  bucketHint?: TalentPoolDocBucket
): Promise<void> {
  if (!storedRef?.trim()) {
    throw new Error("Document not available");
  }

  const parsed = storedRef.startsWith("http") ? parseSupabaseStorageUrl(storedRef) : null;
  const bucket = (parsed?.bucket ?? bucketHint) as TalentPoolDocBucket | undefined;
  const path = parsed?.path ?? storedRef;

  if (bucket && path && !storedRef.startsWith("http")) {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (!error && data) {
      triggerBlobDownload(data, filename);
      return;
    }
  }

  if (bucket && parsed?.path) {
    const { data, error } = await supabase.storage.from(bucket).download(parsed.path);
    if (!error && data) {
      triggerBlobDownload(data, filename);
      return;
    }
  }

  const fetchUrl =
    storedRef.startsWith("http")
      ? storedRef
      : bucket
        ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
        : storedRef;

  const res = await fetch(fetchUrl, { mode: "cors" });
  if (!res.ok) throw new Error("Download failed");
  triggerBlobDownload(await res.blob(), filename);
}
