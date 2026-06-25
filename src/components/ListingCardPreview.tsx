import { useEffect, useState } from "react";
import { API_BASE, type Listing } from "../services/api";
import { LISTING_CATEGORIES } from "../constants/categories";
import { MediaPreviewFrame } from "./MediaPreviewFrame";
import { ArchivePreviewBadge, isZipContentType } from "./ArchivePreviewBadge";
import { useLocale } from "../hooks/useLocale";

type PreviewState =
  | { status: "loading" }
  | { status: "text"; text: string }
  | { status: "media"; url: string; contentType: string }
  | { status: "empty" };

interface ListingCardPreviewProps {
  listing: Listing;
}

export function ListingCardPreview({ listing }: ListingCardPreviewProps) {
  const { msg } = useLocale();
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const audioLabel =
    LISTING_CATEGORIES.find((c) => c.id === "audio")?.labelKey ?? "categoryAudio";

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setPreview({ status: "loading" });
    fetch(`${API_BASE}/api/v1/listings/${listing.id}/preview`)
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setPreview({ status: "empty" });
          return;
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.startsWith("text/") || contentType.includes("json")) {
          const text = await res.text();
          if (!cancelled) {
            setPreview({
              status: "text",
              text: text.trim() || listing.description.slice(0, 280),
            });
          }
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPreview({ status: "media", url: objectUrl, contentType });
        }
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: "empty" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [listing.id, listing.description]);

  const isZip = isZipContentType(listing.contentType);
  const showZipBadge =
    isZip &&
    (preview.status === "empty" ||
      preview.status === "text" ||
      (preview.status === "media" &&
        !preview.contentType.startsWith("image/") &&
        !preview.contentType.startsWith("video/") &&
        !preview.contentType.startsWith("audio/")));

  return (
    <div className="forge-card-preview" aria-hidden>
      {preview.status === "loading" && (
        <div className="forge-card-preview-placeholder">{msg("loading")}</div>
      )}
      {showZipBadge && <ArchivePreviewBadge />}
      {!showZipBadge && preview.status === "empty" && (
        <div className="forge-card-preview-placeholder">{msg("previewUnavailable")}</div>
      )}
      {!showZipBadge && preview.status === "text" && (
        <p className="forge-card-preview-text">{preview.text}</p>
      )}
      {preview.status === "media" && preview.contentType.startsWith("image/") && (
        <img src={preview.url} alt="" className="forge-card-preview-media" />
      )}
      {preview.status === "media" && preview.contentType.startsWith("video/") && (
        <MediaPreviewFrame kind="video">
          <video
            src={preview.url}
            className="forge-card-preview-media"
            muted
            playsInline
            preload="metadata"
          />
        </MediaPreviewFrame>
      )}
      {preview.status === "media" && preview.contentType.startsWith("audio/") && (
        <MediaPreviewFrame kind="audio" label={msg(audioLabel)} />
      )}
      {preview.status === "media" &&
        !preview.contentType.startsWith("image/") &&
        !preview.contentType.startsWith("video/") &&
        !preview.contentType.startsWith("audio/") &&
        !showZipBadge && (
          <div className="forge-card-preview-placeholder">{msg("previewUnavailable")}</div>
        )}
    </div>
  );
}
