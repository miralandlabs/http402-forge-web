import { useCallback, useEffect, useRef, type SyntheticEvent } from "react";
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

function syncImageLoaded(
  img: HTMLImageElement,
  onLoaded: () => void,
  onFailed: () => void,
) {
  if (!img.complete) return;
  if (img.naturalWidth > 0) onLoaded();
  else onFailed();
}

function syncMediaLoaded(el: HTMLMediaElement, onLoaded: () => void) {
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
    onLoaded();
  }
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
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const onImageRef = useCallback(
    (img: HTMLImageElement | null) => {
      imageRef.current = img;
      if (!img) return;
      syncImageLoaded(img, onLoaded, onFailed);
    },
    [onLoaded, onFailed],
  );

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    syncImageLoaded(img, onLoaded, onFailed);
  }, [url, onLoaded, onFailed]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    syncMediaLoaded(el, onLoaded);
  }, [url, onLoaded]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    syncMediaLoaded(el, onLoaded);
  }, [url, onLoaded]);

  if (kind === "image") {
    return (
      <img
        ref={onImageRef}
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
          ref={videoRef}
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
          ref={audioRef}
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
