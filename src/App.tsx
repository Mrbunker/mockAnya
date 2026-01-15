import { useState } from "react";
import { Tabs, TabPane, Button, Typography } from "@douyinfe/semi-ui";
import {
  IconSetting,
  IconClock,
  IconImage,
  IconTextRectangle,
} from "@douyinfe/semi-icons";
import ImageGenerator from "./features/ImageGenerator";
import TextGenerator from "./features/TextGenerator";
import SettingsPanel from "./components/SettingsPanel";
import HistoryPanel from "./components/HistoryPanel";
import "./App.css";
import { Kind, View } from "./constants";

function App() {
  const [tab, setTab] = useState<View>(View.image);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography.Title heading={1}>MockAny</Typography.Title>
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
