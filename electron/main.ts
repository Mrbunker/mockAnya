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
  type GenerateVideoPayload,
  type OpenFilePayload,
  type OpenInFolderPayload,
  type SaveFilePayload,
  type FileExistsPayload,
} from "../src/ipc/contract";

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
  IPC_INVOKE.generateVideo,
  async (_event, payload: GenerateVideoPayload) => {
    try {
      if (!ffmpegPath)
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
      if (!ffmpegPath)
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
