import * as ts from 'typescript';
import {
  isNodeComparisonMethod,
  nodeAssertionName,
} from '../core/native-assertions.js';
import type {
  Classification,
  Confidence,
  Finding,
  Framework,
  NativeAssertionBinding,
  Severity,
  TestCase,
} from '../core/types.js';

export interface Assertion {
  readonly matcher: ts.CallExpression;
  readonly expected: ts.Expression | undefined;
  readonly actual: ts.Expression;
  readonly matcherName: string;
}

export function sourceFileFor(testCase: TestCase): ts.SourceFile {
  const scriptKind = testCase.filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : testCase.filePath.endsWith('.js')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;

  return ts.createSourceFile(
    testCase.filePath,
    testCase.source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

export function visitNodes(
  sourceFile: ts.Node,
  predicate: (node: ts.Node) => void,
): void {
  function visit(node: ts.Node): void {
    predicate(node);
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

export function lineFor(testCase: TestCase, node: ts.Node): number {
  const sourceFile = node.getSourceFile();
  return (
    testCase.line +
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line
  );
}

export function expectCalls(sourceFile: ts.SourceFile): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];

  visitNodes(sourceFile, (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'expect'
    ) {
      calls.push(node);
    }
  });

  return calls;
}

export function nativeAssertionCalls(
  sourceFile: ts.SourceFile,
  framework: Framework = 'unknown',
  bindings: readonly NativeAssertionBinding[] = [],
): ts.CallExpression[] {
  if (framework !== 'node-test') return [];

  const calls: ts.CallExpression[] = [];
  visitNodes(sourceFile, (node) => {
    if (!ts.isCallExpression(node)) return;
    if (nodeAssertionName(node, bindings)) calls.push(node);
  });
  return calls;
}

export function bareExpectCalls(
  sourceFile: ts.SourceFile,
): ts.CallExpression[] {
  return expectCalls(sourceFile).filter((call) => {
    const parent = call.parent;
    return !(
      ts.isPropertyAccessExpression(parent) && parent.expression === call
    );
  });
}

export function assertionCountGuards(
  sourceFile: ts.SourceFile,
): ts.CallExpression[] {
  const guards: ts.CallExpression[] = [];
  visitNodes(sourceFile, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      !ts.isIdentifier(node.expression.expression) ||
      node.expression.expression.text !== 'expect'
    ) {
      return;
    }

    if (
      node.expression.name.text === 'assertions' ||
      node.expression.name.text === 'hasAssertions'
    ) {
      guards.push(node);
    }
  });
  return guards;
}

export function assertions(
  sourceFile: ts.SourceFile,
  framework: Framework = 'unknown',
  bindings: readonly NativeAssertionBinding[] = [],
): Assertion[] {
  const found: Assertion[] = [];

  visitNodes(sourceFile, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression)
    ) {
      return;
    }

    const expectedCall = node.expression.expression;
    if (
      !ts.isCallExpression(expectedCall) ||
      !ts.isIdentifier(expectedCall.expression) ||
      expectedCall.expression.text !== 'expect'
    ) {
      return;
    }

    const actual = expectedCall.arguments[0];
    if (!actual) return;

    found.push({
      matcher: node,
      expected: node.arguments[0],
      actual,
      matcherName: node.expression.name.text,
    });
  });

  for (const matcher of nativeAssertionCalls(sourceFile, framework, bindings)) {
    const matcherName = nodeAssertionName(matcher, bindings);
    if (!matcherName || !isNodeComparisonMethod(matcherName)) continue;

    const actual = matcher.arguments[0];
    const expected = matcher.arguments[1];
    if (!actual || !expected) continue;

    found.push({ matcher, expected, actual, matcherName });
  }

  return found;
}

export function hasOnlyZeroArgumentMatchers(
  sourceFile: ts.SourceFile,
  matcherNames: readonly string[],
  actualMatches: (actual: ts.Expression) => boolean = () => true,
  framework?: Framework,
  bindings?: readonly NativeAssertionBinding[],
): boolean {
  const direct = [
    ...expectCalls(sourceFile),
    ...nativeAssertionCalls(sourceFile, framework, bindings),
  ];
  const found = assertions(sourceFile, framework, bindings);
  return (
    direct.length > 0 &&
    direct.length === found.length &&
    found.every(
      (assertion) =>
        matcherNames.includes(assertion.matcherName) &&
        assertion.matcher.arguments.length === 0 &&
        actualMatches(assertion.actual),
    )
  );
}

export function hasOnlyMatchers(
  sourceFile: ts.SourceFile,
  matcherNames: readonly string[],
  framework?: Framework,
  bindings?: readonly NativeAssertionBinding[],
): boolean {
  const direct = [
    ...expectCalls(sourceFile),
    ...nativeAssertionCalls(sourceFile, framework, bindings),
  ];
  const found = assertions(sourceFile, framework, bindings);
  return (
    direct.length > 0 &&
    direct.length === found.length &&
    found.every((assertion) => matcherNames.includes(assertion.matcherName))
  );
}

export function isSimpleLiteral(expression: ts.Expression): boolean {
  return (
    ts.isStringLiteralLike(expression) ||
    ts.isNumericLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword ||
    expression.kind === ts.SyntaxKind.NullKeyword
  );
}

export function literalKey(expression: ts.Expression): string {
  if (ts.isStringLiteralLike(expression)) return `string:${expression.text}`;
  return `${expression.kind}:${expression.getText()}`;
}

export function structuralText(expression: ts.Expression): string {
  return ts
    .createPrinter({ removeComments: true })
    .printNode(ts.EmitHint.Expression, expression, expression.getSourceFile());
}

export function structurallyIdenticalArguments(
  actual: readonly ts.Expression[],
  expected: readonly ts.Expression[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every(
      (argument, index) =>
        structuralText(argument) === structuralText(expected[index]!),
    )
  );
}

export function isUnitTest(testCase: TestCase): boolean {
  return (
    testCase.type === 'unit' ||
    (testCase.type === 'unknown' && testCase.framework !== 'playwright')
  );
}

export function finding(
  testCase: TestCase,
  node: ts.Node,
  ruleId: string,
  classification: Classification,
  severity: Severity,
  confidence: Confidence,
  message: string,
  remediation: string,
): Finding {
  return {
    ruleId,
    classification,
    severity,
    confidence,
    filePath: testCase.filePath,
    line: lineFor(testCase, node),
    message,
    remediation,
  };
}
