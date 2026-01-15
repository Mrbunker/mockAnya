export async function saveBlob(
  blob: Blob,
  suggestedName: string,
  overrideDir?: string
) {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  if (window.ipcRenderer?.invoke) {
    const defaultDir =
      overrideDir || localStorage.getItem("defaultSaveDir") || undefined;
    const res = await window.ipcRenderer.invoke("save-file", {
      data,
      suggestedName,
      defaultDir,
    });
    return res;
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  }
}

export async function openInFolder(filePath: string) {
  if (window.ipcRenderer?.invoke) {
    const res = await window.ipcRenderer.invoke("open-in-folder", { filePath });
    return res;
  }
  return { ok: false, message: "unavailable" };
}

export async function openFile(filePath: string) {
  if (window.ipcRenderer?.invoke) {
    const res = await window.ipcRenderer.invoke("open-file", { filePath });
    return res;
  }
  return { ok: false, message: "unavailable" };
}

export async function chooseDefaultSaveDir() {
  if (window.ipcRenderer?.invoke) {
    const res = await window.ipcRenderer.invoke("choose-save-dir");
    return res;
  }
  return { ok: false, message: "unavailable" };
}

export function getDefaultSaveDir(): string | null {
  return localStorage.getItem("defaultSaveDir");
}

export async function fileExists(filePath: string) {
  if (window.ipcRenderer?.invoke) {
    const res = await window.ipcRenderer.invoke("file-exists", { filePath });
    return res;
  }
  return { ok: false, message: "unavailable" };
}

export function getDefaultFilename(): string | null {
  return localStorage.getItem("defaultFilename");
}
