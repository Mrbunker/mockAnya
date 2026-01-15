import { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { Button, Divider, Form, Progress, Toast } from "@douyinfe/semi-ui";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { generateVideo } from "../services/generate";
import { saveBlob, getDefaultFilename } from "../services/save";
import { Kind } from "../constants";
import { addHistory, refreshHistoryAtom } from "../services/history";
import CommonSaveFields from "../components/CommonSaveFields";

export default function VideoGenerator() {
  const formApiRef = useRef<FormApi>();
  const [progress, setProgress] = useState(0);
  const refreshHistory = useSetAtom(refreshHistoryAtom);

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const values = (formApiRef.current?.getValues() ?? {}) as {
      format: "mp4" | "webm" | "mov" | "mkv";
      width: number;
      height: number;
      fps: number;
      duration: number;
      customName?: string;
      customDir?: string;
    };
    const { blob, filename } = await generateVideo({
      format: values.format,
      width: values.width,
      height: values.height,
      fps: values.fps,
      duration: values.duration,
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
          kind: Kind.video,
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
        getFormApi={(api) => (formApiRef.current = api)}
        className="max-w-md"
        labelPosition="left"
        labelWidth={75}
        initValues={{
          format: "mp4",
          width: 640,
          height: 360,
          fps: 30,
          duration: 5,
          customName: getDefaultFilename(),
          customDir: "",
        }}
      >
        {() => {
          return (
            <>
              <Form.InputGroup label={{ text: "分辨率" }} className="w-full">
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
                  innerButtons
                  field="height"
                  prefix="高"
                  rules={[{ validator: (_r, v) => v > 0, message: "高度错误" }]}
                  min={16}
                  max={4096}
                />
              </Form.InputGroup>
              <Form.RadioGroup
                field="fps"
                label="帧数"
                type="button"
                options={[
                  { label: "24", value: 24 },
                  { label: "30", value: 30 },
                  { label: "60", value: 60 },
                  { label: "120", value: 120 },
                ]}
              />
              <Form.InputNumber
                className="w-[120px]"
                innerButtons
                field="duration"
                label="时长"
                suffix="秒"
                min={1}
                max={3600}
              />
              <Divider />
              <CommonSaveFields
                formatOptions={[
                  { label: "MP4", value: "mp4" },
                  { label: "WEBM", value: "webm" },
                  { label: "MOV", value: "mov" },
                  { label: "MKV", value: "mkv" },
                ]}
              />
            </>
          );
        }}
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
