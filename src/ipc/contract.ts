import type { Result } from "../lib/result";

export const IPC_INVOKE = {
  saveFile: "save-file",
  openInFolder: "open-in-folder",
  openFile: "open-file",
  chooseSaveDir: "choose-save-dir",
  fileExists: "file-exists",
  generateVideo: "generate-video",
  generateAudio: "generate-audio",
} as const;

export const IPC_EVENT = {
  mainProcessMessage: "main-process-message",
} as const;

export const IPC_INVOKE_WHITELIST = [
  IPC_INVOKE.saveFile,
  IPC_INVOKE.openInFolder,
  IPC_INVOKE.openFile,
  IPC_INVOKE.chooseSaveDir,
  IPC_INVOKE.fileExists,
  IPC_INVOKE.generateVideo,
  IPC_INVOKE.generateAudio,
] as const;

export const IPC_EVENT_WHITELIST = [IPC_EVENT.mainProcessMessage] as const;

export type IpcInvokeChannel = (typeof IPC_INVOKE_WHITELIST)[number];
export type IpcEventChannel = (typeof IPC_EVENT_WHITELIST)[number];

export type SaveFilePayload = {
  data: Uint8Array;
  suggestedName?: string;
  defaultDir?: string;
};

export type SaveFileResult = Result<{ path?: string }>;

export type OpenInFolderPayload = { filePath: string };
export type OpenInFolderResult = Result<Record<string, never>>;

export type OpenFilePayload = { filePath: string };
export type OpenFileResult = Result<Record<string, never>>;

export type ChooseSaveDirResult = Result<{ dir: string }>;

export type FileExistsPayload = { filePath: string };
export type FileExistsResult = Result<{ exists: boolean }>;

export type GenerateVideoPayload = {
  format: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
};
export type GenerateVideoResult = Result<{
  data: Uint8Array;
  filename: string;
}>;

export type GenerateAudioPayload = { duration: number; format?: string };
export type GenerateAudioResult = Result<{
  data: Uint8Array;
  filename: string;
}>;

export type IpcInvokeMap = {
  [IPC_INVOKE.saveFile]: { req: SaveFilePayload; res: SaveFileResult };
  [IPC_INVOKE.openInFolder]: {
    req: OpenInFolderPayload;
    res: OpenInFolderResult;
  };
  [IPC_INVOKE.openFile]: { req: OpenFilePayload; res: OpenFileResult };
  [IPC_INVOKE.chooseSaveDir]: { req: void; res: ChooseSaveDirResult };
  [IPC_INVOKE.fileExists]: { req: FileExistsPayload; res: FileExistsResult };
  [IPC_INVOKE.generateVideo]: {
    req: GenerateVideoPayload;
    res: GenerateVideoResult;
  };
  [IPC_INVOKE.generateAudio]: {
    req: GenerateAudioPayload;
    res: GenerateAudioResult;
  };
};

export type IpcInvokeArgs<C extends IpcInvokeChannel> =
  IpcInvokeMap[C]["req"] extends void ? [] : [IpcInvokeMap[C]["req"]];

export type IpcInvokeRes<C extends IpcInvokeChannel> = IpcInvokeMap[C]["res"];

export type IpcEventMap = {
  [IPC_EVENT.mainProcessMessage]: [message: string];
};

export type IpcEventArgs<C extends IpcEventChannel> = IpcEventMap[C];

export type IpcRendererBridge = {
  on<C extends IpcEventChannel>(
    channel: C,
    listener: (
      event: import("electron").IpcRendererEvent,
      ...args: IpcEventArgs<C>
    ) => void,
  ): void;
  off<C extends IpcEventChannel>(
    channel: C,
    listener: (
      event: import("electron").IpcRendererEvent,
      ...args: IpcEventArgs<C>
    ) => void,
  ): void;
  invoke<C extends IpcInvokeChannel>(
    channel: C,
    ...args: IpcInvokeArgs<C>
  ): Promise<IpcInvokeRes<C>>;
  send(channel: string, ...args: unknown[]): void;
};
