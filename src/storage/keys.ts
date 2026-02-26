export const STORAGE_KEYS = {
  activeView: "activeView",
  defaultSaveDir: "defaultSaveDir",
  defaultFilename: "defaultFilename",
  genHistory: "genHistory",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
