import { useEffect, useState, type SyntheticEvent } from "react";
import { LISTING_CATEGORIES } from "../constants/categories";
import { MediaPreviewFrame } from "./MediaPreviewFrame";
import { ArchivePreviewBadge, isZipContentType } from "./ArchivePreviewBadge";
import { useLocale } from "../hooks/useLocale";
import { onCardMediaPause, onCardMediaPlay } from "../utils/mediaPreviewCoordinator";
import {
  fetchTextPreview,
  listingPreviewMediaType,
  listingPreviewUrl,
} from "../utils/listingPreview";
import type { Listing } from "../services/api";

type PreviewState =
  | { status: "loading" }
  | { status: "text"; text: string }
  | { status: "media"; url: string; contentType: string; loaded: boolean }
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
  const mediaKind = listingPreviewMediaType(listing);

  useEffect(() => {
    let cancelled = false;

    if (mediaKind === "media") {
      setPreview({
        status: "media",
        url: listingPreviewUrl(listing),
        contentType: listing.contentType,
        loaded: false,
      });
      return;
    }

    setPreview({ status: "loading" });
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

    return () => {
      cancelled = true;
    };
  }, [listing, mediaKind]);

  const markMediaLoaded = () => {
    setPreview((prev) =>
      prev.status === "media" ? { ...prev, loaded: true } : prev,
    );
  };

  const isZip = isZipContentType(listing.contentType);
  const showZipBadge =
    isZip &&
    (preview.status === "empty" ||
      preview.status === "text" ||
      (preview.status === "media" &&
        !preview.contentType.startsWith("image/") &&
        !preview.contentType.startsWith("video/") &&
        !preview.contentType.startsWith("audio/")));

  const isInteractiveMedia =
    preview.status === "media" &&
    (preview.contentType.startsWith("video/") ||
      preview.contentType.startsWith("audio/"));

  const showMediaLoading =
    preview.status === "media" && !preview.loaded;

  return (
    <div
      className={`forge-card-preview${isInteractiveMedia ? " forge-card-preview--interactive" : ""}${preview.status === "media" && preview.contentType.startsWith("audio/") ? " forge-card-preview--audio" : ""}`}
    >
      {(preview.status === "loading" || showMediaLoading) && (
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
        <img
          src={preview.url}
          alt={listing.title}
          className="forge-card-preview-media"
          onLoad={markMediaLoaded}
        />
      )}
      {preview.status === "media" && preview.contentType.startsWith("video/") && (
        <MediaPreviewFrame kind="video">
          <video
            src={preview.url}
            className="forge-card-preview-media forge-card-preview-video"
            controls
            playsInline
            preload="metadata"
            aria-label={previewLabel}
            onLoadedData={markMediaLoaded}
            onCanPlay={markMediaLoaded}
            {...mediaPlayHandlers()}
          />
        </MediaPreviewFrame>
      )}
      {preview.status === "media" && preview.contentType.startsWith("audio/") && (
        <>
          <div className="forge-card-audio-header">
            <span className="media-preview-frame-label">{msg(audioLabel)}</span>
            <p className="forge-card-audio-title">{listing.title}</p>
          </div>
          <audio
            className="forge-card-preview-audio"
            src={preview.url}
            controls
            playsInline
            preload="metadata"
            aria-label={previewLabel}
            onLoadedData={markMediaLoaded}
            onCanPlay={markMediaLoaded}
            {...mediaPlayHandlers()}
          />
        </>
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
