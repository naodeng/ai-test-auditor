<div align="right"><a href="../requirements.md">English</a> · <strong>简体中文</strong></div>

# 产品需求 — v0.1

## 问题

AI 辅助开发可能产生能编译、能运行、甚至提高覆盖率，却几乎没有回归保护能力的测试。产品聚焦一个审查问题：**当生产行为出错时，这条测试能否因预期原因失败？**

## 目标

提供本地 CLI，以少量高置信度、仅基于源码的指标识别 JavaScript / TypeScript 测试的无效信号。每条结果必须带确定性规则、源码行、说明与有边界的修复建议。

## 用户与任务

| 用户         | 任务                                              |
| ------------ | ------------------------------------------------- |
| 测试编写者   | 在评审前发现明显的虚假信心模式。                  |
| 代码评审者   | 获得稳定的源码证据和修复起点。                    |
| CI 维护者    | 将 JSON 或退出码用作建议性策略输入。              |
| Agent 使用者 | 通过双语 Skill 审查给定测试源码，不编造执行证据。 |

## 范围内

- Node.js 20+ CLI：`ata review [path] --type unit|api|e2e|auto --format text|json [--changed-since <local-ref>] [--policy <path>] [--baseline <path>]`。
- `ata decision <envelope.json>` 将严格的本地 version `1` 静态快照转换为建议性 JSON 结果。它拒绝未知字段和 semantic/mutation 附件；有效决策返回 `0`，且不是 CI 门禁。
- `ata gate <policy.json> <audit.json>` 是显式 opt-in、仅 FAKE 的静态门禁。它只阻断 `FAKE`、不执行被审计源码，并以 `0`、`1`、`2` 表示通过、阻断或无效输入。
- 支持 JS、TS、TSX 测试源码约定的 AST 提取。
- 公开目录中的确定性规则。
- 文本和 JSON 报告、FTR、透明的启发式分数。
- 相对于本地提交的变更文件选择，仅限当前支持的测试文件；不会推断生产代码与测试的关联。
- 外部提供的 version `1` 的建议性策略只能报告禁用/活跃选择计数；不改变静态分类、汇总值、FTR、Trust Score 或退出语义。
- 外部提供的 version `1` 基线只能报告历史/新增发现项身份计数；历史不代表接受发现项，也不改变静态分类、汇总值、FTR、Trust Score、策略计数或退出语义；无效基线输入返回退出码 `2`。
- 可以校验和显示外部提供的、带版本的语义报告，作为离线建议性证据；不会执行模型，也不会改变静态分类或退出语义。
- 英文主文档、中文翻译、基准 fixture、CI 与独立 Skill。
- GitHub Actions 参考工作流接受 PR base SHA 或手动 `base-ref`，选择变更的受支持测试文件并发布建议性输出，不成为门禁。
- `ata benchmark [manifest] --format text|json` 校验 version `1` 的纯源码 benchmark manifest。它比对精确的 rule/classification 身份和明确的 non-triggers，不 import 或执行 fixture 源码；`npm run benchmark` 运行仓库内置 corpus。
- `--locale <en|zh-CN>` 本地化 text 与 HTML 标签和规则目录 copy；JSON 保持 schema 兼容并保留原始 finding 字段。
- 审计配置兼容没有 version 的旧 JSON，并将其规范化为 version `1`；未知字段、空 include/exclude 模式和不支持的 semantic provider 值属于无效输入。

## 范围外

- 执行测试、import 测试代码、解析运行时依赖，或证明测试可以运行。
- 执行 LLM、生成语义意图推断、运行 Mutation Testing、覆盖率、脆弱测试检测或 GitHub PR 注释。可以校验和显示外部提供的变异证据产物，但不会执行它，也不会将其作为门禁。
- 因静态规则未命中而标记 `STRONG`。
- 文档所述直接 Jest/Vitest/Playwright/Node `node:test` 回调之外的框架支持。

## 分类契约

| 分类         | 当前含义                                                                          |
| ------------ | --------------------------------------------------------------------------------- |
| `FAKE`       | 已发现当前规则可确定识别的、缺少有效回归保护的源码模式。                          |
| `WEAK`       | 发现确定但有限的断言模式，是否充分依赖上下文，需人工复核。                        |
| `INVALID`    | 选中的测试源码存在 parser 诊断（`PARSER001`）；它是源码语法证据，不是运行时证明。 |
| `UNASSESSED` | 现有确定性规则未覆盖；不是质量背书。                                              |
| `STRONG`     | 为未来预留；v0.1 永不产生。                                                       |

## 验收标准

- 扫描支持的文件或目录时不执行其中源码。
- 每条发现项均含 rule ID、分类、严重性、置信度、文件、行号、信息和修复建议。
- 文本报告是审计结果的可读投影；JSON 包含完整的结构化公开结果契约。
- 退出码：无 `FAKE` 为 `0`，至少一条 `FAKE` 为 `1`，无效命令、无效策略、输入、semantic/mutation report 或选中源码语法为 `2`。
- README、中英文文档、Skill 只描述已经实现的行为。

## 成功信号与限制

MVP 的成功标准是维护者可在 benchmark 源码上复现发现项，并理解规则为什么命中。FTR 和 Trust Score 是排序启发式，不是生产质量指标。
