import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Button, Divider, Form, Progress } from "@douyinfe/semi-ui";
import { FormApi } from "@douyinfe/semi-ui/lib/es/form";
import { generateAudio } from "../services/generate";
import { Kind } from "../constants";
import { addHistoryAtom } from "../state/historyAtoms";
import { defaultSaveDirAtom } from "../state/settingsAtoms";
import CommonSaveFields from "../components/CommonSaveFields";
import { runGenerateSaveFlow } from "../services/generatorFlow";

export default function AudioGenerator() {
  const formApiRef = useRef<FormApi>();
  const [progress, setProgress] = useState(0);
  const defaultSaveDir = useAtomValue(defaultSaveDirAtom);
  const addHistory = useSetAtom(addHistoryAtom);

  async function generate() {
    const values = (formApiRef.current?.getValues() ?? {}) as {
      format: "wav" | "mp3";
      duration: number;
      customName?: string;
      customDir?: string;
    };
    await runGenerateSaveFlow({
      kind: Kind.audio,
      format: values.format,
      customName: values.customName,
      customDir: values.customDir,
      defaultDir: defaultSaveDir,
      setProgress,
      addHistory,
      generate: () =>
        generateAudio({
          format: values.format,
          duration: values.duration,
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
          format: "wav",
          duration: 5,
          customName: "",
          customDir: "",
        }}
      >
        {() => (
          <>
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
                { label: "MP3", value: "mp3" },
                { label: "WAV", value: "wav" },
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
