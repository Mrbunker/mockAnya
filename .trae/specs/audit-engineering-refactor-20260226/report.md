# 工程审计报告（2026-02-26）

## 概览

项目为 Electron + Vite + React 的桌面应用，主进程集中在 `electron/main.ts`，渲染进程在 `src/`，功能围绕四类生成器（图片/文本/视频/音频）与保存、历史、设置等能力展开。当前结构以 `features`、`components`、`services` 分层，但跨层职责边界较弱，IPC 通道、持久化与重复流程分散在多处，导致维护成本上升与一致性风险增加。

## 关键入口与链路（用于定位重构落点）

- Renderer 入口：`src/main.tsx` → `src/App.tsx`
  - 直接监听 `window.ipcRenderer.on("main-process-message", ...)`，对运行环境存在隐式假设
- Main 入口：`electron/main.ts`
  - IPC handler 全量集中在同一文件
  - 依赖渲染进程工具函数：`electron/main.ts` import `../src/lib/utils`（跨进程边界不清晰）
- Preload：`electron/preload.ts`
  - 透传 `ipcRenderer.on/off/send/invoke`，缺少 channel 白名单与契约约束

## 当前依赖边界（现状）

- UI/业务：`src/features/*Generator.tsx` + `src/components/*Panel.tsx`
- 能力封装：`src/services/save.ts`（保存/系统交互）、`src/services/generate.ts`（生成）、`src/services/history.ts`（历史 + jotai 原子）
- 存储：localStorage（`genHistory`、`defaultSaveDir`、`defaultFilename`、`activeView` 等 key 分散）

## 缺陷与优化点

### P0

- IPC 通道为字符串硬编码并在主进程与渲染进程分散维护，缺少统一契约与类型约束，存在误用/变更破坏风险
  - 通道分散：`electron/main.ts`、`src/services/save.ts`、`src/services/generate.ts`
  - preload 透传任意 channel，建议收敛至白名单
- 生成流程与保存流程在四个 Generator 中重复实现，异常处理与成功/失败分支分散，难以整体修复与统一体验
  - 四处重复：`features/ImageGenerator.tsx`、`TextGenerator.tsx`、`VideoGenerator.tsx`、`AudioGenerator.tsx`
  - “补全扩展名/建议文件名”逻辑重复，易产生边界不一致
- semidesign 默认主题的工程接入不完整：Tailwind token 映射依赖 `--semi-*` 变量，但未发现引入 Semi 样式基线；同时 `src/index.css` 存在强 reset
  - 风险：Semi 组件样式/变量不完整、reset 覆盖 Semi 默认样式、Tailwind 灰阶与 Semi token 混用导致风格不一致
- 跨进程边界不清晰：主进程依赖 `src` 代码（`electron/main.ts` import `../src/lib/utils`），会在构建、打包与后续分层治理上制造耦合
  - 建议：将主进程使用的工具函数迁移到 `electron/lib/*` 或 `shared/*`（纯 TS/无 DOM/无 React 依赖）

### P1

- localStorage 直写与 atomWithStorage 并存，持久化入口分散，状态来源不一致导致调试与一致性困难
  - `App.tsx` 使用 `atomWithStorage("activeView")`
  - `SettingsPanel.tsx` 直接写 `defaultSaveDir/defaultFilename`
  - `history.ts` 读写 localStorage + 暴露 jotai atoms，同时新增历史通过 `addHistory()` 写入后还需要 `refreshHistoryAtom` 刷新 UI（存在漏调风险）
- 错误处理缺少统一策略与兜底（例如 ErrorBoundary、统一的 IPC 错误封装），异常透传路径不可预测
  - main 侧大量 `{ ok:false, message }`，无错误码；renderer 侧多处 `Toast.error(e.message)`，用户可读性与一致性弱
- 关键流程（生成、保存、历史读取）缺少可验证测试与回归清单
  - 当前无 `test` 脚本与测试框架依赖，建议先覆盖纯函数与 IPC client 封装

### P2

- 目录职责偏宽，`services` 同时承担 IPC、存储与业务流程职责，后续扩展易产生耦合
- 历史与设置读取依赖 localStorage 同步读取，未形成可观测的状态源与订阅机制
  - `components` 下的 `HistoryPanel/SettingsPanel` 更像 feature 容器（包含副作用与状态写入），可考虑迁移至 `features/*`

## 影响范围

- 代码影响：`electron/main.ts`、`electron/preload.ts`、`src/services/*`、`src/features/*`、`src/components/*`、`src/index.css`
- 行为影响：IPC 交互稳定性、生成器保存流程一致性、历史记录展示与刷新、样式一致性与视觉回归
- 工程影响：扩展新生成器能力的成本、回归测试负担、错误定位效率

## 建议

- IPC 契约层
  - 新增 `src/constants/ipcChannels.ts`、`electron/ipc/handlers/*`、`src/services/ipcClient.ts`（typed invoke + 超时 + 统一 Result）
  - preload 增加 channel 白名单，避免任意 channel 调用
- 生成器流程抽离
  - 新增 `src/services/runGenerateFlow.ts` 或 `src/hooks/useGenerateAndSave.ts`：统一进度、保存、历史写入、Toast 与异常分类
  - 抽出 `buildSuggestedFilename()` 与 `normalizeExt()`，消除四处重复
- 状态与持久化收敛
  - storage keys 收敛至 `src/constants/storageKeys.ts`
  - Settings/History 以 jotai atoms 为唯一入口，落盘逻辑在 write atom 内完成，移除“写入后 refresh”模式
- 样式与主题一致性
  - 在 renderer 入口补齐 Semi 基线样式引入，并弱化/限定 `src/index.css` 的 reset（避免覆盖 Semi 默认样式）
  - 将 Tailwind 的 `text-gray-*` 等替换为 Semi token/组件能力，保持默认主题风格
- 错误处理与可观测性
  - renderer：增加 ErrorBoundary 与 `unhandledrejection` 收敛
  - main：增加 `uncaughtException/unhandledRejection` 兜底并输出结构化日志
- 测试与验证
  - 引入 Vitest（优先覆盖纯函数与 IPC client 的错误归类），再补充生成流程的集成级测试

## 可执行的重构切片（建议优先级）

- Slice A（P0）：IPC channels 常量化 + typed client（先不改 handler，实现兼容层）
- Slice B（P0）：抽离生成器公共流程（不改 UI 外观，减少重复与分支漂移）
- Slice C（P0/P1）：补齐 Semi 样式基线 + 限定 reset 影响面（重点做视觉回归）
- Slice D（P1）：Settings/History 状态收敛（引入 atoms 与 storage adapter，替换散落 localStorage）
- Slice E（P1）：统一错误模型 + ErrorBoundary（改善可诊断性与用户提示一致性）
- Slice F（P1/P2）：最小测试集（覆盖 storage、suggested filename、ipc client、生成流程关键分支）

## 迁移步骤

1. 新增 IPC 契约模块与 renderer API 包装，逐步替换直接 `ipcRenderer.invoke` 调用
2. 抽取生成器通用流程（生成 -> 保存 -> 记录历史 -> 反馈）为复用逻辑，逐个迁移四个 Generator
3. 将 localStorage 访问迁移为 jotai atoms + storage adapter，清理分散的读写入口
4. 调整样式入口：限定 reset 范围与 Tailwind 作用域，补齐 semidesign 默认主题基线
5. 增加 ErrorBoundary 与 IPC 错误统一处理，补齐失败提示与回退路径
6. 引入最小测试集与回归清单，覆盖核心流程

## 验证检查表

- IPC 通道仅在契约层定义，渲染侧无字符串直连
- 四类生成器共享统一保存与错误处理逻辑
- 历史记录、默认路径与默认文件名由统一状态源驱动
- semidesign 组件风格保持默认主题，无额外渐变或阴影
- 全局 reset 不影响 semidesign 基础样式与布局
- 保存失败、取消、IPC 不可用等异常能被一致处理并提示
- 至少包含生成流程与历史记录的最小测试与回归用例
