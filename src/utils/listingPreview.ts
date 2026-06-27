import type { Listing } from "../services/api";

export type PreviewRenderKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "unavailable";

/** Classify how to render a preview from its stored MIME type (not the asset type). */
export function previewRenderKind(contentType: string): PreviewRenderKind {
  const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ct) return "unavailable";
  if (ct.startsWith("text/") || ct === "application/json") return "text";
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("video/")) return "video";
  if (ct.startsWith("audio/")) return "audio";
  if (ct === "application/pdf" || ct === "application/x-pdf") return "pdf";
  return "unavailable";
}

export function normalizePreviewContentType(headerValue: string | null): string {
  return (headerValue ?? "").split(";")[0]?.trim() ?? "";
}

export function listingPreviewUrl(listing: Listing): string {
  return listing.previewUrl;
}

export function isPdfAsset(contentType: string): boolean {
  const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return ct === "application/pdf" || ct === "application/x-pdf";
}

/** Page-limited PDF sample for listing detail (not the paid asset). */
export function listingPreviewPdfUrl(listing: Listing): string | null {
  return listing.previewPdfUrl ?? null;
}

export function storedPreviewContentType(listing: Listing): string {
  return listing.previewContentType?.trim() ?? "";
}

/** Resolve preview MIME type from listing metadata, or HEAD /preview for legacy rows. */
export async function resolvePreviewContentType(
  listing: Listing,
): Promise<string> {
  const stored = storedPreviewContentType(listing);
  if (stored) return stored;
  try {
    const res = await fetch(listing.previewUrl, { method: "HEAD" });
    if (!res.ok) return "";
    return normalizePreviewContentType(res.headers.get("content-type"));
  } catch {
    return "";
  }
}

export async function fetchTextPreview(
  listing: Listing,
): Promise<string | null> {
  const res = await fetch(listingPreviewUrl(listing));
  if (!res.ok) return null;
  const contentType = normalizePreviewContentType(
    res.headers.get("content-type"),
  );
  if (previewRenderKind(contentType) !== "text") return null;
  const text = await res.text();
  return text.trim() || null;
}
