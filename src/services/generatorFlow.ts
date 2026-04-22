import React from "react";
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
import { openFile, saveBlob } from "./save";

function buildOpenFileToastContent(filePath: string) {
  return React.createElement(
    "span",
    null,
    "保存成功",
    React.createElement(
      "span",
      {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          void (async () => {
            const res = await openFile(filePath);
            if (!res.ok) {
              Toast.error(getErrorDisplayMessage(res.error, "打开文件失败"));
            }
          })();
        },
        style: {
          marginLeft: 12,
          color: "var(--semi-color-primary)",
          cursor: "pointer",
          textDecoration: "underline",
        },
      },
      "打开",
    ),
  );
}

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
      if (saved.data.path) {
        Toast.success({
          content: buildOpenFileToastContent(saved.data.path),
        });
      } else {
        Toast.success("保存成功");
      }
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
