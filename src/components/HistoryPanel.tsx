import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  SideSheet,
  Button,
  Toast,
  Typography,
  Tag,
  Tooltip,
} from "@douyinfe/semi-ui";
import { IconDelete, IconFolderOpen } from "@douyinfe/semi-icons";
import {
  kindToZh,
  type HistoryItem,
  historyAtom,
  clearHistoryAtom,
  removeHistoryAtom,
} from "../services/history";
import { openFile, openInFolder, fileExists } from "../services/save";
import { formatDateString } from "../lib/utils";

type Props = {
  visible: boolean;
  onCancel: () => void;
};

const handleOpenFile = async (item: HistoryItem) => {
  const res = await openFile(item.path!);
  if (!res?.ok) {
    Toast.error(String(res?.message || "打开文件失败"));
  }
};

export default function HistoryPanel({ visible, onCancel }: Props) {
  const history = useAtomValue(historyAtom);
  const [invalidMap, setInvalidMap] = useState<Record<string, boolean>>({});
  const doClear = useSetAtom(clearHistoryAtom);

  useEffect(() => {
    (async () => {
      if (!visible) return;
      const checks = await Promise.all(
        history.map(async (item) => {
          if (!item.path) return { id: item.id, invalid: false };
          const res = await fileExists(item.path);
          return { id: item.id, invalid: res?.ok ? !res.exists : false };
        })
      );
      const map: Record<string, boolean> = {};
      for (const c of checks) map[c.id] = c.invalid;
      setInvalidMap(map);
    })();
  }, [visible, history]);

  return (
    <SideSheet
      visible={visible}
      onCancel={onCancel}
      title="历史记录"
      footer={
        <div className="flex justify-between w-full">
          <div className="text-gray-500 text-sm">共 {history.length} 条</div>
          <Button
            theme="borderless"
            type="tertiary"
            onClick={() => {
              doClear();
              Toast.success("已清空历史");
            }}
          >
            清空历史
          </Button>
        </div>
      }
    >
      <div className="">
        {history.map((item) => (
          <HistoryItem
            key={item.id}
            item={item}
            invalid={!!invalidMap[item.id]}
          />
        ))}
        {!history.length && (
          <div className="text-sm text-gray-500">暂无历史记录</div>
        )}
      </div>
    </SideSheet>
  );
}

const HistoryItem = ({
  item,
  invalid,
}: {
  item: HistoryItem;
  invalid: boolean;
}) => {
  const removeItem = useSetAtom(removeHistoryAtom);
  return (
    <div
      key={item.id}
      className={`mb-2 p-2 border rounded-md cursor-pointer bg-semi-color-tertiary-light-default ${
        invalid ? "opacity-60" : ""
      }`}
      onClick={() => {
        if (!invalid) handleOpenFile(item);
      }}
    >
      <Tooltip content={invalid ? "文件不存在" : item.path || item.filename}>
        <Typography.Text
          link={!invalid}
          ellipsis={{ showTooltip: false }}
          title={invalid ? "文件不存在" : item.path || item.filename}
          className="mt-1 block"
        >
          <div className="flex gap-2">
            <span className="max-w-[250px] overflow-hidden whitespace-nowrap text-ellipsis">
              {item.filename}
            </span>
            <Tag>{kindToZh(item.kind)}</Tag>
            <Tag>{item.format}</Tag>
          </div>
        </Typography.Text>
      </Tooltip>
      <div className="flex justify-between items-center">
        <div
          className={`flex gap-2 text-sm ${
            invalid ? "text-gray-500" : "text-gray-700"
          }`}
        >
          <span>{formatDateString(item.time)}</span>
        </div>
        <div className="mt-2 flex gap-2">
          {item.path && (
            <Button
              theme="borderless"
              type="tertiary"
              title="打开所在文件夹"
              icon={<IconFolderOpen />}
              onClick={async (e) => {
                e.stopPropagation();
                if (!item.path) return;
                const exists = await fileExists(item.path);
                if (!exists?.ok) {
                  Toast.error(String(exists?.message || "打开目录失败"));
                  return;
                }
                if (!exists.exists) {
                  Toast.error("文件不存在");
                  return;
                }
                const res = await openInFolder(item.path!);
                if (!res?.ok) {
                  Toast.error(String(res?.message || "打开目录失败"));
                }
              }}
              disabled={invalid}
            />
          )}
          <Button
            theme="borderless"
            type="tertiary"
            title="删除"
            icon={<IconDelete />}
            onClick={(e) => {
              e.stopPropagation();
              removeItem(item.id);
            }}
          />
        </div>
      </div>
    </div>
  );
};
