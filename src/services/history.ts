export type HistoryItem = {
  id: string;
  time: number;
  kind: "image" | "text";
  format: string;
  filename: string;
  path?: string;
};

const KEY = "genHistory";

function read(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function write(list: HistoryItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addHistory(
  item: Omit<HistoryItem, "id" | "time"> & { time?: number }
) {
  const list = read();
  const time = item.time ?? Date.now();
  const id = `${time}-${item.filename}`;
  const record: HistoryItem = { id, time, ...item };
  write([record, ...list].slice(0, 500));
  return record;
}

export function listHistory(): HistoryItem[] {
  return read().sort((a, b) => b.time - a.time);
}

export function clearHistory() {
  write([]);
}

export function removeHistory(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function kindToZh(kind: HistoryItem["kind"]): string {
  if (kind === "image") return "图片";
  if (kind === "text") return "文本";
  return String(kind);
}
