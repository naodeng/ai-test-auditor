# Implementation Record

## 2026-09-05 — v0.4 offline mutation evidence

Added a version `1` mutation-report adapter behind `--mutation-report`. Evidence requires an engine label, recorded command, threshold provenance, counts, and score consistency. The recorded command is never executed; threshold status is advisory and does not alter static findings, classifications, FTR, Trust Score, or exit codes.

TDD evidence: `npx vitest run tests/core/mutation.test.ts` first failed because `src/core/mutation.ts` did not exist, then passed with 4 tests after the strict parser and loader were added. `npx vitest run tests/cli.test.ts tests/reporters.test.ts` then failed for the absent CLI option and reporter section, then the focused suite passed with the mutation attachment and input-error handling.

Final validation: `npm test` passed 9 files and 61 tests; `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` passed. `node dist/cli.js review benchmarks --mutation-report /private/tmp/ata-v0.4-mutation-report.json --format json` emitted `mutation.meetsThreshold: false` and retained the benchmark's expected exit code `1` because its pre-existing static `FAKE` findings remain unchanged.

Coverage strengthening: added contract cases for unsupported versions, two-decimal score rounding, malformed and missing files, met and below-threshold rendering, a static `FAKE` exit code with mutation evidence, and a recorded command that would create a marker if executed. The focused command `npx vitest run tests/core/mutation.test.ts tests/cli.test.ts tests/reporters.test.ts` passed 28 tests; the marker was not created.

## 2026-09-04 — v0.3 offline semantic interface

Added versioned semantic-report loading and optional offline/OpenAI/Anthropic provider configuration validation. Providers are configuration-only: v0.3 neither reads credentials nor sends reviewed source over the network. Semantic inferences are advisory and do not alter static findings, classifications, scores, or exit codes.

## 2026-09-04 — TDD delivery policy

All future features, fixes, refactors, and behavior changes must follow an observed RED-GREEN-REFACTOR cycle. Material changes record the focused RED and GREEN commands alongside full-suite evidence.

## 2026-09-04 — v0.2 extraction scope

v0.2 adds nested suite labels, parameterized Jest/Vitest test extraction, parser diagnostics, and an optional basename exclusion configuration. Diagnostics only report TypeScript source-parser observations; they do not establish runtime validity.

## 2026-09-03 — License decision

The project license changed to PolyForm Noncommercial License 1.0.0. `LICENSE`, package metadata, public entry points, and contribution guidance link to the official terms. The repository does not make legal advice or commercial-use determinations.

## Scope

Initial MVP implementation in isolated worktree `codex/initial-mvp`. Requested deliverables: deterministic source-only CLI, English-first README with Chinese switch, requirements/architecture/rules/roadmap/development documentation, standalone bilingual Skill and Prompt, benchmark fixtures, CI, and process evidence.

## Design decisions

| Decision                                    | Rationale                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Static AST evidence first                   | It offers reproducible, explainable findings without pretending to observe runtime behavior. |
| `UNASSESSED`, not `STRONG`                  | No current rule match cannot prove test effectiveness.                                       |
| `FAKE` only for narrow syntax               | Prevents context-dependent suggestions from being reported as certain defects.               |
| Text projection plus complete JSON contract | Keeps human output concise while preserving the full structured result for automation.       |
| Transparent FTR and score                   | Makes the heuristic inspectable rather than presenting it as a quality measurement.          |

## Implementation sequence

1. Established TypeScript/Vitest/ESLint/Prettier/Commander scaffold and immutable audit contracts.
2. Added safe scanner and TypeScript AST extractor; review source is read, never executed.
3. Added deterministic unit/API/E2E rules and source-location contracts.
4. Added aggregation, scoring, reporters, `ata review`, and documented exit codes.
5. Added bilingual public docs, collaboration rules, Skill/prompt assets, benchmark fixtures, and CI.
6. Added `E2E001` through a red-green cycle: the rule-engine test first failed because no finding existed, then passed after the narrow rule was implemented.

## Review corrections — 2026-09-03

Final review identified narrow correctness and documentation gaps. The corrective sequence was deliberately test-first:

1. Added focused tests and observed three expected failures: UT011 flagged calls with different arguments, UT003 erased whitespace inside string literals, and the extractor used the `test(...)` start rather than a multiline callback start.
2. Changed UT011 to require structurally identical callees **and** arguments, using TypeScript AST structural text for each argument.
3. Changed UT003 to TypeScript AST structural text, which preserves literal content while normalizing source formatting through the compiler printer.
4. Made the extractor store callback start lines, so finding locations use the callback as their baseline.
5. Changed CI to accept only the benchmark audit's expected `1` exit code and fail any other exit code.
6. Corrected the report contract: text is a human-readable projection; JSON is the complete structured public result. Corrected the implementation plan to name the TypeScript compiler API, not `ts-morph`.
7. Added and linked this synchronized Chinese process record: `implementation-record_zh.md`.

## Validation evidence

| Check | Status | Evidence |
| --- | --- |
| Focused E2E001 regression | Passed | `npm test -- tests/core/rule-engine.test.ts` after observing its initial expected failure. |
| Full test suite | Passed | `npm test`: 7 files and 42 tests passed. Benchmark fixtures are intentionally excluded from Vitest execution. |
| Lint/typecheck/format/build | Passed | `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` completed successfully. |
| Built CLI JSON benchmark | Passed | `node dist/cli.js review benchmarks/api --type api --format json` emitted one `API001` `WEAK` finding and exited 0. |
| Diff whitespace check | Passed | `git diff --check` completed without output. |
| Skill structure validator | Blocked by environment | Bundled `quick_validate.py` could not start because its Python environment lacks the `yaml` module. The Skill frontmatter and `agents/openai.yaml` were manually checked and Prettier parsed the YAML. |

### Final-review validation — 2026-09-03

| Check                       | Status             | Evidence                                                                                                                                                                                                                |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused regression RED      | Passed as expected | Before implementation, `npm test -- tests/core/rule-engine.test.ts tests/core/extractor.test.ts` failed with exactly three assertions: UT011 different arguments, UT003 literal whitespace, and callback line baseline. |
| Focused regression GREEN    | Passed             | The same focused command passed after the narrow implementation changes.                                                                                                                                                |
| Full test suite             | Passed             | `npm test`: 7 files and 45 tests passed.                                                                                                                                                                                |
| Lint/typecheck/format/build | Passed             | `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` all exited 0.                                                                                                                          |
| Built CLI benchmark         | Passed             | `node dist/cli.js review benchmarks --format json` emitted the documented findings, including UT011, and returned its expected `1` exit code.                                                                           |
| CI benchmark exit policy    | Passed             | The workflow shell condition accepted the real benchmark exit `1` and rejected simulated unexpected exit `0`.                                                                                                           |
| Diff whitespace check       | Passed             | `git diff --check` completed without output.                                                                                                                                                                            |

## Known boundaries

- The tool does not run reviewed tests or validate their imports, fixtures, runtime results, coverage, or product behavior.
- The current extractor targets direct `test`/`it` callbacks rather than every framework DSL variant.
- Future LLM execution, mutation-command execution, and CI-gate enforcement remain roadmap items, not implemented features.

## Process-document policy

Future material decisions, scope changes, validation commands, failures, and unresolved risks belong in this file. Do not replace evidence with retrospective claims.
