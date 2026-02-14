const STORAGE_KEY = "articleDisplaySettings";

const DEFAULT = {
  fontFamily: "inherit",
  fontSize: "1.125rem",
  imageMaxWidth: "100%",
  lineHeight: "1.8",
};

export function getDisplaySettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return DEFAULT;
}

export function saveDisplaySettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
