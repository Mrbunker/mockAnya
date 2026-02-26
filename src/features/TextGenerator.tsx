import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button, Divider, Form, Progress } from "@douyinfe/semi-ui";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { generateText } from "../services/generate";
import { Kind } from "../constants";
import { addHistoryAtom } from "../state/historyAtoms";
import {
  defaultFilenameAtom,
  defaultSaveDirAtom,
} from "../state/settingsAtoms";
import CommonSaveFields from "../components/CommonSaveFields";
import { runGenerateSaveFlow } from "../services/generatorFlow";

export default function TextGenerator() {
  const formApiRef = useRef<FormApi | null>(null);
  const [progress, setProgress] = useState(0);
  const defaultFilename = useAtomValue(defaultFilenameAtom);
  const defaultSaveDir = useAtomValue(defaultSaveDirAtom);
  const addHistory = useSetAtom(addHistoryAtom);

  async function generate() {
    const values = formApiRef.current?.getValues();
    const unit = (values?.fileSizeUnit as string) || "MB";
    const size = values?.fileSizeValue as number | undefined;
    const fileSize =
      typeof size === "number" && size > 0
        ? size * (unit === "MB" ? 1000 * 1000 : 1000)
        : undefined;
    const rawFormat = String(values?.format || "txt");
    const format =
      rawFormat === "json" || rawFormat === "csv" || rawFormat === "pdf"
        ? rawFormat
        : "txt";
    await runGenerateSaveFlow({
      kind: Kind.text,
      format,
      customName: values?.customName,
      customDir: values?.customDir,
      defaultDir: defaultSaveDir,
      setProgress,
      addHistory,
      generate: () =>
        generateText({
          format,
          repeatText: String(values?.repeatText ?? ""),
          totalBytes: fileSize,
          onProgress: setProgress,
        }),
    });
  }

  const initValues = {
    format: "txt",
    repeatText: "",
    fileSizeUnit: "KB",
    fileSizeValue: 0,
    customName: defaultFilename,
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
                min={0}
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
                { label: "CSV", value: "csv" },
                { label: "PDF", value: "pdf" },
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
