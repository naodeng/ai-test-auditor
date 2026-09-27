import * as ts from 'typescript';
import type { Finding, TestCase } from '../core/types.js';
import {
  assertions,
  assertionCountGuards,
  bareExpectCalls,
  expectCalls,
  hasOnlyMatchers,
  hasOnlyZeroArgumentMatchers,
  finding,
  isSimpleLiteral,
  isUnitTest,
  literalKey,
  nativeAssertionCalls,
  sourceFileFor,
  structuralText,
  structurallyIdenticalArguments,
  visitNodes,
} from './utils.js';

const fakeMessage = (detail: string): string =>
  `${detail} Static analysis inspects source syntax only and cannot prove runtime behavior.`;

const fakeRemediation = (detail: string): string =>
  `${detail} Static analysis cannot determine whether the revised assertion covers every behavior path.`;

export function evaluateUnitRules(testCase: TestCase): Finding[] {
  if (!isUnitTest(testCase)) return [];

  const sourceFile = sourceFileFor(testCase);
  const findings: Finding[] = [];
  const nativeBindings = testCase.nativeAssertionBindings ?? [];
  const testAssertions = assertions(
    sourceFile,
    testCase.framework,
    nativeBindings,
  );

  if (
    expectCalls(sourceFile).length === 0 &&
    nativeAssertionCalls(sourceFile, testCase.framework, nativeBindings)
      .length === 0
  ) {
    findings.push(
      finding(
        testCase,
        sourceFile,
        'UT001',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage(
          'UT001 found no recognized expect or Node native assert call in this test.',
        ),
        fakeRemediation(
          'Add an assertion for an observable behavior or side effect.',
        ),
      ),
    );
  }

  const bareExpect = bareExpectCalls(sourceFile)[0];
  if (bareExpect) {
    findings.push(
      finding(
        testCase,
        bareExpect,
        'UT012',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage('UT012 calls expect without a matcher assertion.'),
        fakeRemediation(
          'Use a matcher that compares an observed value with an independently derived expectation.',
        ),
      ),
    );
  }

  const zeroAssertionGuard = assertionCountGuards(sourceFile).find(
    (guard) =>
      guard.expression.getText() === 'expect.assertions' &&
      guard.arguments.length === 1 &&
      guard.arguments[0]?.kind === ts.SyntaxKind.NumericLiteral &&
      guard.arguments[0].getText() === '0',
  );
  if (zeroAssertionGuard && testAssertions.length > 0) {
    findings.push(
      finding(
        testCase,
        zeroAssertionGuard,
        'UT013',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage(
          'UT013 declares zero expected assertions while also containing a matcher assertion.',
        ),
        fakeRemediation(
          'Set the assertion count to the actual number of assertions or remove the contradictory guard.',
        ),
      ),
    );
  }

  if (
    hasOnlyMatchers(
      sourceFile,
      [
        'toHaveBeenCalled',
        'toHaveBeenCalledTimes',
        'toHaveBeenCalledWith',
        'toHaveBeenLastCalledWith',
        'toHaveBeenNthCalledWith',
      ],
      testCase.framework,
      nativeBindings,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'UT014',
        'WEAK',
        'WARNING',
        'HIGH',
        fakeMessage(
          'UT014 verifies only mock interaction and does not show a value or state outcome.',
        ),
        fakeRemediation(
          'Add a value, state, or observable effect assertion when the interaction alone is not the intended contract.',
        ),
      ),
    );
  }

  if (
    hasOnlyMatchers(
      sourceFile,
      ['toMatchSnapshot', 'toMatchInlineSnapshot'],
      testCase.framework,
      nativeBindings,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'UT015',
        'WEAK',
        'WARNING',
        'HIGH',
        fakeMessage(
          'UT015 verifies only a snapshot representation. Static analysis cannot determine whether the snapshot is an adequate oracle.',
        ),
        fakeRemediation(
          'Add an independently meaningful value, state, or effect assertion when snapshot coverage alone is insufficient.',
        ),
      ),
    );
  }

  if (
    hasOnlyZeroArgumentMatchers(
      sourceFile,
      ['toBeDefined', 'toBeTruthy'],
      () => true,
      testCase.framework,
      nativeBindings,
    )
  ) {
    findings.push(
      finding(
        testCase,
        testAssertions[0]!.matcher,
        'UT004',
        'WEAK',
        'WARNING',
        'HIGH',
        fakeMessage('UT004 verifies only that a value is defined or truthy.'),
        fakeRemediation(
          'Add an independently meaningful value, state, or effect assertion.',
        ),
      ),
    );
  }

  for (const assertion of testAssertions) {
    const expected = assertion.expected;
    if (
      expected &&
      isSimpleLiteral(assertion.actual) &&
      isSimpleLiteral(expected) &&
      literalKey(assertion.actual) === literalKey(expected)
    ) {
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT002',
          'FAKE',
          'CRITICAL',
          'HIGH',
          fakeMessage(
            'UT002 compares the same literal value on both sides of an assertion.',
          ),
          fakeRemediation(
            'Derive the expected literal independently from the behavior under test.',
          ),
        ),
      );
    }

    if (
      expected &&
      !isSimpleLiteral(assertion.actual) &&
      structuralText(assertion.actual) === structuralText(expected)
    ) {
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT003',
          'FAKE',
          'CRITICAL',
          'HIGH',
          fakeMessage(
            'UT003 asserts an expression against the identical expression.',
          ),
          fakeRemediation(
            'Compare the observed value with an independently derived expected value.',
          ),
        ),
      );
    }

    if (
      expected &&
      ts.isCallExpression(assertion.actual) &&
      ts.isCallExpression(expected) &&
      structuralText(assertion.actual.expression) ===
        structuralText(expected.expression) &&
      structurallyIdenticalArguments(
        assertion.actual.arguments,
        expected.arguments,
      )
    ) {
      findings.push(
        finding(
          testCase,
          assertion.matcher,
          'UT011',
          'FAKE',
          'CRITICAL',
          'HIGH',
          fakeMessage(
            'UT011 calls the same callee with structurally identical arguments for both actual and expected values.',
          ),
          fakeRemediation(
            'Call the system under test once and compare its result with an independent expectation.',
          ),
        ),
      );
    }
  }

  visitNodes(sourceFile, (node) => {
    if (!ts.isCatchClause(node)) return;

    const statements = node.block.statements;
    const onlyLogs =
      statements.length === 0 || statements.every(isConsoleLoggingStatement);
    if (!onlyLogs) return;

    findings.push(
      finding(
        testCase,
        node,
        'UT008',
        'FAKE',
        'CRITICAL',
        'HIGH',
        fakeMessage(
          'UT008 catches an error without throwing it and only leaves it empty or logs it.',
        ),
        fakeRemediation(
          'Assert the failure behavior or rethrow the error so an unexpected failure can fail the test.',
        ),
      ),
    );
  });

  return findings;
}

function isConsoleLoggingStatement(statement: ts.Statement): boolean {
  if (
    !ts.isExpressionStatement(statement) ||
    !ts.isCallExpression(statement.expression)
  ) {
    return false;
  }

  const expression = statement.expression.expression;
  return (
    ts.isPropertyAccessExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'console' &&
    ['debug', 'error', 'info', 'log', 'warn'].includes(expression.name.text)
  );
}
