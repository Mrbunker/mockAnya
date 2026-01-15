import { useState } from "react";
import { Tabs, TabPane, Button, Typography } from "@douyinfe/semi-ui";
import { IconSetting, IconClock } from "@douyinfe/semi-icons";
import ImageGenerator from "./features/ImageGenerator";
import TextGenerator from "./features/TextGenerator";
import SettingsPanel from "./components/SettingsPanel";
import HistoryPanel from "./components/HistoryPanel";
import "./App.css";

enum Types {
  image = "image",
  text = "text",
}
enum View {
  image = "image",
  text = "text",
  settings = "settings",
}

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
        <TabPane tab="图片类" itemKey={Types.image}>
          <ImageGenerator />
        </TabPane>
        <TabPane tab="文本类" itemKey={Types.text}>
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
