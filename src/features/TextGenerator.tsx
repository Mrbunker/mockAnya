import { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { Button, Divider, Form, Progress, Toast } from "@douyinfe/semi-ui";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { generateText } from "../services/generate";
import { saveBlob, getDefaultFilename } from "../services/save";
import { addHistory, refreshHistoryAtom } from "../services/history";
import { Kind } from "../constants";
import CommonSaveFields from "../components/CommonSaveFields";

export default function TextGenerator() {
  const formApiRef = useRef<FormApi | null>(null);
  const [progress, setProgress] = useState(0);
  const refreshHistory = useSetAtom(refreshHistoryAtom);

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const values = formApiRef.current?.getValues();
    const unit = (values?.fileSizeUnit as string) || "MB";
    const size = values?.fileSizeValue as number | undefined;
    const fileSize =
      typeof size === "number" && size > 0
        ? size * (unit === "MB" ? 1024 * 1024 : 1024)
        : undefined;
    const { blob, filename } = await generateText({
      format: values.format,
      repeatText: values.repeatText,
      totalBytes: fileSize,
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
          kind: Kind.text,
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

  const initValues = {
    format: "txt",
    repeatText: "",
    fileSizeUnit: "KB",
    fileSizeValue: undefined,
    customName: getDefaultFilename(),
    customDir: "",
  };
  return (
    <div className="">
      <Form
        getFormApi={(api) => (formApiRef.current = api)}
        className="max-w-md"
        labelPosition="left"
        labelWidth={75}
        initValues={initValues}
      >
        {() => (
          <>
            <Form.InputGroup label={{ text: "目标大小" }} className="w-full">
              <Form.InputNumber
                field="fileSizeValue"
                noLabel
                placeholder="请输入目标大小"
                min={1}
                max={1024}
                innerButtons
                className="w-[150px]"
              />
              <Form.Select
                noLabel
                field="fileSizeUnit"
                optionList={[
                  { label: "MB", value: "MB" },
                  { label: "KB", value: "KB" },
                ]}
                className="w-[80px]"
              />
            </Form.InputGroup>
            <Form.Input
              className="w-full"
              field="repeatText"
              label="文本内容"
              placeholder="文本内容将被写入到文件中"
            />

            <Divider />
            <CommonSaveFields
              formatOptions={[
                { label: "TXT", value: "txt" },
                { label: "JSON", value: "json" },
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
