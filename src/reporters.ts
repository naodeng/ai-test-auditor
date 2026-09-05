import type { AuditResult } from './core/types.js';

export function renderJson(result: AuditResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderText(result: AuditResult): string {
  const { summary } = result;
  const critical = result.findings.filter(
    (finding) => finding.severity === 'CRITICAL',
  ).length;
  const warning = result.findings.filter(
    (finding) => finding.severity === 'WARNING',
  ).length;
  const lines = [
    'AI Test Auditor',
    '',
    `Tests: ${summary.total} total, ${summary.assessed} assessed`,
    `Classifications: FAKE ${summary.fake} | WEAK ${summary.weak} | INVALID ${summary.invalid} | UNASSESSED ${summary.unassessed}`,
    `Fake Test Ratio: ${summary.fakeTestRatio.toFixed(2)}% (${summary.fake} / ${summary.assessed} assessed)`,
    `Trust Score: ${summary.trustScore}/100 (100 - ${critical} critical x 25 - ${warning} warning x 10)`,
    '',
  ];

  if (result.findings.length === 0) {
    lines.push(
      'No deterministic findings. Unflagged tests remain UNASSESSED; this is not evidence that they are STRONG.',
    );
  } else {
    lines.push('Findings');
    for (const finding of result.findings) {
      lines.push(
        '',
        `${finding.filePath}:${finding.line} [${finding.severity}] [${finding.classification}] ${finding.ruleId}`,
        `  ${finding.message}`,
        `  Remediation: ${finding.remediation}`,
      );
    }
  }

  if (result.diagnostics && result.diagnostics.length > 0) {
    lines.push('', 'Parser diagnostics (source syntax only)');
    for (const diagnostic of result.diagnostics) {
      lines.push(
        `${diagnostic.filePath}:${diagnostic.line} [PARSER001] ${diagnostic.message}`,
      );
    }
  }

  if (result.semantic) {
    lines.push(
      '',
      `Semantic inferences (${result.semantic.provider}; advisory only)`,
    );
    for (const inference of result.semantic.inferences) {
      lines.push(
        `${inference.filePath}:${inference.line} [${inference.confidence}] ${inference.summary}`,
      );
    }
  }

  if (result.mutation) {
    const { mutation } = result;
    lines.push(
      '',
      'Mutation evidence (advisory only)',
      `Engine: ${mutation.engine}`,
      `Command: ${mutation.command}`,
      `Score: ${mutation.result.score.toFixed(2)}% (${mutation.result.killed} killed / ${mutation.result.totalMutants} total; ${mutation.result.survived} survived)`,
      `Threshold: ${mutation.meetsThreshold ? 'met' : 'below'} (${mutation.threshold.minimumScore.toFixed(2)}%)`,
      `Threshold source: ${mutation.threshold.source}`,
    );
  }

  lines.push(
    '',
    'Static source analysis only: tests were not executed, and runtime behavior was not assessed.',
  );

  return `${lines.join('\n')}\n`;
}
