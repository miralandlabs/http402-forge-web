import type { SyntheticEvent } from "react";
import { MediaPreviewFrame } from "./MediaPreviewFrame";
import { previewRenderKind } from "../utils/listingPreview";

interface ListingPreviewMediaProps {
  url: string;
  contentType: string;
  title: string;
  previewLabel: string;
  audioLabel: string;
  imageClassName: string;
  videoClassName: string;
  audioClassName: string;
  pdfClassName: string;
  onLoaded: () => void;
  onFailed: () => void;
  mediaPlayHandlers?: {
    onPlay: (e: SyntheticEvent<HTMLMediaElement>) => void;
    onPause: (e: SyntheticEvent<HTMLMediaElement>) => void;
  };
  showAudioHeader?: boolean;
}

export function ListingPreviewMedia({
  url,
  contentType,
  title,
  previewLabel,
  audioLabel,
  imageClassName,
  videoClassName,
  audioClassName,
  pdfClassName,
  onLoaded,
  onFailed,
  mediaPlayHandlers,
  showAudioHeader = false,
}: ListingPreviewMediaProps) {
  const kind = previewRenderKind(contentType);

  if (kind === "image") {
    return (
      <img
        src={url}
        alt={title}
        className={imageClassName}
        onLoad={onLoaded}
        onError={onFailed}
      />
    );
  }

  if (kind === "video") {
    return (
      <MediaPreviewFrame kind="video">
        <video
          src={url}
          className={videoClassName}
          controls
          playsInline
          preload="metadata"
          aria-label={previewLabel}
          onLoadedData={onLoaded}
          onCanPlay={onLoaded}
          onError={onFailed}
          {...mediaPlayHandlers}
        />
      </MediaPreviewFrame>
    );
  }

  if (kind === "audio") {
    return (
      <>
        {showAudioHeader && (
          <div className="forge-card-audio-header">
            <span className="media-preview-frame-label">{audioLabel}</span>
            <p className="forge-card-audio-title">{title}</p>
          </div>
        )}
        <audio
          className={audioClassName}
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label={previewLabel}
          onLoadedData={onLoaded}
          onCanPlay={onLoaded}
          onError={onFailed}
          {...mediaPlayHandlers}
        />
      </>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        src={url}
        title={previewLabel}
        className={pdfClassName}
        onLoad={onLoaded}
      />
    );
  }

  return null;
}
