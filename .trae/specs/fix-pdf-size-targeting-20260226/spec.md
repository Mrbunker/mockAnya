# PDF 目标大小生成修复 Spec

## Why
当前 PDF 使用 Chromium `printToPDF` 生成，输出大小受内部排版与压缩影响较大，导致目标大小（如 20KB）与实际产物（如 50KB）偏差严重，无法满足“按目标大小生成”的预期。

## What Changes
- 文本类 PDF 生成从“Chromium printToPDF”改为“主进程确定性 PDF 组装”
- `generatePdf` IPC 入参新增目标大小（字节）参数，主进程按目标大小尽量精确填充
- 渲染侧 `generateText(format=pdf)` 不再做迭代试探，直接一次性请求主进程生成
- 若目标大小小于 PDF 最小可生成大小，返回最小 PDF（并保证内容正确）
- 维持非桌面端不可用行为不变

## Impact
- Affected specs: 文本类 PDF 生成、IPC 契约、目标大小策略
- Affected code: src/ipc/contract.ts、electron/main.ts、src/services/generate.ts、src/ipc/client.ts

## ADDED Requirements
### Requirement: PDF Target Size
系统 SHALL 在 PDF 格式下尽量逼近用户指定的目标大小（字节数），并保证 PDF 可正常打开且包含用户输入文本。

#### Scenario: 目标大小 20KB
- **WHEN** 用户选择 PDF，目标大小 20KB，并点击生成保存
- **THEN** 生成的 PDF 文件字节大小应尽量接近 20,000 字节
- **AND** PDF 正文包含用户输入文本（可复制文本为主）

#### Scenario: 目标大小低于最小 PDF
- **WHEN** 用户选择 PDF，目标大小小于系统可生成的最小 PDF 大小
- **THEN** 返回最小可用 PDF（可打开、包含文本），并忽略无法满足的更小目标

## MODIFIED Requirements
### Requirement: Text PDF Generation Implementation
PDF 生成实现 SHALL 具备确定性与可控填充能力，以保证目标大小逼近的稳定性。

## REMOVED Requirements
### Requirement: PDF Size Tuning via Chromium Output Feedback
**Reason**: 依赖 `printToPDF` 的输出反馈迭代调参不稳定，且不同平台差异明显。
**Migration**: 使用主进程确定性 PDF 组装，并通过可控 padding 对总字节数进行校准。

