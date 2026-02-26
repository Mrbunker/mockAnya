import {
  SideSheet,
  Button,
  Toast,
  Form,
  useFormState,
  useFormApi,
} from "@douyinfe/semi-ui";
import { useAtomValue, useSetAtom } from "jotai";
import { IconLink } from "@douyinfe/semi-icons";
import { useDebounceFn } from "ahooks";
import { chooseDefaultSaveDir, openInFolder } from "../services/save";
import { fileExists } from "../services/save";
import { getErrorDisplayMessage, isCanceledResult } from "../lib/result";
import {
  defaultFilenameAtom,
  defaultSaveDirAtom,
} from "../state/settingsAtoms";

type Props = {
  visible: boolean;
  onCancel: () => void;
};

type FormState = {
  defaultDir: string;
  defaultFilename: string;
};

export default function SettingsPanel({ visible, onCancel }: Props) {
  const defaultSaveDir = useAtomValue(defaultSaveDirAtom);
  const defaultFilename = useAtomValue(defaultFilenameAtom);
  const initValues = {
    defaultDir: defaultSaveDir || "",
    defaultFilename: defaultFilename ?? __APP_NAME__,
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
  const setDefaultSaveDir = useSetAtom(defaultSaveDirAtom);
  const setDefaultFilename = useSetAtom(defaultFilenameAtom);
  const { run: handleDirSubmit } = useDebounceFn(
    (values: { defaultDir: string }) => {
      const dir = values.defaultDir?.trim();
      setDefaultSaveDir(dir || "");
    },
    { wait: 700 },
  );
  const { run: handleNameSubmit } = useDebounceFn(
    (values: { defaultFilename: string }) => {
      const name = values.defaultFilename?.trim();
      setDefaultFilename(name || "");
    },
    { wait: 700 },
  );

  const formValues = useFormState<FormState>();
  const formApi = useFormApi<FormState>();
  const defaultDir = formValues.values?.defaultDir;

  return (
    <>
      <Form.Slot label="默认保存路径">
        <Form.Input
          noLabel
          fieldClassName="p-0"
          field="defaultDir"
          showClear
          placeholder="请输入默认保存路径"
          onChange={(value) => handleDirSubmit({ defaultDir: value })}
        />
        <div className="flex gap-2">
          <Button
            theme="solid"
            type="primary"
            icon={<IconLink />}
            onClick={async () => {
              const res = await chooseDefaultSaveDir();
              if (res.ok) {
                handleDirSubmit({ defaultDir: String(res.data.dir) });
                formApi.setValue("defaultDir", String(res.data.dir));
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
          {defaultDir && (
            <Button
              type="tertiary"
              onClick={async () => {
                const exists = await fileExists(defaultDir!);
                if (!exists.ok) {
                  Toast.error(
                    getErrorDisplayMessage(exists.error, "打开目录失败"),
                  );
                  return;
                }
                if (!exists.data.exists) {
                  Toast.error("目录不存在");
                  return;
                }
                const res = await openInFolder(defaultDir!);
                if (!res.ok) {
                  Toast.error(
                    getErrorDisplayMessage(res.error, "打开目录失败"),
                  );
                }
              }}
            >
              打开目录
            </Button>
          )}
        </div>
      </Form.Slot>

      <Form.Input
        label="默认文件名"
        field="defaultFilename"
        showClear
        placeholder="默认用于生成文件名"
        rules={[
          {
            pattern: /^[^/\\:*?"<>|]+$/,
            message: '文件名不能包含 / \\ : * ? " < > |',
          },
        ]}
        onChange={(value) => handleNameSubmit({ defaultFilename: value })}
      />
    </>
  );
};
