export type ImageOptions = {
  format: "png" | "jpeg";
  width: number;
  height: number;
  bgMode: "black" | "solid" | "checker";
  color: string;
  onProgress?: (value: number) => void;
};

export async function generateImage(opts: ImageOptions) {
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
      format === "png" ? "image/png" : "image/jpeg"
    );
  });
  const filename = `image_${width}x${height}.${format}`;
  onProgress?.(80);
  return { blob, filename };
}

export type TextOptions = {
  format: "txt" | "json";
  repeatText: string;
  totalBytes?: number;
  onProgress?: (value: number) => void;
};

export async function generateText(opts: TextOptions) {
  const { format, repeatText, totalBytes, onProgress } = opts;
  let blob: Blob;
  if (!totalBytes || totalBytes <= 0) {
    if (format === "txt") {
      blob = new Blob([repeatText], { type: "text/plain" });
    } else {
      const obj = { content: repeatText, repeatsApprox: 1 };
      blob = new Blob([JSON.stringify(obj, null, 2)], {
        type: "application/json",
      });
    }
  } else {
    if (format === "txt") {
      const encoder = new TextEncoder();
      const chunkBytes = encoder.encode((repeatText + "\n").repeat(1000));
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
    } else {
      const unitLen = new TextEncoder().encode(repeatText).byteLength;
      const repeatsApprox =
        unitLen > 0 ? Math.round((totalBytes ?? 0) / unitLen) : 0;
      const obj = { content: repeatText, repeatsApprox };
      blob = new Blob([JSON.stringify(obj, null, 2)], {
        type: "application/json",
      });
    }
  }
  const filename = `text.${format}`;
  return { blob, filename };
}

export type VideoOptions = {
  format: "mp4" | "webm" | "mov" | "mkv";
  width: number;
  height: number;
  fps: number;
  duration: number;
  onProgress?: (value: number) => void;
};

export async function generateVideo(opts: VideoOptions) {
  const { format, width, height, fps, duration, onProgress } = opts;
  onProgress?.(10);
  const res = await window.ipcRenderer?.invoke("generate-video", {
    format,
    width,
    height,
    fps,
    duration,
  });
  onProgress?.(60);
  if (!res?.ok) {
    throw new Error(String(res?.message || "generate video failed"));
  }
  const data: Uint8Array = res.data as Uint8Array;
  const ab = new ArrayBuffer(data.byteLength);
  const view = new Uint8Array(ab);
  view.set(data);
  const blob = new Blob([ab]);
  const filename = res.filename as string;
  onProgress?.(80);
  return { blob, filename };
}

export type AudioOptions = {
  format?: "wav" | "mp3";
  duration: number;
  onProgress?: (value: number) => void;
};

export async function generateAudio(opts: AudioOptions) {
  const { format = "wav", duration, onProgress } = opts;
  onProgress?.(10);
  const res = await window.ipcRenderer?.invoke("generate-audio", {
    format,
    duration,
  });
  onProgress?.(60);
  if (!res?.ok) {
    throw new Error(String(res?.message || "generate audio failed"));
  }
  const data: Uint8Array = res.data as Uint8Array;
  const ab = new ArrayBuffer(data.byteLength);
  const view = new Uint8Array(ab);
  view.set(data);
  const blob = new Blob([ab]);
  const filename = res.filename as string;
  onProgress?.(80);
  return { blob, filename };
}
