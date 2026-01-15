import { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { Button, Divider, Form, Progress, Toast } from "@douyinfe/semi-ui";
import { generateImage } from "../services/generate";
import { saveBlob, getDefaultFilename } from "../services/save";
import { Kind } from "../constants";
import { addHistory, refreshHistoryAtom } from "../services/history";
import CommonSaveFields from "../components/CommonSaveFields";

export default function ImageGenerator() {
  type FormApiLike = { getValues: () => Record<string, unknown> };
  const formApiRef = useRef<FormApiLike | null>(null);
  const [progress, setProgress] = useState(0);
  // 使用 Toast 进行反馈，不再使用弹窗
  const refreshHistory = useSetAtom(refreshHistoryAtom);

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const values = (formApiRef.current?.getValues() ?? {}) as {
      format: "png" | "jpeg";
      width: number;
      height: number;
      bgMode: "black" | "solid" | "checker";
      color: string;
      customName?: string;
      customDir?: string;
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
      const nameInput = (values.customName || "").trim();
      const ext = values.format;
      const suggested =
        nameInput.length > 0
          ? nameInput.toLowerCase().endsWith(`.${ext}`)
            ? nameInput
            : `${nameInput}.${ext}`
          : filename;
      const res = (await saveBlob(
        blob,
        suggested,
        values.customDir || undefined
      )) as SaveResult;
      if (res?.ok) {
        setProgress(100);
        Toast.success("保存成功");
        addHistory({
          kind: Kind.image,
          format: values.format,
          filename: suggested,
          path: res.path,
        });
        refreshHistory();
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
          format: "png",
          width: 640,
          height: 360,
          bgMode: "black",
          color: "#000000",
          customName: getDefaultFilename(),
          customDir: "",
        }}
      >
        {({ formState }) => (
          <>
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
              type="button"
              options={[
                { label: "纯黑", value: "black" },
                { label: "纯色", value: "solid" },
                { label: "棋盘格", value: "checker" },
              ]}
            />
            {formState.values?.bgMode === "solid" ? (
              <Form.Input field="color" label="颜色" type="color" />
            ) : null}
            <Divider />

            <CommonSaveFields
              formatOptions={[
                { label: "PNG", value: "png" },
                { label: "JPEG", value: "jpeg" },
              ]}
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
