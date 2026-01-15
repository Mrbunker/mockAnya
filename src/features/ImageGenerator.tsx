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
import { generateImage } from "../services/generate";
import { saveBlob, openInFolder } from "../services/save";

export default function ImageGenerator() {
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(360);
  const [bgMode, setBgMode] = useState<"black" | "solid" | "checker">("black");
  const [color, setColor] = useState("#000000");
  const [progress, setProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resultPath, setResultPath] = useState<string | undefined>(undefined);
  const [resultOk, setResultOk] = useState<boolean | undefined>(undefined);
  const [resultMsg, setResultMsg] = useState<string | undefined>(undefined);
  const filename = useMemo(
    () => `image_${width}x${height}.${format}`,
    [width, height, format]
  );

  async function generate() {
    setProgress(0);
    await new Promise((r) => setTimeout(r));
    const { blob } = await generateImage({
      format,
      width,
      height,
      bgMode,
      color,
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
            onChange={(v) => setFormat(v as "png" | "jpeg")}
          >
            <Select.Option value="png">PNG</Select.Option>
            <Select.Option value="jpeg">JPEG</Select.Option>
          </Select>
        </div>
        <div className="grid gap-1">
          <Typography.Text>宽度</Typography.Text>
          <InputNumber
            min={16}
            max={4096}
            value={width}
            onChange={(v) => setWidth(Number(v) || 0)}
          />
        </div>
        <div className="grid gap-1">
          <Typography.Text>高度</Typography.Text>
          <InputNumber
            min={16}
            max={4096}
            value={height}
            onChange={(v) => setHeight(Number(v) || 0)}
          />
        </div>
        <div className="grid gap-1">
          <Typography.Text>背景</Typography.Text>
          <Select
            value={bgMode}
            onChange={(v) => setBgMode(v as "black" | "solid" | "checker")}
          >
            <Select.Option value="black">纯黑</Select.Option>
            <Select.Option value="solid">纯色</Select.Option>
            <Select.Option value="checker">棋盘格</Select.Option>
          </Select>
        </div>
        {bgMode === "solid" && (
          <div className="grid gap-1">
            <Typography.Text>颜色</Typography.Text>
            <Input
              type="color"
              value={color}
              onChange={(value) => setColor(String(value))}
            />
          </div>
        )}
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
