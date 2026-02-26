import { STORAGE_KEYS } from "./keys";
import { HistoryItem } from "../domain/history";

function read(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.genHistory);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function write(list: HistoryItem[]) {
  localStorage.setItem(STORAGE_KEYS.genHistory, JSON.stringify(list));
}

export function addHistory(
  item: Omit<HistoryItem, "id" | "time"> & { time?: number },
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
