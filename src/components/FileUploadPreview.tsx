import { useEffect, useMemo, useRef, useState } from "react";
import { formatBytes } from "../constants/categories";

interface FileUploadPreviewProps {
  id: string;
  label: string;
  hint: string;
  file: File | null;
  maxBytes: number;
  required?: boolean;
  emptyLabel: string;
  clearLabel: string;
  onChange: (file: File | null) => void;
}

export function FileUploadPreview({
  id,
  label,
  hint,
  file,
  maxBytes,
  required,
  emptyLabel,
  clearLabel,
  onChange,
}: FileUploadPreviewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const previewKind = file ? previewKindFor(file) : null;
  const tooLarge = file ? file.size > maxBytes : false;

  return (
    <section className={`upload-panel${tooLarge ? " upload-panel-error" : ""}`}>
      <div className="upload-panel-head">
        <div>
          <h3>{label}</h3>
          <p className="meta">{hint}</p>
        </div>
        {file && (
          <button type="button" className="control-btn" onClick={() => onChange(null)}>
            {clearLabel}
          </button>
        )}
      </div>

      <div
        className="upload-dropzone"
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {!file && <p className="upload-empty">{emptyLabel}</p>}
        {file && objectUrl && previewKind === "image" && (
          <img src={objectUrl} alt={file.name} className="upload-preview-media" />
        )}
        {file && objectUrl && previewKind === "audio" && (
          <audio controls src={objectUrl} className="upload-preview-audio" />
        )}
        {file && objectUrl && previewKind === "video" && (
          <video controls src={objectUrl} className="upload-preview-media" />
        )}
        {file && objectUrl && previewKind === "pdf" && (
          <iframe
            src={objectUrl}
            title={file.name}
            className="upload-preview-pdf"
          />
        )}
        {file && previewKind === "text" && <TextFilePreview file={file} />}
        {file && previewKind === "other" && (
          <div className="upload-file-badge">
            <span className="upload-file-icon" aria-hidden>
              📄
            </span>
            <span>{file.name}</span>
          </div>
        )}
      </div>

      {file && (
        <dl className="upload-meta">
          <div>
            <dt>Name</dt>
            <dd>{file.name}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{file.type || "application/octet-stream"}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{formatBytes(file.size)}</dd>
          </div>
        </dl>
      )}

      {tooLarge && (
        <p className="error">Max {formatBytes(maxBytes)} — choose a smaller file.</p>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        className="upload-input-hidden"
        required={required && !file}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </section>
  );
}

function previewKindFor(
  file: File,
): "image" | "audio" | "video" | "text" | "pdf" | "other" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (
    file.type === "application/pdf" ||
    file.type === "application/x-pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "pdf";
  }
  if (
    file.type.startsWith("text/") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".json")
  ) {
    return "text";
  }
  return "other";
}

function TextFilePreview({ file }: { file: File }) {
  const [snippet, setSnippet] = useState("Reading preview…");

  useEffect(() => {
    let cancelled = false;
    file
      .slice(0, 8192)
      .text()
      .then((text) => {
        if (!cancelled) {
          setSnippet(text.length > 4000 ? `${text.slice(0, 4000)}…` : text);
        }
      })
      .catch(() => {
        if (!cancelled) setSnippet("(Could not read text preview)");
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return <pre className="upload-text-preview">{snippet}</pre>;
}
