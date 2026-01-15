import { useState } from "react";
import { Tabs, TabPane } from "@douyinfe/semi-ui";
import ImageGenerator from "./features/ImageGenerator";
import TextGenerator from "./features/TextGenerator";
import "./App.css";

function App() {
  const [tab, setTab] = useState<string>("image");
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">MockAny</h1>
      <p className="mt-2">简单的文件生成工具，支持图片与文本文件生成。</p>
      <Tabs
        type="line"
        tabBarClassName="mb-6"
        activeKey={tab}
        onChange={(key) => setTab(key)}
      >
        <TabPane tab="图片类" itemKey="image">
          <ImageGenerator />
        </TabPane>
        <TabPane tab="文本类" itemKey="text">
          <TextGenerator />
        </TabPane>
      </Tabs>
    </div>
  );
}

export default App;
