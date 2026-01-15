import {
  SideSheet,
  Button,
  Toast,
  Form,
  useFormState,
  useFormApi,
} from "@douyinfe/semi-ui";
import {
  chooseDefaultSaveDir,
  getDefaultSaveDir,
  openInFolder,
} from "../services/save";
import { fileExists } from "../services/save";
import { useDebounceFn } from "ahooks";

type Props = {
  visible: boolean;
  onCancel: () => void;
};

type FormState = {
  defaultDir: string;
  defaultFilename: string;
};

export default function SettingsPanel({ visible, onCancel }: Props) {
  const initValues = {
    defaultDir: getDefaultSaveDir() ?? "",
    defaultFilename: localStorage.getItem("defaultFilename") ?? "",
  };

  return (
    <SideSheet visible={visible} onCancel={onCancel} title="设置">
      <Form<FormState> initValues={initValues}>
        <FormRender />
      </Form>
    </SideSheet>
  );
}

const FormRender = () => {
  const { run: handleDirSubmit } = useDebounceFn(
    (values: { defaultDir: string }) => {
      const dir = values.defaultDir?.trim();
      if (!dir) return;
      localStorage.setItem("defaultSaveDir", dir);
    },
    { wait: 700 }
  );
  const { run: handleNameSubmit } = useDebounceFn(
    (values: { defaultFilename: string }) => {
      const name = values.defaultFilename?.trim();
      localStorage.setItem("defaultFilename", name || "");
    },
    { wait: 700 }
  );

  const formValues = useFormState<FormState>();
  const formApi = useFormApi<FormState>();
  const defaultDir = formValues.values?.defaultDir;

  return (
    <>
      <Form.Input
        label="默认保存路径"
        field="defaultDir"
        placeholder="请输入默认保存路径"
        onChange={(value) => handleDirSubmit({ defaultDir: value })}
      />
      <div className="flex gap-2">
        <Button
          theme="solid"
          type="primary"
          onClick={async () => {
            const res = await chooseDefaultSaveDir();
            if (res?.ok) {
              handleDirSubmit({ defaultDir: String(res.dir) });
              formApi.setValue("defaultDir", String(res.dir));
            } else {
              Toast.info(String(res?.message || "已取消"));
            }
          }}
        >
          选择路径
        </Button>
        {defaultDir && (
          <Button
            type="tertiary"
            onClick={async () => {
              const exists = await fileExists(defaultDir!);
              if (!exists?.ok) {
                Toast.error(String(exists?.message || "打开目录失败"));
                return;
              }
              if (!exists.exists) {
                Toast.error("目录不存在");
                return;
              }
              const res = await openInFolder(defaultDir!);
              if (!res?.ok) {
                Toast.error(String(res?.message || "打开目录失败"));
              }
            }}
          >
            打开目录
          </Button>
        )}
      </div>
      <Form.Input
        className="mt-4"
        label="默认文件名"
        field="defaultFilename"
        placeholder="默认用于生成文件名（不含扩展名）"
        onChange={(value) => handleNameSubmit({ defaultFilename: value })}
      />
    </>
  );
};
