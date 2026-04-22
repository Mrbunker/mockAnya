import { atomWithStorage } from "jotai/utils";
import { STORAGE_KEYS } from "../storage/keys";

export const defaultSaveDirAtom = atomWithStorage<string>(
  STORAGE_KEYS.defaultSaveDir,
  ""
);
