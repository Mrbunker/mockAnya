import {
  Button,
  Form,
  Toast,
  useFormApi,
  useFormState,
} from "@douyinfe/semi-ui";
import { useAtomValue } from "jotai";
import { chooseDefaultSaveDir } from "../services/save";
import { IconLink } from "@douyinfe/semi-icons";
import { defaultSaveDirAtom } from "../state/settingsAtoms";
import { getErrorDisplayMessage, isCanceledResult } from "../lib/result";

type FormatOption = { label: string; value: string };
type Props = { formatOptions: FormatOption[] };

export default function CommonSaveFields({ formatOptions }: Props) {
  const defaultSaveDir = useAtomValue(defaultSaveDirAtom);
  const formState = useFormState();
  const formApi = useFormApi();
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
        placeholder="请输入"
        rules={[
          {
            pattern: /^[^/\\:*?"<>|]+$/,
            message: '文件名不能包含 / \\ : * ? " < > |',
          },
        ]}
        trigger="blur"
        suffix={format ? `.${format}` : undefined}
      />
      <Form.Input
        className="w-full"
        field="customDir"
        label="保存路径"
        suffix={
          <Button
            type="tertiary"
            icon={<IconLink />}
            onClick={async () => {
              const res = await chooseDefaultSaveDir();
              if (res.ok) {
                formApi.setValue("customDir", String(res.data.dir));
              } else {
                if (isCanceledResult(res)) Toast.info("已取消");
                else
                  Toast.error(
                    getErrorDisplayMessage(res.error, "选择路径失败"),
                  );
              }
            }}
          >
            选择路径
          </Button>
        }
        placeholder={`${defaultSaveDir || "请输入保存路径"}`}
      />
    </>
  );
}
