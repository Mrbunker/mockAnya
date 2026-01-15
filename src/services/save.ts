export async function saveBlob(blob: Blob, suggestedName: string) {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  if (window.ipcRenderer?.invoke) {
    const res = await window.ipcRenderer.invoke("save-file", {
      data,
      suggestedName,
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
