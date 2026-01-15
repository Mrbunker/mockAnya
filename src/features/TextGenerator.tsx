import { useRef, useState } from "react";
import { Button, Divider, Form, Progress, Toast } from "@douyinfe/semi-ui";
import { generateText } from "../services/generate";
import { saveBlob } from "../services/save";
import { addHistory } from "../services/history";
import { Kind } from "../constants";
import { nowString } from "../lib/utils";

export default function TextGenerator() {
  type FormApiLike = { getValues: () => Record<string, unknown> };
  const formApiRef = useRef<FormApiLike | null>(null);
  const [progress, setProgress] = useState(0);
  // 使用 Toast 进行反馈，不再使用弹窗

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const values = (formApiRef.current?.getValues() ?? {}) as {
      format: "txt" | "json";
      repeatText: string;
      targetMB: number;
      customName?: string;
    };
    const { blob, filename } = await generateText({
      format: values.format,
      repeatText: values.repeatText,
      targetMB: values.targetMB,
      onProgress: setProgress,
    });
    try {
      type SaveResult = { ok?: boolean; path?: string; message?: string };
      const nameInput = (values.customName || "").trim();
      const ext = values.format;
      const suggested =
        nameInput.length > 0
          ? nameInput.includes(".")
            ? nameInput
            : `${nameInput}.${ext}`
          : filename;
      const res = (await saveBlob(blob, suggested)) as SaveResult;
      if (res?.ok) {
        setProgress(100);
        Toast.success("保存成功");
        addHistory({
          kind: Kind.text,
          format: values.format,
          filename: suggested,
          path: res.path,
        });
      } else {
        setProgress(0);
        if (res?.message === "canceled") {
          Toast.info("已取消");
        } else {
          Toast.error(String(res?.message || "保存失败"));
        }
      }
    } catch (e: unknown) {
      setProgress(0);
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      Toast.error(msg);
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
          customName: nowString(),
        }}
      >
        {({ formState }) => (
          <>
            <Form.RadioGroup
              field="format"
              label="文件格式"
              type="button"
              options={[
                { label: "TXT", value: "txt" },
                { label: "JSON", value: "json" },
              ]}
            />
            <Form.Input
              className="w-full"
              field="customName"
              label="文件名"
              suffix={`.${formState.values?.format}`}
            />
            <Divider />

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
              suffix="单位 MB"
              min={1}
              max={1024}
            />
          </>
        )}
      </Form>
      <div className="mt-6 space-y-2">
        <Button onClick={generate} theme="solid" type="primary">
          生成并保存
        </Button>
        {progress > 0 && progress < 100 && <Progress percent={progress} />}
      </div>
    </div>
  );
}
