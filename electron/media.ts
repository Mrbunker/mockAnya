import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import type {
  GenerateAudioPayload,
  GenerateVideoPayload,
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

function runFfmpeg(executablePath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(executablePath, args);
    let stderr = "";
    p.stderr.on("data", (c) => (stderr += String(c)));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exit ${code}`));
    });
  });
}

export function hasFfmpeg() {
  return Boolean(getExecutablePath(ffmpegPath));
}

export async function generateVideoBinary(payload: GenerateVideoPayload) {
  const executablePath = getExecutablePath(ffmpegPath);
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
  await runFfmpeg(executablePath, args);
  const data = await fs.promises.readFile(output);
  try {
    await fs.promises.unlink(output);
  } catch {
    void 0;
  }
  return { data, filename };
}

export async function generateAudioBinary(payload: GenerateAudioPayload) {
  const executablePath = getExecutablePath(ffmpegPath);
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
  await runFfmpeg(executablePath, args);
  const data = await fs.promises.readFile(output);
  try {
    await fs.promises.unlink(output);
  } catch {
    void 0;
  }
  return { data, filename };
}
