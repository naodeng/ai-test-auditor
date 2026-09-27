import * as ts from 'typescript';
import type { NativeAssertionBinding } from './types.js';

const nodeAssertionMethods = new Set([
  'assert',
  'ok',
  'equal',
  'notEqual',
  'deepEqual',
  'notDeepEqual',
  'strictEqual',
  'notStrictEqual',
  'deepStrictEqual',
  'notDeepStrictEqual',
  'partialDeepStrictEqual',
  'match',
  'doesNotMatch',
  'ifError',
  'throws',
  'doesNotThrow',
  'rejects',
  'doesNotReject',
  'fail',
]);

const nodeComparisonMethods = new Set([
  'equal',
  'notEqual',
  'deepEqual',
  'notDeepEqual',
  'strictEqual',
  'notStrictEqual',
  'deepStrictEqual',
  'notDeepStrictEqual',
  'partialDeepStrictEqual',
  'match',
  'doesNotMatch',
]);

const nodeAssertModules = new Set(['node:assert', 'node:assert/strict']);

export function extractNativeAssertionBindings(
  sourceFile: ts.SourceFile,
): NativeAssertionBinding[] {
  const bindings = new Map<string, NativeAssertionBinding>();

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !nodeAssertModules.has(statement.moduleSpecifier.text)
    ) {
      continue;
    }

    const importClause = statement.importClause;
    if (!importClause) continue;

    if (importClause.name) {
      bindings.set(importClause.name.text, {
        localName: importClause.name.text,
        kind: 'namespace',
      });
    }

    const namedBindings = importClause.namedBindings;
    if (!namedBindings) continue;

    if (ts.isNamespaceImport(namedBindings)) {
      bindings.set(namedBindings.name.text, {
        localName: namedBindings.name.text,
        kind: 'namespace',
      });
      continue;
    }

    for (const element of namedBindings.elements) {
      const importedName = element.propertyName
        ? ts.isIdentifier(element.propertyName) ||
          ts.isStringLiteral(element.propertyName)
          ? element.propertyName.text
          : element.name.text
        : element.name.text;
      if (importedName === 'default') {
        bindings.set(element.name.text, {
          localName: element.name.text,
          kind: 'namespace',
        });
      } else if (nodeAssertionMethods.has(importedName)) {
        bindings.set(element.name.text, {
          localName: element.name.text,
          kind: 'method',
          methodName: importedName,
        });
      }
    }
  }

  return [...bindings.values()];
}

export function nodeAssertionName(
  call: ts.CallExpression,
  bindings: readonly NativeAssertionBinding[] = [],
): string | undefined {
  if (ts.isIdentifier(call.expression)) {
    const localName = call.expression.text;
    if (localName === 'assert') return 'assert';
    const binding = bindings.find(
      (candidate) => candidate.localName === localName,
    );
    if (binding?.kind === 'method') return binding.methodName;
    if (binding?.kind === 'namespace') return 'assert';
    return undefined;
  }

  if (!ts.isPropertyAccessExpression(call.expression)) return undefined;
  if (!ts.isIdentifier(call.expression.expression)) return undefined;

  const namespaceName = call.expression.expression.text;
  const isDirectNamespace = namespaceName === 'assert';
  const isImportedNamespace = bindings.some(
    (binding) =>
      binding.localName === namespaceName && binding.kind === 'namespace',
  );
  if (!isDirectNamespace && !isImportedNamespace) {
    return undefined;
  }

  return nodeAssertionMethods.has(call.expression.name.text)
    ? call.expression.name.text
    : undefined;
}

export function isNodeComparisonMethod(methodName: string): boolean {
  return nodeComparisonMethods.has(methodName);
}
