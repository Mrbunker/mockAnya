import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { formatDateString } from "../src/lib/utils";
import {
  ERROR_CODE,
  err,
  getErrorMessageFromUnknown,
  ok,
} from "../src/lib/result";
import {
  IPC_EVENT,
  IPC_INVOKE,
  type GenerateAudioPayload,
  type GeneratePdfPayload,
  type GenerateVideoPayload,
  type OpenFilePayload,
  type OpenInFolderPayload,
  type SaveFilePayload,
  type FileExistsPayload,
} from "../src/ipc/contract";

const requireFFmpeg = createRequire(import.meta.url);
const ffmpegPath = requireFFmpeg("ffmpeg-static");

function getExecutablePath(filePath: string | null) {
  if (!filePath) return "";
  const resolved = String(filePath);
  return app.isPackaged
    ? resolved.replace("app.asar", "app.asar.unpacked")
    : resolved;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function gcd(a: number, b: number) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function getAspectRatio(width: number, height: number) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function escapeDrawtextValue(value: string) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

function getDrawtextFontPath() {
  const candidates =
    process.platform === "darwin"
      ? [
          "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
          "/System/Library/Fonts/Supplemental/Arial.ttf",
        ]
      : process.platform === "win32"
        ? ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/segoeui.ttf"]
        : [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
          ];
  return candidates.find((fontPath) => fs.existsSync(fontPath)) || "";
}

function buildVideoOverlayFilter(opts: {
  width: number;
  height: number;
  fps: number;
  duration: number;
}) {
  const { width, height, fps, duration } = opts;
  const label = `Size ${width}x${height} | AR ${getAspectRatio(
    width,
    height,
  )} | ${fps} FPS | ${duration}s`;
  const fontPath = getDrawtextFontPath();
  const fontfile = fontPath
    ? `fontfile='${escapeDrawtextValue(fontPath)}':`
    : "";
  const fontSize = Math.max(18, Math.round(Math.min(width, height) * 0.05));
  return (
    `drawtext=${fontfile}` +
    `text='${escapeDrawtextValue(label)}':` +
    `fontcolor=white:fontsize=${fontSize}:` +
    `x=24:y=h-th-24:` +
    "box=1:boxcolor=0x0f172a@0.6:boxborderw=14"
  );
}

function toPdfLiteralString(text: string) {
  let out = "(";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const code = text.charCodeAt(i);
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "";
    else if (code >= 0x20 && code <= 0x7e) out += ch;
    else out += "?";
  }
  out += ")";
  return out;
}

function buildPdfContentStream(text: string) {
  const lines = text.split(/\r\n|\n|\r/);
  const parts: string[] = [];
  parts.push("BT");
  parts.push("/F1 12 Tf");
  parts.push("14 TL");
  parts.push("72 800 Td");
  for (let i = 0; i < lines.length; i += 1) {
    parts.push(`${toPdfLiteralString(lines[i])} Tj`);
    if (i < lines.length - 1) parts.push("T*");
  }
  parts.push("ET");
  return parts.join("\n");
}

function assemblePdf(text: string, paddingLength?: number) {
  const contentStream = buildPdfContentStream(text);
  const contentStreamPayload = `${contentStream}\n`;
  const contentLength = Buffer.byteLength(contentStreamPayload, "utf8");
  const objects: Array<{ id: number; content: string }> = [
    {
      id: 1,
      content: "<< /Type /Catalog /Pages 2 0 R >>",
    },
    {
      id: 2,
      content: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    },
    {
      id: 3,
      content:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    },
    {
      id: 4,
      content: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    },
    {
      id: 5,
      content: `<< /Length ${contentLength} >>\nstream\n${contentStreamPayload}endstream`,
    },
  ];
  if (paddingLength !== undefined) {
    const paddingStream = "0".repeat(Math.max(0, paddingLength));
    const paddingStreamPayload = `${paddingStream}\n`;
    const paddingBytes = Buffer.byteLength(paddingStreamPayload, "utf8");
    objects.push({
      id: 6,
      content: `<< /Length ${paddingBytes} >>\nstream\n${paddingStreamPayload}endstream`,
    });
  }
  const header = "%PDF-1.4\n%mockany\n";
  const parts: string[] = [header];
  const offsets: number[] = [];
  let offset = Buffer.byteLength(header, "utf8");
  for (const obj of objects) {
    offsets[obj.id] = offset;
    const chunk = `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
    parts.push(chunk);
    offset += Buffer.byteLength(chunk, "utf8");
  }
  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const pdf = parts.join("") + xref + trailer;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}

function buildPdfBytes(text: string, targetBytes?: number) {
  const contentText = text || "Mockany PDF";
  const minPdf = assemblePdf(contentText);
  const minSize = minPdf.byteLength;
  if (typeof targetBytes !== "number" || !Number.isFinite(targetBytes)) {
    return minPdf;
  }
  const target = Math.max(0, Math.floor(targetBytes));
  if (target <= minSize) return minPdf;
  const baseWithPadding = assemblePdf(contentText, 0);
  const baseSize = baseWithPadding.byteLength;
  if (baseSize > target) return minPdf;
  let paddingBytes = Math.max(0, target - baseSize);
  let best = baseWithPadding;
  let bestDelta = Math.abs(baseSize - target);
  for (let i = 0; i < 12; i += 1) {
    const pdf = assemblePdf(contentText, paddingBytes);
    const size = pdf.byteLength;
    const delta = target - size;
    if (Math.abs(delta) < bestDelta) {
      best = pdf;
      bestDelta = Math.abs(delta);
    }
    if (delta === 0) return pdf;
    paddingBytes = Math.max(0, paddingBytes + delta);
  }
  return best;
}

function createWindow() {
  win = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send(
      IPC_EVENT.mainProcessMessage,
      formatDateString(Date.now()),
    );
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

ipcMain.handle(
  IPC_INVOKE.saveFile,
  async (_event, payload: SaveFilePayload) => {
    try {
      const { data, suggestedName, defaultDir } = payload || {};
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (defaultDir) {
        const filePath = path.join(defaultDir, suggestedName || "output");
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, buf);
        return ok({ path: filePath });
      }
      const result = await dialog.showSaveDialog({
        defaultPath: suggestedName || "output",
      });
      if (result.canceled || !result.filePath)
        return err(ERROR_CODE.canceled, "canceled");
      await fs.promises.writeFile(result.filePath, buf);
      return ok({ path: result.filePath });
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);

ipcMain.handle(
  IPC_INVOKE.openInFolder,
  async (_event, payload: OpenInFolderPayload) => {
    try {
      const { filePath } = payload || {};
      if (!filePath) return err(ERROR_CODE.invalidParam, "no filePath");
      shell.showItemInFolder(filePath);
      return ok({});
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);

ipcMain.handle(IPC_INVOKE.chooseSaveDir, async () => {
  try {
    const res = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (res.canceled || !res.filePaths?.[0])
      return err(ERROR_CODE.canceled, "canceled");
    return ok({ dir: res.filePaths[0] });
  } catch (e: unknown) {
    return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
  }
});

ipcMain.handle(
  IPC_INVOKE.openFile,
  async (_event, payload: OpenFilePayload) => {
    try {
      const { filePath } = payload || {};
      if (!filePath) return err(ERROR_CODE.invalidParam, "no filePath");
      const res = await shell.openPath(filePath);
      return res ? err(ERROR_CODE.rejected, res) : ok({});
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);
ipcMain.handle(
  IPC_INVOKE.fileExists,
  async (_event, payload: FileExistsPayload) => {
    try {
      const { filePath } = payload || {};
      if (!filePath) return err(ERROR_CODE.invalidParam, "no filePath");
      const exists = fs.existsSync(filePath);
      return ok({ exists });
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);
ipcMain.handle(
  IPC_INVOKE.generatePdf,
  async (_event, payload: GeneratePdfPayload) => {
    try {
      const text = typeof payload?.text === "string" ? payload.text : "";
      if (
        payload &&
        typeof payload === "object" &&
        "targetBytes" in payload &&
        (payload as { targetBytes?: unknown }).targetBytes !== undefined
      ) {
        const v = (payload as { targetBytes?: unknown }).targetBytes;
        if (!(typeof v === "number" && Number.isFinite(v) && v >= 0)) {
          return err(ERROR_CODE.invalidParam, "invalid targetBytes");
        }
      }
      const pdfBuffer = buildPdfBytes(
        text,
        typeof payload?.targetBytes === "number"
          ? payload.targetBytes
          : undefined,
      );
      return ok({
        data: new Uint8Array(pdfBuffer),
        filename: "text.pdf",
      });
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);
ipcMain.handle(
  IPC_INVOKE.generateVideo,
  async (_event, payload: GenerateVideoPayload) => {
    try {
      const executablePath = getExecutablePath(ffmpegPath);
      if (!executablePath)
        return err(ERROR_CODE.ffmpegNotFound, "ffmpeg not found");
      const { width, height, fps, duration, format } = payload || {};
      const w = Number(width) || 640;
      const h = Number(height) || 360;
      const r = Number(fps) || 30;
      const d = Number(duration) || 5;
      const ext = String(format || "mp4").toLowerCase();
      const outDir = path.join(app.getPath("temp"), "mockany");
      await fs.promises.mkdir(outDir, { recursive: true });
      const filename = `video_${w}x${h}_${r}fps_${d}s.${ext}`;
      const output = path.join(outDir, filename);
      const args = [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        `color=c=0x334155:s=${w}x${h}:d=${d}`,
        "-r",
        String(r),
        "-vf",
        buildVideoOverlayFilter({
          width: w,
          height: h,
          fps: r,
          duration: d,
        }),
      ];
      if (ext === "mp4" || ext === "mov" || ext === "mkv") {
        args.push("-pix_fmt", "yuv420p");
      }
      args.push("-y", output);
      await new Promise<void>((resolve, reject) => {
        const p = spawn(executablePath, args);
        let stderr = "";
        p.stderr.on("data", (c) => (stderr += String(c)));
        p.on("error", reject);
        p.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `ffmpeg exit ${code}`));
        });
      });
      const data = await fs.promises.readFile(output);
      try {
        await fs.promises.unlink(output);
      } catch {
        void 0;
      }
      return ok({ data, filename });
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);
ipcMain.handle(
  IPC_INVOKE.generateAudio,
  async (_event, payload: GenerateAudioPayload) => {
    try {
      const executablePath = getExecutablePath(ffmpegPath);
      if (!executablePath)
        return err(ERROR_CODE.ffmpegNotFound, "ffmpeg not found");
      const { duration, format } = payload || {};
      const d = Number(duration) || 5;
      const ext = String(format || "wav").toLowerCase();
      const outDir = path.join(app.getPath("temp"), "mockany");
      await fs.promises.mkdir(outDir, { recursive: true });
      const filename = `audio_${d}s.${ext}`;
      const output = path.join(outDir, filename);
      const isMp3 = ext === "mp3";
      const isWav = ext === "wav";
      const sampleRate = isMp3 ? 8000 : 8000;
      const channelLayout = "mono";
      const args = [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        `anullsrc=r=${sampleRate}:cl=${channelLayout}`,
        "-t",
        String(d),
      ];
      args.push("-ac", "1", "-ar", String(sampleRate));
      if (isMp3) args.push("-b:a", "16k");
      if (isWav) args.push("-c:a", "adpcm_ima_wav");
      args.push("-y", output);
      await new Promise<void>((resolve, reject) => {
        const p = spawn(executablePath, args);
        let stderr = "";
        p.stderr.on("data", (c) => (stderr += String(c)));
        p.on("error", reject);
        p.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(stderr || `ffmpeg exit ${code}`));
        });
      });
      const data = await fs.promises.readFile(output);
      try {
        await fs.promises.unlink(output);
      } catch {
        void 0;
      }
      return ok({ data, filename });
    } catch (e: unknown) {
      return err(ERROR_CODE.unknown, getErrorMessageFromUnknown(e));
    }
  },
);
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
