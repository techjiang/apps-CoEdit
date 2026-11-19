# CoEdit · 本地优先协作编辑引擎

给你的应用加上多人协作 — 离线优先、端到端加密、冲突自动合并。

CoEdit 是一个可嵌入的 CRDT 协作引擎：本地优先、离线可用，联网后自动合并，所有副本最终一致。

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
- `examples`：示例应用

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

当前提交完成 M1 的可运行骨架：RGA 文本 CRDT、富文本格式模型、Map/List/Tree/Counter CRDT、文档操作与增量同步协议、TypeScript SDK、React 绑定、示例工程与 CI 配置。后续里程碑按 Issue 文档继续推进。
