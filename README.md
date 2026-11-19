# CoEdit · 本地优先协作编辑引擎

本地协作，随时同步。 — 离线优先、端到端加密、冲突自动合并。

CoEdit 是一个可嵌入的 CRDT 协作引擎：本地优先、离线可用，联网后自动合并，所有副本最终一致。

## 品牌

- 项目口号：**本地协作，随时同步。**
- 最终 Logo：`assets/brand/coedit-logo-v5.svg`（透明背景）
- 5 轮 Logo 迭代：`assets/brand/coedit-logo-v1.svg` ~ `coedit-logo-v5.svg`

## 核心能力

- 实时协作与离线编辑
- CRDT 冲突自动合并
- 富文本 / 纯文本 / 结构化数据
- 增量同步、光标感知、版本历史
- TypeScript SDK 与 React 绑定
- 可选的 WebSocket 同步服务器

## 仓库结构

- `crates/coedit-core`：Rust CRDT 核心引擎
- `crates/coedit-wasm`：WASM 绑定
- `crates/coedit-server`：可选同步服务器
- `packages/coedit`：TypeScript SDK
- `packages/coedit-react`：React 绑定
- `examples`：示例应用（含 `collab-demo` 可视化演示页）

## 快速开始

```ts
import { Document } from 'coedit';

const doc = new Document({ type: 'text' });
doc.insert(0, 'Hello, CoEdit!');
console.log(doc.toString());
```

## 开发

```bash
cargo test --workspace
npm test --workspaces
```

## 协议

Apache 2.0 © 2026 科技酱

## 实现状态

当前提交在 M1 骨架之上完善了 TypeScript 文档模型：真实增量操作日志、富文本格式标记、历史快照与恢复、跨文档变更重放、同步状态与待同步计数，并新增可在浏览器打开的协作演示页 `examples/collab-demo`。

```bash
npx vite --host 127.0.0.1 --port 4173 --config examples/collab-demo/vite.config.ts examples/collab-demo
```

打开 `http://127.0.0.1:4173/` 可查看离线编辑、在线状态、格式标记与版本回溯。Rust 核心仍保留 M1 实现；后续继续推进 WebSocket 同步与端到端加密。
