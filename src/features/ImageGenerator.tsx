import { useRef, useState } from "react";
import { Button, Form, Progress, Modal } from "@douyinfe/semi-ui";
import { generateImage } from "../services/generate";
import { saveBlob, openInFolder } from "../services/save";

export default function ImageGenerator() {
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
      format: "png" | "jpeg";
      width: number;
      height: number;
      bgMode: "black" | "solid" | "checker";
      color: string;
    };
    const { blob, filename } = await generateImage({
      format: values.format,
      width: values.width,
      height: values.height,
      bgMode: values.bgMode,
      color: values.color,
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
        labelWidth={50}
        initValues={{
          format: "png",
          width: 640,
          height: 360,
          bgMode: "black",
          color: "#000000",
        }}
      >
        {({ formState }) => (
          <>
            <Form.RadioGroup
              field="format"
              label="格式"
              type="button"
              options={[
                { label: "PNG", value: "png" },
                { label: "JPEG", value: "jpeg" },
              ]}
            />
            <Form.InputNumber
              className="w-full"
              field="width"
              label="宽度"
              min={16}
              max={4096}
            />
            <Form.InputNumber
              className="w-full"
              field="height"
              label="高度"
              min={16}
              max={4096}
            />
            <Form.RadioGroup
              field="bgMode"
              label="背景"
              options={[
                { label: "纯黑", value: "black" },
                { label: "纯色", value: "solid" },
                { label: "棋盘格", value: "checker" },
              ]}
            />
            {formState.values?.bgMode === "solid" ? (
              <Form.Input field="color" label="颜色" type="color" />
            ) : null}
          </>
        )}
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
