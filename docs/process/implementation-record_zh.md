<div align="right"><a href="./implementation-record.md">English</a> · <strong>简体中文</strong></div>

# 实施过程记录

## 2026-09-05 — v0.4 离线变异证据

新增位于 `--mutation-report` 后的 version `1` 变异报告适配器。证据必须包含引擎标识、已记录命令、阈值来源、数量和一致的分数。记录的命令绝不会被执行；阈值状态仅供建议，不改变静态发现、分类、FTR、Trust Score 或退出码。

TDD 证据：`npx vitest run tests/core/mutation.test.ts` 先因 `src/core/mutation.ts` 不存在而失败；加入严格 parser 和 loader 后，4 个测试通过。随后 `npx vitest run tests/cli.test.ts tests/reporters.test.ts` 因缺少 CLI 选项和报告段而失败；接入 mutation 附加和输入错误处理后，聚焦套件通过。

最终验证：`npm test` 通过 9 个文件、61 个测试；`npm run lint`、`npm run typecheck`、`npm run format:check` 和 `npm run build` 均通过。`node dist/cli.js review benchmarks --mutation-report /private/tmp/ata-v0.4-mutation-report.json --format json` 输出了 `mutation.meetsThreshold: false`，但由于基准原有的静态 `FAKE` 发现保持不变，仍按预期返回退出码 `1`。

测试补强：新增不支持的版本、两位小数分数取整、格式错误和缺失文件、达标/未达标渲染、携带 mutation 证据的静态 `FAKE` 退出码，以及若被执行将创建标记文件的已记录命令等契约用例。聚焦命令 `npx vitest run tests/core/mutation.test.ts tests/cli.test.ts tests/reporters.test.ts` 通过 28 个测试；标记文件未被创建。

## 2026-09-04 — v0.3 离线语义接口

新增版本化 semantic-report 加载和可选的 offline/OpenAI/Anthropic provider 配置校验。Provider 仅是配置：v0.3 不读取凭证，也不通过网络发送被审计源码。语义推断仅供参考，不改变静态发现、分类、分数或退出码。

## 2026-09-04 — TDD 交付政策

今后的所有功能、修复、重构和行为变更必须遵循已观察到的 RED-GREEN-REFACTOR 循环。关键改动需同时记录聚焦 RED、GREEN 命令和全量验证证据。

## 2026-09-04 — v0.2 提取范围

v0.2 增加嵌套套件标签、参数化 Jest/Vitest 测试提取、解析诊断和可选 basename 排除配置。诊断只报告 TypeScript 源码解析器观察结果，不代表运行时有效性。

## 2026-09-03 — 许可证决策

项目许可证改为 PolyForm Noncommercial License 1.0.0。`LICENSE`、包元数据、公开入口和贡献指南均链接至官方条款；仓库不提供法律意见，也不对具体商业用途作出判断。

## 范围

在隔离 worktree `codex/initial-mvp` 中实施初始 MVP。用户要求交付确定性的纯源码 CLI、英文优先且可切换中文的 README、需求/架构/规则/路线图/开发文档、独立双语 Skill 与 Prompt、基准 fixture、CI 和过程证据。

## 设计决策

| 决策                            | 原因                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| 优先静态 AST 证据               | 在不假装观察运行时行为的前提下，提供可复现、可解释的发现项。      |
| 使用 `UNASSESSED` 而非 `STRONG` | 当前规则未命中不能证明测试有效。                                  |
| `FAKE` 仅用于窄范围语法模式     | 避免把依赖上下文的建议报告成确定缺陷。                            |
| 文本投影加完整 JSON 契约        | 文本报告服务人工阅读；JSON 保留完整结构化审计结果，供自动化使用。 |
| 透明的 FTR 与分数               | 让启发式可检查，而不是伪装成质量测量。                            |

## 实施顺序

1. 建立 TypeScript/Vitest/ESLint/Prettier/Commander 脚手架和不可变审计契约。
2. 添加安全扫描器和 TypeScript 编译器 API 提取器；只读取审计源码，绝不执行。
3. 添加单元/API/E2E 的确定性规则和源码定位契约。
4. 添加聚合、评分、报告器、`ata review` 和退出码文档。
5. 添加双语公开文档、协作规则、Skill/Prompt 资产、基准 fixture 和 CI。
6. 通过 red-green 流程新增 `E2E001`：规则引擎用例先因无发现项失败，加入窄规则后通过。

## 审查修复（2026-09-03）

本轮针对最终审查结论进行了范围受控的修复。先添加三个聚焦回归用例，再实施最小改动：

1. UT011 现在要求 callee 和全部参数的 TypeScript AST 结构文本均一致；不同参数不再命中。
2. UT003 使用 TypeScript AST 打印的结构文本比较，保留字符串字面量的空白和内容，避免把 `'a b'` 与 `'ab'` 当作相同表达式。
3. 提取器把 `TestCase.line` 定义为回调起始行，因此回调跨行书写时，发现项定位不会错误地以 `test(...)` 起始行作为基准。
4. CI 仅允许 benchmark 审计预期产生的退出码 `1`，其余任何退出码都会失败。
5. 需求和架构文档明确：文本是可读投影，JSON 是完整结构化公开结果；不再错误承诺二者携带完全相同的数据。
6. 实施计划中原先的 `ts-morph` 表述已更正为 TypeScript 编译器 API，以匹配实际实现。

## 验证证据

| 检查                              | 状态       | 证据                                                                                                                                 |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| UT011/UT003/回调定位回归（RED）   | 已观察失败 | 修改实现前，聚焦测试以 3 个预期失败退出：UT011 不同参数仍命中、UT003 丢失字面量空白、提取器返回 `test(...)` 第 3 行而非回调第 5 行。 |
| UT011/UT003/回调定位回归（GREEN） | 已通过     | 修改后同一聚焦测试集通过；完整命令输出将在本轮最终验证后记录。                                                                       |

### 最终审查验证（2026-09-03）

| 检查                        | 状态       | 证据                                                                                                                                                          |
| --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 聚焦回归 RED                | 按预期通过 | 实现前运行 `npm test -- tests/core/rule-engine.test.ts tests/core/extractor.test.ts`，恰好出现 3 个预期失败：UT011 不同参数、UT003 字面量空白和回调行号基准。 |
| 聚焦回归 GREEN              | 已通过     | 最小实现修改后，同一聚焦命令通过。                                                                                                                            |
| 完整测试集                  | 已通过     | `npm test`：7 个文件、45 个测试通过。                                                                                                                         |
| Lint/typecheck/format/build | 已通过     | `npm run lint`、`npm run typecheck`、`npm run format:check` 和 `npm run build` 均以 0 退出。                                                                  |
| 构建后的 CLI benchmark      | 已通过     | `node dist/cli.js review benchmarks --format json` 输出了包含 UT011 在内的文档化发现项，并如预期返回退出码 `1`。                                              |
| CI benchmark 退出码策略     | 已通过     | workflow 中的 shell 条件接受真实 benchmark 的退出码 `1`，并拒绝模拟的非预期退出码 `0`。                                                                       |
| Diff 空白检查               | 已通过     | `git diff --check` 没有输出。                                                                                                                                 |

## 已知边界

- 工具不执行被审计测试，也不验证 import、fixture、运行时结果、覆盖率或产品行为。
- 当前提取器只支持直接 `test` / `it` 回调，不支持每一种框架 DSL 变体。
- LLM 执行、变异命令执行和 CI gate 强制执行仍属于路线图，不是已实现功能。

## 过程文档政策

后续关键决策、范围变化、验证命令、失败和未解决风险都记录在本文件，并同步英文过程记录。不得用回顾性描述替代命令证据。
