import { useRef, useState } from "react";
import { Button, Form, Progress, Modal } from "@douyinfe/semi-ui";
import { generateText } from "../services/generate";
import { saveBlob, openInFolder } from "../services/save";

export default function TextGenerator() {
  type FormApiLike = { getValues: () => Record<string, unknown> };
  const formApiRef = useRef<FormApiLike | null>(null);
  const [progress, setProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultPath, setResultPath] = useState<string | undefined>(undefined);
  const [resultOk, setResultOk] = useState<boolean | undefined>(undefined);
  const [resultMsg, setResultMsg] = useState<string | undefined>(undefined);

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const values = (formApiRef.current?.getValues() ?? {}) as {
      format: "txt" | "json";
      repeatText: string;
      targetMB: number;
    };
    const { blob, filename } = await generateText({
      format: values.format,
      repeatText: values.repeatText,
      targetMB: values.targetMB,
      onProgress: setProgress,
    });
    try {
      type SaveResult = { ok?: boolean; path?: string; message?: string };
      const res = (await saveBlob(blob, filename)) as SaveResult;
      setResultOk(!!res?.ok);
      setResultPath(res?.path);
      setResultMsg(res?.message);
      setDialogOpen(true);
      setProgress(res?.ok ? 100 : 0);
    } catch (e: unknown) {
      setResultOk(false);
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      setResultMsg(msg);
      setDialogOpen(true);
      setProgress(0);
    }
  }

  return (
    <div className="">
      <Form
        getFormApi={(api) =>
          (formApiRef.current = api as unknown as FormApiLike)
        }
        className="max-w-md"
        labelPosition="left"
        labelWidth={75}
        initValues={{
          format: "txt",
          repeatText: "hello",
          targetMB: 1,
        }}
      >
        <Form.RadioGroup
          field="format"
          label="格式"
          type="button"
          options={[
            { label: "TXT", value: "txt" },
            { label: "JSON", value: "json" },
          ]}
        />
        <Form.Input
          className="w-full"
          field="repeatText"
          label="文本内容"
          placeholder="文本内容将被重复插入"
        />
        <Form.InputNumber
          className="w-full"
          field="targetMB"
          label="目标大小"
          addonAfter="单位 MB"
          min={1}
          max={1024}
        />
      </Form>
      <div className="mt-6 space-y-2">
        <Button onClick={generate} theme="solid" type="primary">
          生成并保存
        </Button>
        {progress > 0 && progress < 100 && <Progress percent={progress} />}
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
