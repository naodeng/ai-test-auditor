<div align="right"><strong>English</strong> · <a href="./zh/rules.md">简体中文</a></div>

# Rule Catalog

The catalog contains 31 stable rule IDs: 10 Unit, 10 API, 10 E2E, and 1 parser rule.

## Reading a finding

Rule findings are syntactic, local, and high-confidence for the narrow pattern named by their ID. A message explains the observed pattern; it does not prove the whole test or application is defective. Use the remediation as a review starting point.

| ID        | Class   | Severity | Deterministic trigger                                                                                                                            | Does not prove                                                              |
| --------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| UT001     | FAKE    | CRITICAL | Unit/Jest/Vitest/Node `node:test` callback contains no recognized `expect(...)` or Node `assert` call.                                           | That an assertion-free test can never have value through another mechanism. |
| UT002     | FAKE    | CRITICAL | An `expect` matcher or Node native comparison assertion compares identical primitive literals.                                                   | That every constant assertion is unhelpful in its broader suite.            |
| UT003     | FAKE    | CRITICAL | A recognized matcher or Node native comparison assertion compares actual and expected expressions with identical TypeScript-AST structural text. | That semantically equivalent but differently written expressions are safe.  |
| UT008     | FAKE    | CRITICAL | A `catch` block is empty or only logs to `console`.                                                                                              | That every catch with additional work handles errors correctly.             |
| UT011     | FAKE    | CRITICAL | Both sides of a matcher or Node native comparison assertion call the same callee with structurally identical arguments.                          | That all two-call comparisons are ineffective in every context.             |
| UT004     | WEAK    | WARNING  | Every direct assertion uses zero-argument `toBeDefined` or `toBeTruthy`.                                                                         | That existence or truthiness is never the intended unit contract.           |
| API001    | WEAK    | WARNING  | Every recognized assertion targets `response.status` or `response.statusCode`.                                                                   | That status-only is always inadequate for the endpoint.                     |
| API002    | WEAK    | WARNING  | Every direct assertion checks only `response.body` or `response.data` with an existence matcher.                                                 | That body/data existence is always inadequate for the endpoint.             |
| E2E001    | FAKE    | CRITICAL | Playwright callback has no recognized `expect` call.                                                                                             | That an action-only journey cannot be useful for setup or exploration.      |
| E2E002    | WEAK    | WARNING  | Every recognized Playwright assertion uses `toHaveURL`.                                                                                          | That URL-only can never be an adequate journey outcome.                     |
| E2E003    | WEAK    | WARNING  | Every direct assertion uses zero-argument `toBeVisible`.                                                                                         | That visibility is never the intended journey outcome.                      |
| E2E004    | WEAK    | WARNING  | `page.waitForTimeout` receives a numeric literal.                                                                                                | That every fixed wait is avoidable in an external-system workflow.          |
| PARSER001 | INVALID | WARNING  | TypeScript reports a source parser diagnostic for a selected test file.                                                                          | That the test would fail or be invalid at framework runtime.                |

| UT012 | FAKE | CRITICAL | A callback contains a bare `expect(...)` call without a matcher. | That the callback has no other useful side effect. |
| UT013 | FAKE | CRITICAL | `expect.assertions(0)` appears alongside an actual matcher assertion. | That every assertion-count guard is incorrect. |
| UT014 | WEAK | WARNING | Every direct assertion only verifies mock interaction. | That interaction assertions never represent a valid unit contract. |
| UT015 | WEAK | WARNING | Every direct assertion only uses a snapshot matcher. | That snapshots are never valid regression contracts. |
| API003 | WEAK | WARNING | Every direct assertion only verifies that the `response` object exists. | That the response schema or business state is incorrect. |
| API004 | WEAK | WARNING | Every body/data assertion directly compares with a request-like value. | That the endpoint failed to transform or persist the request. |
| API005 | WEAK | WARNING | Every body/data assertion only checks property existence. | That the properties have incorrect values. |
| API006 | WEAK | WARNING | Every direct assertion only verifies that `response.headers` exists. | That the response headers are incorrect or insufficient. |
| API007 | WEAK | WARNING | Every direct assertion only checks response content-type metadata. | That the response body or business state is correct. |
| API008 | WEAK | WARNING | Every direct assertion only checks response request method or URL metadata. | That the API behavior is correct. |
| API009 | WEAK | WARNING | Every body/data assertion only checks an empty object, empty array, or zero length. | That the empty result is not the intended business outcome. |
| API010 | FAKE | CRITICAL | An API request error is swallowed by an empty or console-only `catch`. | That the request failure was unexpected in every cleanup scenario. |
| E2E005 | WEAK | WARNING | A literal selector uses a class, id, bare tag, XPath, or CSS structure form. | That a selector is unstable in the actual application. |
| E2E006 | FAKE | CRITICAL | A Playwright error is swallowed by an empty or console-only `catch`. | That the catch is wrong for a cleanup-only journey. |
| E2E007 | WEAK | WARNING | A Playwright assertion is inside an `if`, conditional, or short-circuit branch. | That the condition is invalid or every path must assert the same result. |
| E2E008 | FAKE | CRITICAL | A direct Playwright matcher expression is not awaited. | That a custom wrapper or `Promise.all` is incorrectly handling the promise. |
| E2E009 | WEAK | WARNING | An explicit page action such as `goto` or `click` is not awaited. | That later steps definitely race the action. |
| E2E010 | WEAK | WARNING | Every direct assertion only checks empty text or an empty attribute value. | That an empty UI state is not the intended journey outcome. |

## False-positive controls

- Rules operate only on extracted direct callbacks and never inspect execution results.
- `API001` and `E2E002` require the limited matcher to be the sole recognized assertion target.
- `E2E004` fires only for a literal numeric delay; variables are not flagged.
- `UT004`, `API002`, and `E2E003` require every direct assertion to be the narrow zero-argument matcher pattern; modifiers, bare expects, and mixed assertions suppress the hint.
- Node `node:test` assertion recognition is limited to direct `assert(...)`, `assert.method(...)`, and statically declared bindings from `node:assert`; wrappers and indirect helpers remain `UNASSESSED`.
- `PARSER001` reports source syntax only; it does not execute, resolve, or type-check the test at runtime.
- Unflagged tests are deliberately `UNASSESSED`.
- The v1.2 rules use bounded source forms; transformed values, stable selectors, rethrows, awaited calls, `Promise.all`, and mixed meaningful assertions are representative non-triggers.
- `ata benchmark` compares versioned source fixtures and exact finding/classification identities; it is fixture conformance evidence, not runtime quality, coverage, mutation, precision, recall, or release evidence.

## Advisory policy boundary

## CI-neutral decision boundary

## FAKE-only gate boundary

The explicit `ata gate` command is a FAKE-only gate: it requires `mode: "gate"` and `blockOn: ["FAKE"]`. WEAK never blocks, and a passed gate does not prove a test is STRONG.

`ata decision` projects only validated static summary facts into a version `1` advisory decision. It rejects semantic/mutation attachments and unknown fields; policy/baseline IDs are context only. A valid decision returns `0`, but it is not a CI gate, waiver, release decision, or proof that unflagged tests are `STRONG`.

The v0.9 GitHub Actions reference workflow selects changed supported test files from a PR base SHA or manual `base-ref`, projects only allowed fields into `ata decision`, and keeps the static audit result in the Job Summary. Findings are advisory and do not fail this workflow; malformed input still fails with exit `2`. It creates no PR comments.

An optional `--policy` file is an input to this source-only audit. Its advisory `disabledRuleIds` affect only policy presentation and disabled/active selection counts. They never remove a finding or change a rule classification, severity, confidence, static summary, FTR, Trust Score, or exit code; policy is not a CI gate or release decision. Invalid policy input exits `2`.

## Adding a rule

Write a minimal failing test, verify it fails for the missing behavior, then add the smallest AST predicate. Give the rule a stable namespace ID, an explicit evidence boundary in the message/remediation, and both positive and representative negative test cases. Update this catalog and the Chinese translation in the same change.
