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
import { useDebounceFn } from "ahooks";

type Props = {
  visible: boolean;
  onCancel: () => void;
};

type FormState = {
  defaultDir: string;
};

export default function SettingsPanel({ visible, onCancel }: Props) {
  const initValues = { defaultDir: getDefaultSaveDir() ?? "" };

  return (
    <SideSheet visible={visible} onCancel={onCancel} title="设置">
      <Form<FormState> initValues={initValues}>
        <FormRender />
      </Form>
    </SideSheet>
  );
}

const FormRender = () => {
  const { run: handleSubmit } = useDebounceFn(
    (values: { defaultDir: string }) => {
      if (!values.defaultDir) {
        return;
      }
      localStorage.setItem("defaultSaveDir", values.defaultDir);
      Toast.success("已更新默认保存路径");
    },
    { wait: 300 }
  );

  const formValues = useFormState<FormState>();
  const formApi = useFormApi<FormState>();
  const defaultDir = formValues.values?.defaultDir;

  return (
    <>
      <Form.Input
        noLabel
        field="defaultDir"
        placeholder="请输入默认保存路径"
        onChange={(value) => handleSubmit({ defaultDir: value })}
      />
      <div className="flex gap-2">
        <Button
          theme="solid"
          type="primary"
          onClick={async () => {
            const res = await chooseDefaultSaveDir();
            if (res?.ok) {
              handleSubmit({ defaultDir: String(res.dir) });
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
              await openInFolder(defaultDir!);
            }}
          >
            打开目录
          </Button>
        )}
      </div>
    </>
  );
};
