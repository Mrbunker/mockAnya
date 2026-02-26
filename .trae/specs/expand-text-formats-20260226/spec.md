# 文本生成格式扩展 Spec

## Why
当前文本类仅支持 TXT/JSON，实际使用中常需要 CSV、PDF 等常见导出格式以便分享、导入其它工具或归档。

## What Changes
- 文本类新增格式选项：TXT / CSV / JSON / PDF
- TXT/CSV/JSON 继续在渲染进程直接生成 Blob
- PDF 在桌面端（Electron IPC 可用）通过主进程生成；非桌面端提示不可用
- 文件名与扩展名随格式变化（例如 text.csv、text.pdf）
- 目标大小（fileSize）策略：
  - TXT/CSV：继续支持“尽量贴近目标字节数”的填充生成
  - JSON/PDF：以内容正确为主，目标大小仅 best-effort（不保证精确命中）

## Impact
- Affected specs: 文本类生成、保存流程、IPC 契约
- Affected code: src/features/TextGenerator.tsx、src/services/generate.ts、src/ipc/contract.ts、src/ipc/client.ts、electron/main.ts、src/services/generatorFlow.ts

## ADDED Requirements
### Requirement: Text Formats
系统 SHALL 在文本类生成界面提供格式选择：TXT、CSV、JSON、PDF。

#### Scenario: 生成 TXT
- **WHEN** 用户选择 TXT 并点击生成保存
- **THEN** 生成的文件扩展名为 .txt，文件内容为用户输入文本（支持目标大小填充）

#### Scenario: 生成 CSV
- **WHEN** 用户选择 CSV 并点击生成保存
- **THEN** 生成的文件扩展名为 .csv
- **AND** CSV 内容包含可解析的表格文本（最小实现：单列 content，多行重复填充以贴近目标大小）

#### Scenario: 生成 JSON
- **WHEN** 用户选择 JSON 并点击生成保存
- **THEN** 生成的文件扩展名为 .json
- **AND** 文件内容为包含 content 与 repeatsApprox 的 JSON

#### Scenario: 生成 PDF（桌面端）
- **WHEN** 用户选择 PDF 并点击生成保存，且 IPC 可用
- **THEN** 生成的文件扩展名为 .pdf
- **AND** PDF 正文包含用户输入文本（以可复制文本为主，排版不作为要求）

#### Scenario: 生成 PDF（非桌面端）
- **WHEN** 用户选择 PDF 并点击生成保存，且 IPC 不可用
- **THEN** 显示“当前环境不可用”的错误提示，不创建文件

## MODIFIED Requirements
### Requirement: Generator Flow Error Handling
生成/保存失败提示 SHALL 通过统一错误码与展示文案输出，避免出现未定义内容写入文件或提示不一致。

## REMOVED Requirements
无。

