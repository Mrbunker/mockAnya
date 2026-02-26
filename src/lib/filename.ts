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
  const nameInput = (customName || "").trim().replace(/\.+$/, "");
  const normalizedExt = normalizeExt(ext || "");
  if (!nameInput) return fallback;
  if (!normalizedExt) return nameInput;
  const suffix = `.${normalizedExt}`;
  if (nameInput.toLowerCase().endsWith(suffix)) return nameInput;
  const lastDot = nameInput.lastIndexOf(".");
  if (lastDot > 0 && lastDot < nameInput.length - 1) {
    const base = nameInput.slice(0, lastDot);
    return `${base}${suffix}`;
  }
  return `${nameInput}${suffix}`;
}
