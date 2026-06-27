import { useEffect, useState, type SyntheticEvent } from "react";
import { LISTING_CATEGORIES } from "../constants/categories";
import { ArchivePreviewBadge, isZipContentType } from "./ArchivePreviewBadge";
import { ListingPreviewMedia } from "./ListingPreviewMedia";
import { useLocale } from "../hooks/useLocale";
import { onCardMediaPause, onCardMediaPlay } from "../utils/mediaPreviewCoordinator";
import {
  fetchTextPreview,
  listingPreviewUrl,
  previewRenderKind,
  resolvePreviewContentType,
} from "../utils/listingPreview";
import type { Listing } from "../services/api";

type PreviewState =
  | { status: "loading" }
  | { status: "text"; text: string }
  | { status: "media"; url: string; contentType: string }
  | { status: "empty" };

interface ListingCardPreviewProps {
  listing: Listing;
}

function mediaPlayHandlers() {
  return {
    onPlay: (e: SyntheticEvent<HTMLMediaElement>) => {
      onCardMediaPlay(e.currentTarget);
    },
    onPause: (e: SyntheticEvent<HTMLMediaElement>) => {
      onCardMediaPause(e.currentTarget);
    },
  };
}

export function ListingCardPreview({ listing }: ListingCardPreviewProps) {
  const { msg } = useLocale();
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const audioLabel =
    LISTING_CATEGORIES.find((c) => c.id === "audio")?.labelKey ?? "categoryAudio";
  const previewLabel = `${msg("preview")}: ${listing.title}`;

  useEffect(() => {
    let cancelled = false;
    setPreview({ status: "loading" });

    resolvePreviewContentType(listing)
      .then((previewContentType) => {
        if (cancelled) return;
        const kind = previewRenderKind(previewContentType);
        if (kind === "text") {
          fetchTextPreview(listing)
            .then((text) => {
              if (cancelled) return;
              if (text) {
                setPreview({ status: "text", text });
              } else {
                setPreview({
                  status: "text",
                  text: listing.description.slice(0, 280),
                });
              }
            })
            .catch(() => {
              if (!cancelled) setPreview({ status: "empty" });
            });
          return;
        }
        if (kind === "unavailable") {
          setPreview({ status: "empty" });
          return;
        }
        setPreview({
          status: "media",
          url: listingPreviewUrl(listing),
          contentType: previewContentType,
        });
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: "empty" });
      });

    return () => {
      cancelled = true;
    };
  }, [listing]);

  const isZip = isZipContentType(listing.contentType);
  const previewKind =
    preview.status === "media"
      ? previewRenderKind(preview.contentType)
      : "unavailable";
  const showZipBadge =
    isZip &&
    (preview.status === "empty" ||
      preview.status === "text" ||
      previewKind === "unavailable");

  const isInteractiveMedia =
    preview.status === "media" &&
    (previewKind === "video" || previewKind === "audio");

  return (
    <div
      className={`forge-card-preview${isInteractiveMedia ? " forge-card-preview--interactive" : ""}${preview.status === "media" && previewKind === "audio" ? " forge-card-preview--audio" : ""}${preview.status === "media" && previewKind === "pdf" ? " forge-card-preview--pdf" : ""}`}
    >
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
      {preview.status === "media" && (
        <ListingPreviewMedia
          url={preview.url}
          contentType={preview.contentType}
          title={listing.title}
          previewLabel={previewLabel}
          audioLabel={msg(audioLabel)}
          imageClassName="forge-card-preview-media"
          videoClassName="forge-card-preview-media forge-card-preview-video"
          audioClassName="forge-card-preview-audio"
          pdfClassName="forge-card-preview-pdf"
          mediaPlayHandlers={mediaPlayHandlers()}
          showAudioHeader={previewKind === "audio"}
        />
      )}
      {preview.status === "media" && previewKind === "unavailable" && !showZipBadge && (
        <div className="forge-card-preview-placeholder">{msg("previewUnavailable")}</div>
      )}
    </div>
  );
}
