# Tasks

- [x] Task 1: 建立 IPC 契约层与统一调用封装
  - [x] SubTask 1.1: 新增 IPC 通道常量与类型定义
  - [x] SubTask 1.2: 渲染侧封装统一 IPC client（含超时与错误归类）
  - [x] SubTask 1.3: preload 增加 channel 白名单与类型约束

- [x] Task 2: 抽离生成器通用流程与文件名逻辑
  - [x] SubTask 2.1: 抽出 buildSuggestedFilename/normalizeExt 等工具
  - [x] SubTask 2.2: 抽离 generate → save → history → toast 的统一流程
  - [x] SubTask 2.3: 迁移四个 Generator 至统一流程

- [x] Task 3: 收敛状态与持久化入口
  - [x] SubTask 3.1: 统一 storage keys 常量
  - [x] SubTask 3.2: Settings/History 迁移至 jotai atoms 写入
  - [x] SubTask 3.3: 拆分 history storage 与 atoms，避免跨层混用

- [x] Task 4: 修复主题样式与 reset 影响面
  - [x] SubTask 4.1: 引入 Semi Design 基线样式并校验变量
  - [x] SubTask 4.2: 缩小 index.css reset 作用范围
  - [x] SubTask 4.3: 替换 Tailwind 灰阶为 Semi token/组件能力

- [x] Task 5: 补齐错误兜底与最小测试集
  - [x] SubTask 5.1: 增加 ErrorBoundary 与统一错误提示
  - [x] SubTask 5.2: 定义统一 Result/错误码并落地到 save/generate
  - [x] SubTask 5.3: 引入最小测试（storage、ipc client、文件名构建）

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2
- Task 5 depends on Task 1, Task 2, Task 3
