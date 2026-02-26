import { atomWithStorage } from "jotai/utils";
import { STORAGE_KEYS } from "../storage/keys";

export const defaultSaveDirAtom = atomWithStorage<string>(
  STORAGE_KEYS.defaultSaveDir,
  ""
);

export const defaultFilenameAtom = atomWithStorage<string>(
  STORAGE_KEYS.defaultFilename,
  __APP_NAME__
);
