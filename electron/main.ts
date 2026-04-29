import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
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
import { generateAudioBinary, generateVideoBinary, hasFfmpeg } from "./media";
import { buildPdfBytes } from "./pdf";

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
      if (!hasFfmpeg())
        return err(ERROR_CODE.ffmpegNotFound, "ffmpeg not found");
      const { data, filename } = await generateVideoBinary(payload);
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
      if (!hasFfmpeg())
        return err(ERROR_CODE.ffmpegNotFound, "ffmpeg not found");
      const { data, filename } = await generateAudioBinary(payload);
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
