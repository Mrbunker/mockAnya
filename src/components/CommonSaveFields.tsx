import {
  Button,
  Form,
  Toast,
  useFormApi,
  useFormState,
} from "@douyinfe/semi-ui";
import { chooseDefaultSaveDir, getDefaultSaveDir } from "../services/save";

type FormatOption = { label: string; value: string };
type Props = { formatOptions: FormatOption[] };

export default function CommonSaveFields({ formatOptions }: Props) {
  const formState = useFormState<Record<string, unknown>>();
  const formApi = useFormApi<Record<string, unknown>>();
  const format = String(formState.values?.format || "");
  return (
    <>
      <Form.RadioGroup
        field="format"
        label="文件格式"
        type="button"
        options={formatOptions}
      />
      <Form.Input
        className="w-full"
        field="customName"
        label="文件名"
        placeholder="不含扩展名"
        suffix={format ? `.${format}` : undefined}
      />
      <Form.Input
        className="w-full"
        field="customDir"
        label="保存路径"
        suffix={
          <Button
            type="tertiary"
            onClick={async () => {
              const res = await chooseDefaultSaveDir();
              if (res?.ok) {
                formApi.setValue("customDir", String(res.dir));
              } else {
                Toast.info(String(res?.message || "已取消"));
              }
            }}
          >
            选择路径
          </Button>
        }
        placeholder={`${getDefaultSaveDir() || "请输入保存路径"}`}
      />
    </>
  );
}
