import type { ReactNode } from "react";

interface MediaPreviewFrameProps {
  kind: "video";
  children?: ReactNode;
}

/** Full-bleed frame for inline video previews on browse cards. */
export function MediaPreviewFrame({ children }: MediaPreviewFrameProps) {
  return <div className="media-preview-frame media-preview-frame--video">{children}</div>;
}
