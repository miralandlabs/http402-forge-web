export const LISTING_CATEGORIES = [
  { id: "art", labelKey: "categoryArt", descKey: "categoryArtDesc" },
  { id: "text", labelKey: "categoryText", descKey: "categoryTextDesc" },
  { id: "audio", labelKey: "categoryAudio", descKey: "categoryAudioDesc" },
  { id: "video", labelKey: "categoryVideo", descKey: "categoryVideoDesc" },
  { id: "prompt_pack", labelKey: "categoryPrompt", descKey: "categoryPromptDesc" },
] as const;

export type ListingCategoryId = (typeof LISTING_CATEGORIES)[number]["id"];

/** Match http402-forge-api defaults (MAX_ASSET_BYTES / MAX_PREVIEW_BYTES). */
export const MAX_ASSET_BYTES = 52_428_800;
export const MAX_PREVIEW_BYTES = 5_242_880;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
