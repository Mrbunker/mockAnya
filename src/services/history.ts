import { atom } from "jotai";
import { Kind } from "../constants";

export type HistoryItem = {
  id: string;
  time: number;
  kind: Kind;
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
  if (kind === "video") return "视频";
  if (kind === "audio") return "音频";
  return String(kind);
}

export const historyAtom = atom<HistoryItem[]>(listHistory());
export const refreshHistoryAtom = atom(null, (_get, set) => {
  set(historyAtom, listHistory());
});
export const clearHistoryAtom = atom(null, (_get, set) => {
  clearHistory();
  set(historyAtom, listHistory());
});
export const removeHistoryAtom = atom(null, (_get, set, id: string) => {
  removeHistory(id);
  set(historyAtom, listHistory());
});
