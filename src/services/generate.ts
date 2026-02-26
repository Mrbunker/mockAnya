import { ipcClient } from "../ipc/client";
import { IPC_INVOKE } from "../ipc/contract";
import { ERROR_CODE, err, ok, type Result } from "../lib/result";

export type ImageOptions = {
  format: "png" | "jpeg";
  width: number;
  height: number;
  bgMode: "black" | "solid" | "checker";
  color: string;
  onProgress?: (value: number) => void;
};

export async function generateImage(
  opts: ImageOptions,
): Promise<Result<{ blob: Blob; filename: string }>> {
  const { format, width, height, bgMode, color, onProgress } = opts;
  onProgress?.(10);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (bgMode === "black") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);
  } else if (bgMode === "solid") {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
  } else {
    const size = 32;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const isDark = (x / size + y / size) % 2 === 0;
        ctx.fillStyle = isDark ? "#111827" : "#374151";
        ctx.fillRect(x, y, size, size);
      }
    }
  }
  onProgress?.(60);
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b!),
      format === "png" ? "image/png" : "image/jpeg",
    );
  });
  const filename = `image_${width}x${height}.${format}`;
  onProgress?.(80);
  return ok({ blob, filename });
}

export type TextOptions = {
  format: "txt" | "json" | "csv" | "pdf";
  repeatText?: string;
  totalBytes?: number;
  onProgress?: (value: number) => void;
};

export async function generateText(
  opts: TextOptions,
): Promise<Result<{ blob: Blob; filename: string }>> {
  const { format, repeatText, totalBytes, onProgress } = opts;
  const safeRepeatText = typeof repeatText === "string" ? repeatText : "";
  const truncateUtf8ToBytes = (text: string, maxBytes: number) => {
    const bytes = new TextEncoder().encode(text);
    const end = Math.max(0, Math.min(bytes.byteLength, Math.floor(maxBytes)));
    const decoder = new TextDecoder("utf-8", { fatal: true });
    for (let i = end; i >= 0; i--) {
      try {
        return decoder.decode(bytes.subarray(0, i));
      } catch {
        void 0;
      }
    }
    return "";
  };
  const buildTextToTargetBytes = (text: string, bytes: number) => {
    const target = Math.max(0, Math.floor(bytes));
    if (target === 0) return "";
    const encoder = new TextEncoder();
    const unit = text ? `${text}\n` : "A\n";
    const unitBytes = encoder.encode(unit);
    if (unitBytes.byteLength <= 0) return "A".repeat(target);
    const repeats = Math.max(0, Math.floor(target / unitBytes.byteLength));
    let content = repeats > 0 ? unit.repeat(repeats) : "";
    const current = encoder.encode(content).byteLength;
    const remaining = Math.max(0, target - current);
    if (remaining > 0) content += "A".repeat(remaining);
    return truncateUtf8ToBytes(content, target).trimEnd();
  };
  const estimateRepeatsApprox = (baseText: string, content: string) => {
    if (!baseText) return content ? 1 : 0;
    const encoder = new TextEncoder();
    const unitBytes = encoder.encode(`${baseText}\n`).byteLength;
    if (unitBytes <= 0) return 0;
    const contentBytes = encoder.encode(content).byteLength;
    return Math.max(0, Math.floor(contentBytes / unitBytes));
  };
  const buildJsonToTargetBytes = (text: string, targetBytes: number) => {
    const encoder = new TextEncoder();
    let content = buildTextToTargetBytes(text, Math.max(0, targetBytes - 64));
    let repeatsApprox = estimateRepeatsApprox(text, content);
    for (let i = 0; i < 8; i++) {
      const json = JSON.stringify({ content, repeatsApprox });
      const len = encoder.encode(json).byteLength;
      const delta = targetBytes - len;
      if (Math.abs(delta) <= 2) return json;
      if (delta > 0) {
        content += "A".repeat(delta);
      } else {
        const nextBytes = Math.max(
          0,
          encoder.encode(content).byteLength + delta,
        );
        content = truncateUtf8ToBytes(content, nextBytes);
      }
      repeatsApprox = estimateRepeatsApprox(text, content);
    }
    return JSON.stringify({ content, repeatsApprox });
  };
  if (format === "pdf") {
    onProgress?.(10);
    const targetBytes =
      typeof totalBytes === "number" && Number.isFinite(totalBytes)
        ? Math.max(0, Math.floor(totalBytes))
        : undefined;
    const res = await ipcClient.invoke(IPC_INVOKE.generatePdf, {
      text: safeRepeatText,
      targetBytes,
    });
    if (!res.ok) return err(res.error.code, res.error.message);
    const { data, filename } = res.data;
    const ab = new ArrayBuffer(data.byteLength);
    const view = new Uint8Array(ab);
    view.set(data);
    const blob = new Blob([ab], { type: "application/pdf" });
    onProgress?.(90);
    return ok({ blob, filename });
  }
  let blob: Blob | undefined;
  if (!totalBytes || totalBytes <= 0) {
    if (format === "txt") {
      blob = new Blob([safeRepeatText], { type: "text/plain" });
    } else if (format === "json") {
      const obj = { content: safeRepeatText, repeatsApprox: 1 };
      blob = new Blob([JSON.stringify(obj, null, 2)], {
        type: "application/json",
      });
    } else if (format === "csv") {
      const escaped = safeRepeatText.replace(/"/g, '""');
      const content = `content,repeatsApprox\n"${escaped}",1\n`;
      blob = new Blob([content], { type: "text/csv" });
    }
  } else {
    if (format === "txt") {
      const encoder = new TextEncoder();
      const chunkBytes = encoder.encode((safeRepeatText + "\n").repeat(1000));
      let size = 0;
      const parts: ArrayBuffer[] = [];
      while (size + chunkBytes.byteLength <= totalBytes) {
        parts.push(chunkBytes.buffer);
        size += chunkBytes.byteLength;
        onProgress?.(Math.min(99, Math.floor((size / totalBytes) * 100)));
        if (parts.length % 100 === 0) await new Promise((r) => setTimeout(r));
      }
      const remaining = totalBytes - size;
      if (remaining > 0) {
        parts.push(chunkBytes.buffer.slice(0, remaining));
        size += remaining;
        onProgress?.(Math.min(99, Math.floor((size / totalBytes) * 100)));
      }
      blob = new Blob(parts, { type: "text/plain" });
    } else if (format === "json") {
      const json = buildJsonToTargetBytes(safeRepeatText, totalBytes);
      blob = new Blob([json], { type: "application/json" });
    } else if (format === "csv") {
      const encoder = new TextEncoder();
      const escaped = safeRepeatText.replace(/"/g, '""');
      const header = encoder.encode("content,repeatsApprox\n");
      const row = encoder.encode(`"${escaped}",1\n`);
      const parts: ArrayBuffer[] = [];
      let size = 0;
      const toArrayBuffer = (bytes: Uint8Array) => {
        const ab = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(ab).set(bytes);
        return ab;
      };
      const pushBytes = (bytes: Uint8Array) => {
        if (size >= totalBytes) return;
        const remaining = totalBytes - size;
        if (bytes.byteLength <= remaining) {
          parts.push(toArrayBuffer(bytes));
          size += bytes.byteLength;
        } else {
          parts.push(toArrayBuffer(bytes.subarray(0, remaining)));
          size += remaining;
        }
      };
      pushBytes(header);
      const rowBuf = toArrayBuffer(row);
      while (size + row.byteLength <= totalBytes) {
        parts.push(rowBuf);
        size += row.byteLength;
        onProgress?.(Math.min(99, Math.floor((size / totalBytes) * 100)));
        if (parts.length % 200 === 0) await new Promise((r) => setTimeout(r));
      }
      if (size < totalBytes) {
        const remaining = totalBytes - size;
        parts.push(toArrayBuffer(row.subarray(0, remaining)));
        size += remaining;
        onProgress?.(Math.min(99, Math.floor((size / totalBytes) * 100)));
      }
      blob = new Blob(parts, { type: "text/csv" });
    }
  }
  if (!blob) return err(ERROR_CODE.invalidParam, "invalid format");
  const filename = `text.${format}`;
  return ok({ blob, filename });
}

export type VideoOptions = {
  format: "mp4" | "webm" | "mov" | "mkv";
  width: number;
  height: number;
  fps: number;
  duration: number;
  onProgress?: (value: number) => void;
};

export async function generateVideo(
  opts: VideoOptions,
): Promise<Result<{ blob: Blob; filename: string }>> {
  const { format, width, height, fps, duration, onProgress } = opts;
  onProgress?.(10);
  const res = await ipcClient.invoke(IPC_INVOKE.generateVideo, {
    format,
    width,
    height,
    fps,
    duration,
  });
  onProgress?.(60);
  if (!res.ok) return err(res.error.code, res.error.message);
  const { data, filename } = res.data;
  const ab = new ArrayBuffer(data.byteLength);
  const view = new Uint8Array(ab);
  view.set(data);
  const blob = new Blob([ab]);
  onProgress?.(80);
  return ok({ blob, filename });
}

export type AudioOptions = {
  format?: "wav" | "mp3";
  duration: number;
  onProgress?: (value: number) => void;
};

export async function generateAudio(
  opts: AudioOptions,
): Promise<Result<{ blob: Blob; filename: string }>> {
  const { format = "wav", duration, onProgress } = opts;
  onProgress?.(10);
  const res = await ipcClient.invoke(IPC_INVOKE.generateAudio, {
    format,
    duration,
  });
  onProgress?.(60);
  if (!res.ok) return err(res.error.code, res.error.message);
  const { data, filename } = res.data;
  const ab = new ArrayBuffer(data.byteLength);
  const view = new Uint8Array(ab);
  view.set(data);
  const blob = new Blob([ab]);
  onProgress?.(80);
  return ok({ blob, filename });
}
