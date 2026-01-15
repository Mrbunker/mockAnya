import { useState } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Tabs, TabPane, Button, Typography } from "@douyinfe/semi-ui";
import {
  IconSetting,
  IconClock,
  IconImage,
  IconTextRectangle,
  IconVideo,
  IconSong,
} from "@douyinfe/semi-icons";
import ImageGenerator from "./features/ImageGenerator";
import TextGenerator from "./features/TextGenerator";
import VideoGenerator from "./features/VideoGenerator";
import AudioGenerator from "./features/AudioGenerator";
import SettingsPanel from "./components/SettingsPanel";
import HistoryPanel from "./components/HistoryPanel";
import { Kind, View } from "./constants";

const tabAtom = atomWithStorage<View>("activeView", View.image);

function App() {
  const [tab, setTab] = useAtom(tabAtom);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <div>
          <Typography.Title heading={1}>{__APP_NAME__}</Typography.Title>
        </div>
        <div className="flex items-center gap-2">
          <Button
            icon={<IconClock />}
            theme="borderless"
            type="tertiary"
            onClick={() => setHistoryOpen(true)}
          />
          <Button
            icon={<IconSetting />}
            theme="borderless"
            type="tertiary"
            onClick={() => setSettingsOpen(true)}
          />
        </div>
      </div>
      <Tabs
        type="line"
        className="mt-4"
        activeKey={tab}
        onChange={(key) => setTab(key as View)}
      >
        <TabPane
          tab={
            <div>
              <IconImage />
              <span>图片类</span>
            </div>
          }
          itemKey={Kind.image}
        >
          <ImageGenerator />
        </TabPane>
        <TabPane
          tab={
            <div>
              <IconTextRectangle />
              <span>文本类</span>
            </div>
          }
          itemKey={Kind.text}
        >
          <TextGenerator />
        </TabPane>
        <TabPane
          tab={
            <div>
              <IconVideo />
              <span>视频类</span>
            </div>
          }
          itemKey={Kind.video}
        >
          <VideoGenerator />
        </TabPane>
        <TabPane
          tab={
            <div>
              <IconSong />
              <span>音频类</span>
            </div>
          }
          itemKey={Kind.audio}
        >
          <AudioGenerator />
        </TabPane>
      </Tabs>

      <SettingsPanel
        visible={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
      />

      <HistoryPanel
        visible={historyOpen}
        onCancel={() => setHistoryOpen(false)}
      />
    </div>
  );
}

export default App;
