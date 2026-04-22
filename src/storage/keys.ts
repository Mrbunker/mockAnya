export const STORAGE_KEYS = {
  activeView: "activeView",
  defaultSaveDir: "defaultSaveDir",
  genHistory: "genHistory",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
