import { Toast } from "@douyinfe/semi-ui";
import { Kind } from "../constants";
import { HistoryItem } from "../domain/history";
import { buildSuggestedFilename } from "../lib/filename";
import {
  getErrorDisplayMessage,
  getErrorMessageFromUnknown,
  isCanceledResult,
  type Result,
} from "../lib/result";
import { saveBlob } from "./save";

export async function runGenerateSaveFlow(opts: {
  kind: Kind;
  format: string;
  customName?: string;
  customDir?: string;
  defaultDir?: string;
  setProgress: (value: number) => void;
  addHistory: (
    item: Omit<HistoryItem, "id" | "time"> & { time?: number },
  ) => void;
  generate: () => Promise<Result<{ blob: Blob; filename: string }>>;
}) {
  opts.setProgress(0);
  await new Promise((r) => setTimeout(r));
  try {
    const generated = await opts.generate();
    if (!generated.ok) {
      opts.setProgress(0);
      if (isCanceledResult(generated)) Toast.info("已取消");
      else Toast.error(getErrorDisplayMessage(generated.error, "生成失败"));
      return;
    }
    const { blob, filename } = generated.data;
    const suggested = buildSuggestedFilename(
      opts.customName,
      opts.format,
      filename,
    );
    const dir = String(opts.customDir || "").trim() || opts.defaultDir || "";
    const saved = await saveBlob(blob, suggested, dir ? dir : undefined);
    if (saved.ok) {
      opts.setProgress(100);
      Toast.success("保存成功");
      opts.addHistory({
        kind: opts.kind,
        format: opts.format,
        filename: suggested,
        path: saved.data.path,
      });
    } else {
      opts.setProgress(0);
      if (isCanceledResult(saved)) Toast.info("已取消");
      else Toast.error(getErrorDisplayMessage(saved.error, "保存失败"));
    }
  } catch (e: unknown) {
    opts.setProgress(0);
    Toast.error(getErrorMessageFromUnknown(e));
  }
}
