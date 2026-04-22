export function normalizeExt(ext: string) {
  return String(ext || "")
    .trim()
    .replace(/^\./, "")
    .toLowerCase();
}

function randomString(len = 6) {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const n = Math.max(1, Math.floor(len || 0));
  try {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < n; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  } catch {
    let out = "";
    for (let i = 0; i < n; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }
}

function getBasename(name: string) {
  return String(name || "")
    .trim()
    .replace(/\.+$/, "");
}

function buildAutoBasename(fallback: string) {
  const base = getBasename(fallback)
    .replace(/\.[^.]+$/, "")
    .replace(/^(image|video|audio|text)[_-]+/i, "");
  const suffix = randomString();
  if (!base) return suffix;
  return `${base}_${suffix}`;
}

export function buildSuggestedFilename(
  customName: string | undefined,
  ext: string | undefined,
  fallback: string,
) {
  const nameInput = getBasename(customName || "");
  const normalizedExt = normalizeExt(ext || "");
  const resolvedName = nameInput || buildAutoBasename(fallback);
  if (!resolvedName) return fallback;
  if (!normalizedExt) return resolvedName;
  const suffix = `.${normalizedExt}`;
  if (resolvedName.toLowerCase().endsWith(suffix)) return resolvedName;
  const lastDot = resolvedName.lastIndexOf(".");
  if (lastDot > 0 && lastDot < resolvedName.length - 1) {
    const base = resolvedName.slice(0, lastDot);
    return `${base}${suffix}`;
  }
  return `${resolvedName}${suffix}`;
}
