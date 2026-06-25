function ZipIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        d="M14 8h14l8 8v26a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M28 8v8h8M20 22h8M20 28h8M20 34h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 16v20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1.5 2.5"
      />
    </svg>
  );
}

interface ArchivePreviewBadgeProps {
  label?: string;
}

export function ArchivePreviewBadge({ label = "ZIP" }: ArchivePreviewBadgeProps) {
  return (
    <div className="forge-card-preview-archive">
      <ZipIcon />
      <span className="forge-card-preview-archive-label">{label}</span>
    </div>
  );
}

export function isZipContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct === "application/zip" ||
    ct === "application/x-zip-compressed" ||
    ct === "application/x-compressed" ||
    ct.endsWith("+zip")
  );
}
