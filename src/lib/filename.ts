export function normalizeExt(ext: string) {
  return String(ext || "")
    .trim()
    .replace(/^\./, "")
    .toLowerCase();
}

export function buildSuggestedFilename(
  customName: string | undefined,
  ext: string | undefined,
  fallback: string
) {
  const nameInput = (customName || "").trim();
  const normalizedExt = normalizeExt(ext || "");
  if (!nameInput) return fallback;
  if (!normalizedExt) return nameInput;
  const suffix = `.${normalizedExt}`;
  return nameInput.toLowerCase().endsWith(suffix)
    ? nameInput
    : `${nameInput}${suffix}`;
}
