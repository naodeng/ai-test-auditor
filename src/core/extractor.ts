import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';
import { extractNativeAssertionBindings } from './native-assertions.js';
import type {
  ExtractionResult,
  Framework,
  ParserDiagnostic,
  TestCase,
} from './types.js';

const frameworkModules: Readonly<Record<string, Framework>> = {
  '@jest/globals': 'jest',
  '@playwright/test': 'playwright',
  jest: 'jest',
  'node:test': 'node-test',
  vitest: 'vitest',
};

function scriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filePath.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function inferFramework(sourceFile: ts.SourceFile): Framework {
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue;
    }

    const framework = frameworkModules[statement.moduleSpecifier.text];
    if (framework) return framework;
  }

  return 'unknown';
}

function callbackFor(
  call: ts.CallExpression,
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  return call.arguments.find(
    (argument): argument is ts.ArrowFunction | ts.FunctionExpression =>
      ts.isArrowFunction(argument) || ts.isFunctionExpression(argument),
  );
}

function testName(call: ts.CallExpression): string | undefined {
  const name = call.arguments[0];
  return name && ts.isStringLiteralLike(name) ? name.text : undefined;
}

export function extractTests(filePath: string): TestCase[] {
  return [...extractTestsWithDiagnostics(filePath).tests];
}

export function extractTestsWithDiagnostics(
  filePath: string,
): ExtractionResult {
  const absolutePath = resolve(filePath);
  const sourceFile = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    scriptKind(absolutePath),
  );
  const framework = inferFramework(sourceFile);
  const nativeAssertionBindings = extractNativeAssertionBindings(sourceFile);
  const tests: TestCase[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const name = testName(node);
      const callback = callbackFor(node);

      if (isTestInvocation(node) && name && callback) {
        tests.push({
          filePath: absolutePath,
          name: [...suiteNames(node), name].join(' > '),
          framework,
          type: framework === 'playwright' ? 'e2e' : 'unknown',
          line:
            sourceFile.getLineAndCharacterOfPosition(
              callback.getStart(sourceFile),
            ).line + 1,
          source: callback.getText(sourceFile),
          body: callback.body.getText(sourceFile),
          ...(nativeAssertionBindings.length > 0
            ? { nativeAssertionBindings }
            : {}),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  const parseDiagnostics = (
    sourceFile as ts.SourceFile & {
      readonly parseDiagnostics: readonly ts.DiagnosticWithLocation[];
    }
  ).parseDiagnostics;
  const diagnostics: ParserDiagnostic[] = parseDiagnostics.map(
    (diagnostic) => ({
      filePath: absolutePath,
      line:
        sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line +
        1,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    }),
  );
  return { tests, diagnostics };
}

function isTestInvocation(call: ts.CallExpression): boolean {
  if (ts.isIdentifier(call.expression)) {
    return call.expression.text === 'test' || call.expression.text === 'it';
  }
  if (!ts.isCallExpression(call.expression)) return false;
  const callee = call.expression.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    (callee.expression.getText() === 'test' ||
      callee.expression.getText() === 'it') &&
    callee.name.text === 'each'
  );
}

function suiteNames(node: ts.Node): string[] {
  const names: string[] = [];
  let current = node.parent;
  while (current) {
    if (ts.isCallExpression(current) && isDescribeInvocation(current)) {
      const name = testName(current);
      if (name) names.unshift(name);
    }
    current = current.parent;
  }
  return names;
}

function isDescribeInvocation(call: ts.CallExpression): boolean {
  if (ts.isIdentifier(call.expression))
    return call.expression.text === 'describe';
  return (
    ts.isPropertyAccessExpression(call.expression) &&
    (call.expression.expression.getText() === 'test' ||
      call.expression.expression.getText() === 'describe') &&
    call.expression.name.text === 'describe'
  );
}
