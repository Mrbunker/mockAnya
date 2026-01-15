import { useMemo, useState } from "react";
import {
  Button,
  Select,
  Input,
  InputNumber,
  Progress,
  Modal,
  Typography,
} from "@douyinfe/semi-ui";
import { generateText } from "../services/generate";
import { saveBlob, openInFolder } from "../services/save";

export default function TextGenerator() {
  const [format, setFormat] = useState<"txt" | "json">("txt");
  const [repeatText, setRepeatText] = useState("hello");
  const [targetMB, setTargetMB] = useState(1);
  const [progress, setProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultPath, setResultPath] = useState<string | undefined>(undefined);
  const [resultOk, setResultOk] = useState<boolean | undefined>(undefined);
  const [resultMsg, setResultMsg] = useState<string | undefined>(undefined);
  const filename = useMemo(
    () => `text_${targetMB}MB.${format}`,
    [targetMB, format]
  );

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const { blob } = await generateText({
      format,
      repeatText,
      targetMB,
      onProgress: setProgress,
    });
    try {
      const res = (await saveBlob(blob, filename)) as any;
      setResultOk(!!res?.ok);
      setResultPath(res?.path);
      setResultMsg(res?.message);
      setDialogOpen(true);
      setProgress(res?.ok ? 100 : 0);
    } catch (e: any) {
      setResultOk(false);
      setResultMsg(String(e?.message ?? e));
      setDialogOpen(true);
      setProgress(0);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 max-w-md">
        <div className="grid gap-1">
          <Typography.Text>格式</Typography.Text>
          <Select
            value={format}
            onChange={(v) => setFormat(v as "txt" | "json")}
          >
            <Select.Option value="txt">TXT</Select.Option>
            <Select.Option value="json">JSON</Select.Option>
          </Select>
        </div>
        <div className="grid gap-1">
          <Typography.Text>重复内容</Typography.Text>
          <Input
            value={repeatText}
            onChange={(v) => setRepeatText(String(v))}
          />
        </div>
        <div className="grid gap-1">
          <Typography.Text>目标大小(MB)</Typography.Text>
          <InputNumber
            min={1}
            max={1024}
            value={targetMB}
            onChange={(v) => setTargetMB(Number(v) || 0)}
          />
        </div>
        <div className="mt-6 space-y-2">
          <Button onClick={generate} theme="solid" type="primary">
            生成并保存
          </Button>
          {progress > 0 && progress < 100 && <Progress percent={progress} />}
        </div>
      </div>
      <Modal
        visible={dialogOpen}
        title={
          resultOk
            ? "保存成功"
            : resultMsg === "canceled"
            ? "已取消"
            : "保存失败"
        }
        onCancel={() => setDialogOpen(false)}
        footer={
          <>
            {resultPath && (
              <Button
                onClick={async () => {
                  await openInFolder(resultPath!);
                  setDialogOpen(false);
                }}
              >
                打开目录
              </Button>
            )}
            <Button theme="borderless" onClick={() => setDialogOpen(false)}>
              关闭
            </Button>
          </>
        }
      >
        {resultOk ? resultPath || "" : resultMsg || ""}
      </Modal>
    </div>
  );
}
