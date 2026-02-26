import { ipcClient } from "../ipc/client";
import { IPC_INVOKE } from "../ipc/contract";
import { ok, type Result } from "../lib/result";

const sanitize = (name: string) =>
  (name || "output").replace(/[/\\:*?"<>|]/g, "-").trim() || "output";

export async function saveBlob(
  blob: Blob,
  suggestedName: string,
  defaultDir?: string
): Promise<Result<{ path?: string }>> {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  if (ipcClient.isAvailable()) {
    const res = await ipcClient.invoke(IPC_INVOKE.saveFile, {
      data,
      suggestedName: sanitize(suggestedName),
      defaultDir,
    });
    return res;
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = sanitize(suggestedName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return ok({ path: undefined });
  }
}

export async function openInFolder(filePath: string) {
  return ipcClient.invoke(IPC_INVOKE.openInFolder, { filePath });
}

export async function openFile(filePath: string) {
  return ipcClient.invoke(IPC_INVOKE.openFile, { filePath });
}

export async function chooseDefaultSaveDir() {
  return ipcClient.invoke(IPC_INVOKE.chooseSaveDir);
}

export async function fileExists(filePath: string) {
  return ipcClient.invoke(IPC_INVOKE.fileExists, { filePath });
}
