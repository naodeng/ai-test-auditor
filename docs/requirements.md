<div align="right"><strong>English</strong> · <a href="./zh/requirements.md">简体中文</a></div>

# Product Requirements — v0.1

## Problem

AI-assisted development can create tests that compile, run, and increase coverage while providing little or no regression protection. The product addresses one review question: **if the production behavior were wrong, could this test fail for the intended reason?**

## Goal

Provide a local CLI that identifies a deliberately small set of high-confidence, source-only indicators of ineffective JavaScript and TypeScript tests. Every result must link to a deterministic rule, source line, explanation, and bounded remediation.

## Users and jobs

| User        | Job                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------- |
| Test author | Find obvious false-confidence patterns before review.                                        |
| Reviewer    | Obtain stable source evidence and a suggested remediation.                                   |
| CI owner    | Consume JSON or exit code as an advisory policy input.                                       |
| Agent user  | Use a bilingual Skill to review supplied test source without fabricating execution evidence. |

## In scope

- Node.js 20+ CLI: `ata review [path] --type unit|api|e2e|auto --format text|json [--changed-since <local-ref>] [--policy <path>] [--baseline <path>]`.
- `ata decision <envelope.json>` converts a strict local version `1` static snapshot into an advisory JSON result. It rejects unknown fields and semantic/mutation attachments; valid decisions return `0` and are not a CI gate.
- `ata gate <policy.json> <audit.json>` is an explicit opt-in, FAKE-only static gate. It blocks only `FAKE`, never executes reviewed source, and returns `0`, `1`, or `2` for passed, blocked, or invalid input.
- AST extraction from supported JS, TS, and TSX test-source conventions.
- Deterministic rules in the public catalog.
- Text and JSON reports, source locations, FTR, and a transparent heuristic score.
- Changed-file selection against a local commit, limited to current supported test files; it does not infer production-code-to-test relevance.
- A supplied version `1` advisory policy may report disabled/active selection counts only. It does not change static classifications, summary values, FTR, Trust Score, or exit semantics.
- A supplied version `1` baseline may report historical/new finding identity counts only. Historical does not accept a finding or change static classifications, summary values, FTR, Trust Score, policy counts, or exit semantics; invalid baseline input exits `2`.
- A supplied, versioned semantic report may be validated and displayed as offline advisory evidence; no model is executed and it does not change static classifications or exit semantics.
- English-first public documentation, Chinese translation, benchmark fixtures, CI, and standalone Skill assets.
- The GitHub Actions reference workflow accepts a PR base SHA or manual `base-ref`, selects changed supported test files, and publishes advisory output without becoming a gate.
- `ata benchmark [manifest] --format text|json` validates a version `1` source-only benchmark manifest. It compares exact expected rule/classification identities and explicit non-triggers; it does not import or execute fixture source. `npm run benchmark` runs the repository corpus.
- `--locale <en|zh-CN>` localizes text and HTML labels and catalog copy. JSON remains schema-compatible and keeps the raw finding fields.
- Audit config accepts legacy JSON without a version and normalizes it to version `1`; unknown fields, empty include/exclude patterns, and unsupported semantic provider values are invalid input.

## Out of scope

- Executing a test, importing test code, resolving runtime dependencies, or proving a test is runnable.
- Executing an LLM, generating semantic intent inferences, running mutation testing, coverage analysis, flaky-test detection, or GitHub PR annotations. A supplied mutation-evidence artifact may be validated and displayed, but is not executed or treated as a gate.
- A `STRONG` classification based on absence of static findings.
- Framework support beyond the documented direct Jest/Vitest/Playwright/Node `node:test` callback conventions.

## Classification contract

| Classification | Current meaning                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `FAKE`         | Deterministic source evidence indicates no meaningful regression protection for the checked pattern.             |
| `WEAK`         | A deterministic, limited assertion pattern was found; context may make it sufficient, so review is required.     |
| `INVALID`      | A selected test source has a parser diagnostic (`PARSER001`); this is source-syntax evidence, not runtime proof. |
| `UNASSESSED`   | No current deterministic rule applied. It is not a quality endorsement.                                          |
| `STRONG`       | Reserved future classification; v0.1 never emits it.                                                             |

## Acceptance criteria

- A supported file or directory is scanned without executing its source.
- Each emitted finding carries rule ID, classification, severity, confidence, file path, line, message, and remediation.
- The text report is a human-readable projection of the audit result; JSON contains the complete structured public result contract.
- Exit codes are `0` for no `FAKE`, `1` for one or more `FAKE`, and `2` for invalid command, invalid policy, input, semantic/mutation report, or selected source syntax.
- The README, Chinese README, rule catalog, architecture, roadmap, development guide, process record, and Skill assets describe only implemented behavior.

## Success signals and limits

The MVP is successful when maintainers can reproduce findings on benchmark source and understand why a rule fired. FTR and Trust Score are prioritization heuristics, not success metrics for production quality.
