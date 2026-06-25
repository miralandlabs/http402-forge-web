import type { ReactNode } from "react";

function PlayIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="23" fill="rgba(0,0,0,0.45)" />
      <path d="M19 15.5v17l14-8.5-14-8.5z" fill="#fff" />
    </svg>
  );
}

interface MediaPreviewFrameProps {
  kind: "video" | "audio";
  label?: string;
  children?: ReactNode;
}

export function MediaPreviewFrame({ kind, label, children }: MediaPreviewFrameProps) {
  return (
    <div className={`media-preview-frame media-preview-frame--${kind}`}>
      {children}
      {kind === "audio" && label && (
        <span className="media-preview-frame-label">{label}</span>
      )}
      <span className="media-play-badge">
        <PlayIcon />
      </span>
    </div>
  );
}
