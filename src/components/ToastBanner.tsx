interface ToastBannerProps {
  title: string;
  detail?: string;
  dismissLabel: string;
  variant?: "success" | "error";
  onDismiss: () => void;
}

export function ToastBanner({
  title,
  detail,
  dismissLabel,
  variant = "success",
  onDismiss,
}: ToastBannerProps) {
  return (
    <div
      className={`toast-banner toast-banner-${variant}`}
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDismiss();
        }
      }}
      tabIndex={0}
      title={dismissLabel}
    >
      <span className="toast-banner-icon" aria-hidden="true">
        {variant === "success" ? (
          <svg viewBox="0 0 24 24" width="22" height="22">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
            <path
              d="M8.5 12.2l2.3 2.3 5.2-5.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22">
            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
            <path
              d="M12 8v5M12 16h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <div className="toast-banner-body">
        <strong className="toast-banner-title">{title}</strong>
        {detail && <p className="toast-banner-detail">{detail}</p>}
        <span className="toast-banner-hint">{dismissLabel}</span>
      </div>
    </div>
  );
}
