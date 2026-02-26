import { atom } from "jotai";
import { HistoryItem } from "../domain/history";
import {
  addHistory,
  clearHistory,
  listHistory,
  removeHistory,
} from "../storage/historyStorage";

export const historyAtom = atom<HistoryItem[]>(listHistory());

export const refreshHistoryAtom = atom(null, (_get, set) => {
  set(historyAtom, listHistory());
});

export const addHistoryAtom = atom(
  null,
  (_get, set, item: Omit<HistoryItem, "id" | "time"> & { time?: number }) => {
    addHistory(item);
    set(historyAtom, listHistory());
  },
);

export const clearHistoryAtom = atom(null, (_get, set) => {
  clearHistory();
  set(historyAtom, []);
});

export const removeHistoryAtom = atom(null, (_get, set, id: string) => {
  removeHistory(id);
  set(historyAtom, listHistory());
});
