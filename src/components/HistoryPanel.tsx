import { useEffect, useState } from "react";
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
  listHistory,
  clearHistory,
  removeHistory,
  kindToZh,
  type HistoryItem,
} from "../services/history";
import { openFile, openInFolder, fileExists } from "../services/save";

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [invalidMap, setInvalidMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setHistory(listHistory());
    }
  }, [visible]);

  useEffect(() => {
    (async () => {
      const list = listHistory();
      const checks = await Promise.all(
        list.map(async (item) => {
          if (!item.path) return { id: item.id, invalid: false };
          const res = await fileExists(item.path);
          return { id: item.id, invalid: res?.ok ? !res.exists : false };
        })
      );
      const map: Record<string, boolean> = {};
      for (const c of checks) map[c.id] = c.invalid;
      setInvalidMap(map);
      setHistory(list);
    })();
  }, [visible]);

  const refresh = () => setHistory(listHistory());

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
              clearHistory();
              refresh();
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
            refresh={refresh}
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
  refresh,
}: {
  item: HistoryItem;
  invalid: boolean;
  refresh: () => void;
}) => {
  return (
    <div
      key={item.id}
      className={`pt-3 border rounded-lg ${invalid ? "opacity-60" : ""}`}
    >
      <div className="flex justify-between items-center">
        <div
          className={`flex gap-2 text-sm ${
            invalid ? "text-gray-500" : "text-gray-700"
          }`}
        >
          <span>{new Date(item.time).toLocaleString()}</span>
          <Tag>{kindToZh(item.kind)}</Tag>
          <Tag>{item.format}</Tag>
        </div>
        <div className="mt-2 flex gap-2">
          {item.path && (
            <Button
              theme="borderless"
              type="tertiary"
              title="打开所在文件夹"
              icon={<IconFolderOpen />}
              onClick={async () => {
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
            onClick={() => {
              removeHistory(item.id);
              refresh();
            }}
          />
        </div>
      </div>

      <Tooltip content={item.path || item.filename}>
        <Typography.Text
          link={!invalid}
          ellipsis={{ showTooltip: false }}
          title={item.path || item.filename}
          onClick={() => handleOpenFile(item)}
          className="mt-1 block w-full overflow-hidden whitespace-nowrap text-ellipsis"
        >
          {item.filename}
        </Typography.Text>
      </Tooltip>
    </div>
  );
};
