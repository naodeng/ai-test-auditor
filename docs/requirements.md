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

- Node.js 20+ CLI: `ata review [path] --type unit|api|e2e|auto --format text|json`.
- AST extraction from supported JS, TS, and TSX test-source conventions.
- Deterministic rules in the public catalog.
- Text and JSON reports, source locations, FTR, and a transparent heuristic score.
- English-first public documentation, Chinese translation, benchmark fixtures, CI, and standalone Skill assets.

## Out of scope

- Executing a test, importing test code, resolving runtime dependencies, or proving a test is runnable.
- LLM assessment, semantic intent inference, running mutation testing, coverage analysis, flaky-test detection, or GitHub PR annotations. A supplied mutation-evidence artifact may be validated and displayed, but is not executed or treated as a gate.
- A `STRONG` classification based on absence of static findings.
- Framework support beyond the documented direct Jest/Vitest/Playwright callback conventions.

## Classification contract

| Classification | v0.1 meaning                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `FAKE`         | Deterministic source evidence indicates no meaningful regression protection for the checked pattern.         |
| `WEAK`         | A deterministic, limited assertion pattern was found; context may make it sufficient, so review is required. |
| `INVALID`      | Reserved for future executable or parser validation; v0.1 static rules do not emit it.                       |
| `UNASSESSED`   | No current deterministic rule applied. It is not a quality endorsement.                                      |
| `STRONG`       | Reserved future classification; v0.1 never emits it.                                                         |

## Acceptance criteria

- A supported file or directory is scanned without executing its source.
- Each emitted finding carries rule ID, classification, severity, confidence, file path, line, message, and remediation.
- The text report is a human-readable projection of the audit result; JSON contains the complete structured public result contract.
- Exit codes are `0` for no `FAKE`, `1` for one or more `FAKE`, and `2` for invalid command/input.
- The README, Chinese README, rule catalog, architecture, roadmap, development guide, process record, and Skill assets describe only implemented behavior.

## Success signals and limits

The MVP is successful when maintainers can reproduce findings on benchmark source and understand why a rule fired. FTR and Trust Score are prioritization heuristics, not success metrics for production quality.
