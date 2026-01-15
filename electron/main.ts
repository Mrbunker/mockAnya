import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { formatDateString } from "../src/lib/utils";

const requireFFmpeg = createRequire(import.meta.url);
const ffmpegPath = requireFFmpeg("ffmpeg-static");

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

function createWindow() {
  win = new BrowserWindow({
    // icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", formatDateString(Date.now()));
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

ipcMain.handle(
  "save-file",
  async (
    _event,
    payload: {
      data: Uint8Array | Buffer;
      suggestedName?: string;
      defaultDir?: string;
    }
  ) => {
    try {
      const { data, suggestedName, defaultDir } = payload || {};
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (defaultDir) {
        const filePath = path.join(defaultDir, suggestedName || "output");
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, buf);
        return { ok: true, path: filePath };
      }
      const result = await dialog.showSaveDialog({
        defaultPath: suggestedName || "output",
      });
      if (result.canceled || !result.filePath)
        return { ok: false, message: "canceled" };
      await fs.promises.writeFile(result.filePath, buf);
      return { ok: true, path: result.filePath };
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      return { ok: false, message: msg };
    }
  }
);

ipcMain.handle(
  "open-in-folder",
  async (_event, payload: { filePath: string }) => {
    try {
      const { filePath } = payload || {};
      if (!filePath) return { ok: false, message: "no filePath" };
      shell.showItemInFolder(filePath);
      return { ok: true };
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      return { ok: false, message: msg };
    }
  }
);

ipcMain.handle("choose-save-dir", async () => {
  try {
    const res = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (res.canceled || !res.filePaths?.[0])
      return { ok: false, message: "canceled" };
    return { ok: true, dir: res.filePaths[0] };
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e && "message" in e
        ? String((e as { message?: unknown }).message)
        : String(e);
    return { ok: false, message: msg };
  }
});

ipcMain.handle("open-file", async (_event, payload: { filePath: string }) => {
  try {
    const { filePath } = payload || {};
    if (!filePath) return { ok: false, message: "no filePath" };
    const res = await shell.openPath(filePath);
    return res ? { ok: false, message: res } : { ok: true };
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e && "message" in e
        ? String((e as { message?: unknown }).message)
        : String(e);
    return { ok: false, message: msg };
  }
});
ipcMain.handle("file-exists", async (_event, payload: { filePath: string }) => {
  try {
    const { filePath } = payload || {};
    if (!filePath) return { ok: false, message: "no filePath" };
    const exists = fs.existsSync(filePath);
    return { ok: true, exists };
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e && "message" in e
        ? String((e as { message?: unknown }).message)
        : String(e);
    return { ok: false, message: msg };
  }
});
ipcMain.handle(
  "generate-video",
  async (
    _event,
    payload: {
      width: number;
      height: number;
      fps: number;
      duration: number;
      format: string;
    }
  ) => {
    try {
      if (!ffmpegPath) return { ok: false, message: "ffmpeg not found" };
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
        `color=c=black:s=${w}x${h}:d=${d}`,
        "-r",
        String(r),
      ];
      if (ext === "mp4" || ext === "mov" || ext === "mkv") {
        args.push("-pix_fmt", "yuv420p");
      }
      args.push("-y", output);
      await new Promise<void>((resolve, reject) => {
        const p = spawn(ffmpegPath as string, args);
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
      return { ok: true, data, filename };
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      return { ok: false, message: msg };
    }
  }
);
ipcMain.handle(
  "generate-audio",
  async (_event, payload: { duration: number; format?: string }) => {
    try {
      if (!ffmpegPath) return { ok: false, message: "ffmpeg not found" };
      const { duration, format } = payload || {};
      const d = Number(duration) || 5;
      const ext = String(format || "wav").toLowerCase();
      const outDir = path.join(app.getPath("temp"), "mockany");
      await fs.promises.mkdir(outDir, { recursive: true });
      const filename = `audio_${d}s.${ext}`;
      const output = path.join(outDir, filename);
      const args = [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-t",
        String(d),
      ];
      if (ext === "wav") {
        args.push("-c:a", "pcm_s16le");
      }
      args.push("-y", output);
      await new Promise<void>((resolve, reject) => {
        const p = spawn(ffmpegPath as string, args);
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
      return { ok: true, data, filename };
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      return { ok: false, message: msg };
    }
  }
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
