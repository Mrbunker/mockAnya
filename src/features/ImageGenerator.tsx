import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button, Divider, Form, Progress } from "@douyinfe/semi-ui";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { generateImage } from "../services/generate";
import { Kind } from "../constants";
import { addHistoryAtom } from "../state/historyAtoms";
import {
  defaultFilenameAtom,
  defaultSaveDirAtom,
} from "../state/settingsAtoms";
import CommonSaveFields from "../components/CommonSaveFields";
import { runGenerateSaveFlow } from "../services/generatorFlow";

export default function ImageGenerator() {
  const formApiRef = useRef<FormApi>();
  const [progress, setProgress] = useState(0);
  const defaultFilename = useAtomValue(defaultFilenameAtom);
  const defaultSaveDir = useAtomValue(defaultSaveDirAtom);
  const addHistory = useSetAtom(addHistoryAtom);

  async function generate() {
    const values = (formApiRef.current?.getValues() ?? {}) as {
      format: "png" | "jpeg";
      width: number;
      height: number;
      bgMode: "black" | "solid" | "checker";
      color: string;
      customName?: string;
      customDir?: string;
    };
    await runGenerateSaveFlow({
      kind: Kind.image,
      format: values.format,
      customName: values.customName,
      customDir: values.customDir,
      defaultDir: defaultSaveDir,
      setProgress,
      addHistory,
      generate: () =>
        generateImage({
          format: values.format,
          width: values.width,
          height: values.height,
          bgMode: values.bgMode,
          color: values.color,
          onProgress: setProgress,
        }),
    });
  }

  return (
    <div className="">
      <Form
        getFormApi={(api) => (formApiRef.current = api)}
        className="max-w-md"
        labelPosition="left"
        labelWidth={75}
        initValues={{
          format: "png",
          width: 640,
          height: 360,
          bgMode: "black",
          color: "#000000",
          customName: defaultFilename,
          customDir: "",
        }}
      >
        {({ formState }) => (
          <>
            <Form.InputGroup label={{ text: "图片尺寸" }} className="w-full">
              <Form.InputNumber
                className="w-[125px]"
                innerButtons
                field="width"
                prefix="宽"
                rules={[{ validator: (_r, v) => v > 0, message: "宽度错误" }]}
                min={16}
                max={4096}
              />
              <Form.InputNumber
                className="w-[125px]"
                // className="w-full"
                innerButtons
                field="height"
                prefix="高"
                rules={[{ validator: (_r, v) => v > 0, message: "高度错误" }]}
                min={16}
                max={4096}
              />
            </Form.InputGroup>
            {/* <Form.InputNumber
              className="w-full"
              innerButtons
              field="width"
              label="宽度"
              rules={[{ validator: (_r, v) => v > 0, message: "宽度错误" }]}
              min={16}
              max={4096}
            />
            <Form.InputNumber
              className="w-full"
              innerButtons
              field="height"
              label="高度"
              rules={[{ validator: (_r, v) => v > 0, message: "高度错误" }]}
              min={16}
              max={4096}
            /> */}
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
