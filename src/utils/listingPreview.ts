import type { Listing } from "../services/api";
import { previewResponseContentType } from "../services/api";

export function isTextPreviewContentType(contentType: string): boolean {
  const ct = contentType.split(";")[0]?.trim() ?? "";
  return ct.startsWith("text/") || ct.includes("json");
}

export function isMediaPreviewContentType(contentType: string): boolean {
  const ct = contentType.split(";")[0]?.trim() ?? "";
  return (
    ct.startsWith("image/") ||
    ct.startsWith("video/") ||
    ct.startsWith("audio/")
  );
}

/** Direct preview URL for media; fetch only for text/json snippets. */
export function listingPreviewUrl(listing: Listing): string {
  return listing.previewUrl;
}

export function listingPreviewMediaType(listing: Listing): "text" | "media" | "unknown" {
  if (isTextPreviewContentType(listing.contentType)) return "text";
  if (isMediaPreviewContentType(listing.contentType)) return "media";
  return "unknown";
}

export async function fetchTextPreview(
  listing: Listing,
): Promise<string | null> {
  const res = await fetch(listingPreviewUrl(listing));
  if (!res.ok) return null;
  const contentType = previewResponseContentType(
    res.headers.get("content-type"),
    listing.contentType,
  );
  if (!isTextPreviewContentType(contentType)) return null;
  const text = await res.text();
  return text.trim() || null;
}
