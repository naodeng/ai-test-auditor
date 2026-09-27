<div align="right"><a href="../rules.md">English</a> · <strong>简体中文</strong></div>

# 规则目录

目录共包含 31 个稳定 rule ID：10 个 Unit、10 个 API、10 个 E2E，以及 1 个 parser 规则。

## 如何理解发现项

发现项均是局部、语法级、高置信度的模式证据。信息说明观察到的模式，不证明整个测试或应用必然有缺陷；修复建议应作为人工审查的起点。

| ID        | 分类    | 严重性   | 确定性触发条件                                                                                    | 不证明                                       |
| --------- | ------- | -------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| UT001     | FAKE    | CRITICAL | Unit/Jest/Vitest/Node `node:test` 回调没有可识别的 `expect(...)` 或 Node `assert`。               | 没有断言的测试在其他机制下永远无价值。       |
| UT002     | FAKE    | CRITICAL | `expect` 或 Node 原生比较断言比较相同基本字面量。                                                 | 每个常量断言在完整套件中都无帮助。           |
| UT003     | FAKE    | CRITICAL | 可识别 matcher 或 Node 原生比较断言的 actual 与 expected 具有完全相同的 TypeScript AST 结构文本。 | 写法不同但语义等价的表达式就是安全的。       |
| UT008     | FAKE    | CRITICAL | `catch` 为空，或只向 `console` 日志。                                                             | 任何有额外操作的 catch 都正确处理了错误。    |
| UT011     | FAKE    | CRITICAL | matcher 或 Node 原生比较断言两侧调用相同 callee，且参数结构完全相同。                             | 每个双调用比较在所有上下文中都无效。         |
| UT004     | WEAK    | WARNING  | 所有直接断言都只使用无参数 `toBeDefined` 或 `toBeTruthy`。                                        | 存在性或真值永远不是预期的单元契约。         |
| API001    | WEAK    | WARNING  | 所有识别到的断言只检查 `response.status` / `statusCode`。                                         | 状态码断言对该接口一定不充分。               |
| API002    | WEAK    | WARNING  | 所有直接断言都只用存在性 matcher 检查 `response.body` / `response.data`。                         | body/data 存在性一定不足以验证接口。         |
| E2E001    | FAKE    | CRITICAL | Playwright 回调没有识别到 `expect`。                                                              | 仅动作的 journey 不能用于准备或探索。        |
| E2E002    | WEAK    | WARNING  | 所有 Playwright 断言都使用 `toHaveURL`。                                                          | 只检查 URL 永远不能作为充分的 journey 结果。 |
| E2E003    | WEAK    | WARNING  | 所有直接断言都使用无参数 `toBeVisible`。                                                          | 可见性永远不是预期的 journey 结果。          |
| E2E004    | WEAK    | WARNING  | `page.waitForTimeout` 使用数值字面量。                                                            | 每个固定等待都可避免。                       |
| PARSER001 | INVALID | WARNING  | TypeScript 为选中的测试文件报告源码 parser 诊断。                                                 | 测试在框架运行时一定失败或无效。             |

| UT012 | FAKE | CRITICAL | 回调包含没有 matcher 的裸 `expect(...)` 调用。 | 回调没有其他有用副作用。 |
| UT013 | FAKE | CRITICAL | `expect.assertions(0)` 与实际 matcher 断言同时出现。 | 每个断言计数保护都不正确。 |
| UT014 | WEAK | WARNING | 所有直接断言都只验证 mock 交互。 | 交互断言永远不能构成有效单元契约。 |
| UT015 | WEAK | WARNING | 所有直接断言都只使用 snapshot matcher。 | snapshot 永远不能作为有效回归契约。 |
| API003 | WEAK | WARNING | 所有直接断言只验证 `response` 对象存在。 | response schema 或业务状态一定错误。 |
| API004 | WEAK | WARNING | 所有 body/data 断言都直接与 request-like 值比较。 | 接口一定没有转换或持久化请求。 |
| API005 | WEAK | WARNING | 所有 body/data 断言都只检查属性存在。 | 属性值一定错误。 |
| API006 | WEAK | WARNING | 所有直接断言都只验证 `response.headers` 存在。 | response headers 一定错误或不充分。 |
| API007 | WEAK | WARNING | 所有直接断言都只检查 response content-type 元数据。 | response body 或业务状态一定正确。 |
| API008 | WEAK | WARNING | 所有直接断言都只检查 response request 的 method 或 URL 元数据。 | API 行为一定正确。 |
| API009 | WEAK | WARNING | 所有 body/data 断言都只检查空对象、空数组或零长度。 | 空结果一定不是预期业务结果。 |
| API010 | FAKE | CRITICAL | API 请求错误被空 `catch` 或 console-only `catch` 吞掉。 | 所有 cleanup 场景中的请求失败都不应被吞掉。 |
| E2E005 | WEAK | WARNING | selector 字面量使用 class、id、裸 tag、XPath 或 CSS 结构形式。 | 实际应用中的 selector 一定不稳定。 |
| E2E006 | FAKE | CRITICAL | Playwright 错误被空 `catch` 或 console-only `catch` 吞掉。 | cleanup-only 流程中的 catch 一定错误。 |
| E2E007 | WEAK | WARNING | Playwright 断言位于 `if`、条件表达式或短路条件分支内。 | 条件一定无效或每条路径都必须使用相同断言。 |
| E2E008 | FAKE | CRITICAL | 直接 Playwright matcher 表达式没有 await。 | 自定义封装或 `Promise.all` 一定错误处理了 promise。 |
| E2E009 | WEAK | WARNING | 明确的 page action（如 `goto` 或 `click`）没有 await。 | 后续步骤一定与该 action 发生竞争。 |
| E2E010 | WEAK | WARNING | 所有直接断言都只检查空文本或空属性值。 | 空 UI 状态一定不是预期流程结果。 |

## 误报控制

- 规则仅处理提取出的直接回调，不读取执行结果。
- `API001` 和 `E2E002` 要求有限断言是所有已识别断言的唯一目标。
- `E2E004` 只命中数值字面量；变量不命中。
- `UT004`、`API002`、`E2E003` 要求每个直接断言都符合狭窄的无参数 matcher；修饰符、裸 expect 和混合断言会抑制提示。
- Node `node:test` 的断言识别仅限直接 `assert(...)`、`assert.method(...)` 以及 `node:assert` 中可静态声明的绑定；封装和间接 helper 仍保持 `UNASSESSED`。
- `PARSER001` 仅报告源码语法，不执行、解析依赖或验证运行时类型。
- 未命中的测试刻意保持为 `UNASSESSED`。
- v1.2 规则只使用有边界的源码形式；转换后的值、稳定 selector、重新抛出、已 await 调用、`Promise.all` 和混合有效断言是代表性不可触发样例。
- `ata benchmark` 比对版本化源码 fixture 以及精确的 rule/classification 身份；它是 fixture 一致性证据，不是运行时质量、覆盖率、mutation、precision、recall 或发布证据。

## 建议性策略边界

## CI 无关决策边界

## 仅 FAKE 门禁边界

显式 `ata gate` 是仅 FAKE 门禁：它要求 `mode: "gate"` 与 `blockOn: ["FAKE"]`。WEAK 永不阻断，通过门禁也不证明测试是 STRONG。

`ata decision` 仅将已校验的静态汇总事实投影为 version `1` 建议性决策。它拒绝 semantic/mutation 附件和未知字段；策略/基线 ID 仅为上下文。有效决策返回 `0`，但它不是 CI 门禁、豁免、发布决定，也不能证明未标记测试是 `STRONG`。

v0.9 的 GitHub Actions 参考工作流从 PR base SHA 或手动 `base-ref` 选择变更的受支持测试文件，仅将允许字段投影到 `ata decision`，并把静态审计结果写入 Job Summary。发现项是建议性结果，不会让该工作流失败；无效输入仍以退出码 `2` 失败。它不创建 PR 评论。

可选的 `--policy` 文件是这项纯源码审计的输入。它的 advisory `disabledRuleIds` 只影响策略展示以及禁用/活跃选择计数。它绝不移除发现项，也不改变规则分类、严重性、置信度、静态汇总、FTR、Trust Score 或退出码；策略不是 CI 门禁或发布决定。无效策略输入返回退出码 `2`。

## 新增规则

先写最小失败测试，确认它因缺少的行为而失败，再添加最小 AST 谓词。规则必须有稳定 namespace ID、信息/建议中的证据边界、正向与代表性反向测试；同次改动更新本目录与英文版本。
