export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "http402-forge-theme";

type ThemeListener = (mode: ThemeMode) => void;
const listeners = new Set<ThemeListener>();

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function getTheme(): ThemeMode {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

export function setTheme(mode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* blocked storage */
  }
  for (const fn of listeners) fn(mode);
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function initTheme(): ThemeMode {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  const mode: ThemeMode = isThemeMode(stored) ? stored : "dark";
  document.documentElement.setAttribute("data-theme", mode);
  return mode;
}

export function subscribeTheme(fn: ThemeListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function themeToggleIcon(mode: ThemeMode): string {
  return mode === "dark" ? "☀" : "☾";
}
