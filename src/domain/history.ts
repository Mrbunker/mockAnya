import { Kind } from "../constants";

export type HistoryItem = {
  id: string;
  time: number;
  kind: Kind;
  format: string;
  filename: string;
  path?: string;
};

export function kindToZh(kind: HistoryItem["kind"]): string {
  if (kind === "image") return "图片";
  if (kind === "text") return "文本";
  if (kind === "video") return "视频";
  if (kind === "audio") return "音频";
  return String(kind);
}
