<div align="right"><a href="./README.md">English</a> · <strong>简体中文</strong></div>

# AI Test Auditor

[![CI](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml)

> 不要信任 AI 生成的测试。验证它们的静态证据。

AI Test Auditor 是本地优先、纯源码审计的 JavaScript 与 TypeScript 测试工具。它读取测试源码，不 import 或执行源码。

## 为什么使用 AI Test Auditor？

测试可能看起来完整，却没有验证可观察的行为。该工具以范围有限、可追溯的源码证据暴露虚假信心信号，帮助团队在依赖测试前审查证据。

## 核心能力与明确限制

它提取直接定义的 Jest、Vitest、Playwright 和 Node `node:test` 回调；Node 测试可以将可识别的 `node:assert` 调用作为断言。工具输出带位置与修复建议的 `FAKE` 或 `WEAK` 发现项，并支持变更文件选择、可选 mutation 证据、建议性策略、基线比较、建议性决策投影和显式 opt-in 策略门禁。

它不运行测试、不检查运行时行为、不调用 LLM、不计算覆盖率，也不推断生产代码与测试关系。未命中规则的测试是 `UNASSESSED`，不是 `STRONG`。FTR 和 Trust Score 只是排序辅助，不是发布结论。

## 快速开始

需要 Node.js 20+。

```bash
npm install
npm run build
node dist/cli.js review ./tests --format json
```

安装包使用 `ata review [path]`；源码 checkout 使用 `node dist/cli.js review [path]`。

预期结果：JSON 会列出提取的测试和确定性发现项；退出 `1` 表示至少存在一个 `FAKE`，而 `0` 不证明测试很强。

## 常用工作流

```bash
# 选择相对本地 ref 变化的受支持测试文件。
node dist/cli.js review . --changed-since HEAD~1 --format json

# 增加版本化证据或建议性上下文，不改变静态语义。
node dist/cli.js review ./tests --mutation-report ./mutation-report.json
node dist/cli.js review ./tests --policy ./audit-policy.json
node dist/cli.js review ./tests --baseline ./finding-baseline.json

# 投影严格的建议性决策或评估显式门禁。
node dist/cli.js decision ./decision-envelope.json
node dist/cli.js gate ./gate-policy.json ./audit-envelope.json

# 生成可本地打开和筛选的报告；默认英文。
node dist/cli.js review ./tests --format html --output audit.html
node dist/cli.js review ./tests --format html --locale zh-CN --output audit-zh.html

# 运行版本化、纯源码的 v1.2 benchmark fixture。
npm run benchmark
```

`--output` 支持 text、json、html。HTML 未指定 `--output` 时默认写入当前目录的 `audit.html`，使用 `--locale zh-CN` 时默认写入 `audit-zh.html`；text 与 JSON 继续写入标准输出。`--locale zh-CN` 本地化 text 与 HTML；不输入时为 `en`。JSON 保持稳定 schema 与英文消息。
HTML 写入报告时标准输出保持干净；如需在命令行获取绝对路径，可追加 `--print-output-path`，路径会输出到标准错误。

v1.2 benchmark manifest 覆盖 10 条 Unit 规则、10 条 API 规则和 10 条 E2E 规则。`ata benchmark [manifest]` 通过静态审计管线读取 fixture 源码，比对精确的 rule/classification 身份并报告 fixture 一致性；它绝不 import 或执行 fixture。benchmark 输入格式无效返回 `2`，有效 manifest 但结果不一致返回 `1`。

审计配置兼容没有 version 的旧 JSON，并将其规范化为 version `1`；未知字段、空的 include/exclude 模式和不支持的 semantic provider 都属于无效输入。`--locale en` 与 `--locale zh-CN` 只选择 text/HTML 语言，不改变 JSON schema。

`--policy` 只是 advisory：它只报告禁用/活跃选择计数，不改变发现项、分类、汇总、FTR、Trust Score 或退出语义。无效策略输入返回 `2`；它不是默认 CI 门禁，也不作发布决定。`ata decision` 同样只是建议性：有效决策返回 `0`，无效输入返回 `2`。

显式 opt-in 策略门禁只接受 `mode: "gate"` 和 `blockOn: ["FAKE"]`：使用 `ata gate` 运行。`WEAK 不阻断`；通过不证明测试很强。GitHub Actions 参考工作流使用 `base-ref`、`--changed-since` 和 `contents: read`，不创建 PR 评论。

## 输出与退出码

`FAKE` 是确定性语法证据，`WEAK` 是不阻断的上下文提示，`UNASSESSED` 表示静态分析未给出结论。FTR 和 Trust Score 用于安排审查优先级，不度量运行时质量。

| 代码 | 含义                                                               |
| ---- | ------------------------------------------------------------------ |
| `0`  | 未输出确定性的 `FAKE`；不证明测试很强。                            |
| `1`  | 至少输出一个确定性的 `FAKE`。                                      |
| `2`  | 命令、路径、无效策略输入、输入或选中的源码无效，包括 `PARSER001`。 |

## 项目边界

审计器绝不 import、执行或评估被审计源码；它不证明测试强度、运行时质量、覆盖率、变异得分或发布就绪性。

## 文档导航

将输出作为发布决定前，请先阅读[规则目录](./docs/zh/rules.md)。

- [需求文档](./docs/zh/requirements.md)
- [架构设计](./docs/zh/architecture.md)
- [迭代计划](./docs/zh/roadmap.md)
- [项目上下文](./docs/zh/context.md)
- [开发指南](./docs/zh/development.md)
- [中文实施经验](./docs/history/implementation-notes.md)
- [贡献指南](./CONTRIBUTING_ZH.md)

## 下一步

v1.2.1 是当前稳定发布版本。它包含 advisory workflow 的 CI 修复，同时保留 v1.2 静态审计增强；v1.5 及之后的方向尚未交付，仅在[迭代计划](./docs/zh/roadmap.md)中说明。

## 参与贡献

请阅读[贡献指南](./CONTRIBUTING_ZH.md)。提交变更前运行：

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

项目规则见 [AGENTS.md](./AGENTS.md)，完整流程见[开发指南](./docs/zh/development.md)。

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。商业用途不被允许；请阅读[官方条款](https://polyformproject.org/licenses/noncommercial/1.0.0)。
