import { describe, expect, it } from 'vitest';
import { evaluateRules } from '../../src/core/rule-engine';
import type { Framework, TestCase, TestType } from '../../src/core/types';

function testCase(
  body: string,
  options: {
    readonly framework?: Framework;
    readonly type?: TestType;
    readonly line?: number;
    readonly filePath?: string;
  } = {},
): TestCase {
  return {
    filePath: options.filePath ?? 'tests/example.test.ts',
    name: 'example',
    framework: options.framework ?? 'vitest',
    type: options.type ?? 'unit',
    line: options.line ?? 10,
    source: `() => ${body}`,
    body,
  };
}

function ids(test: TestCase): string[] {
  return evaluateRules(test).map((finding) => finding.ruleId);
}

describe('evaluateRules', () => {
  it('reports UT001 for a unit test with no assertion', () => {
    const findings = evaluateRules(
      testCase('{\n  const result = add(1, 2);\n}'),
    );

    expect(findings).toMatchObject([
      {
        ruleId: 'UT001',
        classification: 'FAKE',
        severity: 'CRITICAL',
        confidence: 'HIGH',
        filePath: 'tests/example.test.ts',
        line: 10,
      },
    ]);
    expect(findings[0]?.message).toContain('Static analysis');
    expect(findings[0]?.remediation).toContain('Static analysis');
  });

  it('does not report UT001 when a unit test calls expect', () => {
    expect(ids(testCase('{\n  expect(add(1, 2)).toBe(3);\n}'))).not.toContain(
      'UT001',
    );
  });

  it('recognizes Node native assertions as assertions', () => {
    const nodeTest = testCase('{ assert.strictEqual(3, 3); }', {
      framework: 'node-test',
      type: 'unknown',
    });

    expect(ids(nodeTest)).not.toContain('UT001');
    expect(ids(nodeTest)).toContain('UT002');
  });

  it('preserves Node native actual and expected argument order', () => {
    const nodeTest = testCase('{ assert.strictEqual(add(1, 2), 3); }', {
      framework: 'node-test',
      type: 'unknown',
    });

    expect(ids(nodeTest)).not.toContain('UT002');
    expect(ids(nodeTest)).not.toContain('UT003');
    expect(ids(nodeTest)).not.toContain('UT011');
  });

  it('does not treat a same-named application function as a Node assertion', () => {
    const nodeTest = testCase('{ fail(); }', {
      framework: 'node-test',
      type: 'unknown',
    });

    expect(ids(nodeTest)).toContain('UT001');
  });

  it('does not report UT001 for a normal TSX test callback with JSX before expect', () => {
    expect(
      ids(
        testCase(
          '{ const banner = <section>{label}</section>; expect(1).toBe(1); }',
          { filePath: 'tests/example.test.tsx' },
        ),
      ),
    ).not.toContain('UT001');
  });

  it('reports UT012 for a bare expect call but not for a normal matcher', () => {
    expect(ids(testCase('{ expect(result); }'))).toContain('UT012');
    expect(
      ids(testCase('{ expect(result).toEqual(expected); }')),
    ).not.toContain('UT012');
  });

  it('reports UT013 only when assertions(0) contradicts an actual matcher', () => {
    expect(
      ids(testCase('{ expect.assertions(0); expect(result).toBe(expected); }')),
    ).toContain('UT013');
    expect(
      ids(testCase('{ expect.assertions(1); expect(result).toBe(expected); }')),
    ).not.toContain('UT013');
    expect(
      ids(
        testCase('{ expect.hasAssertions(); expect(result).toBe(expected); }'),
      ),
    ).not.toContain('UT013');
  });

  it('reports UT014 only for mock-interaction-only assertions', () => {
    expect(ids(testCase('{ expect(mock).toHaveBeenCalled(); }'))).toContain(
      'UT014',
    );
    expect(
      ids(
        testCase(
          '{ expect(mock).toHaveBeenCalledWith(input); expect(result).toEqual(expected); }',
        ),
      ),
    ).not.toContain('UT014');
  });

  it('reports UT015 only for snapshot-only assertions', () => {
    expect(ids(testCase('{ expect(value).toMatchSnapshot(); }'))).toContain(
      'UT015',
    );
    expect(
      ids(
        testCase(
          '{ expect(value).toMatchSnapshot(); expect(value.id).toBe(expected); }',
        ),
      ),
    ).not.toContain('UT015');
  });

  it('reports UT002 with the literal assertion line', () => {
    const findings = evaluateRules(testCase('{\n  expect(200).toBe(200);\n}'));

    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: 'UT002', line: 11 }),
    );
  });

  it('does not report UT002 when literal expected and actual values differ', () => {
    expect(
      ids(testCase("{\n  expect(result).toBe('ready');\n}")),
    ).not.toContain('UT002');
  });

  it('reports UT003 when the same non-literal expression is asserted against itself', () => {
    expect(
      ids(
        testCase('{\n  expect(response.body.id).toEqual(response.body.id);\n}'),
      ),
    ).toContain('UT003');
  });

  it('does not report UT003 when the assertion compares different expressions', () => {
    expect(
      ids(testCase('{\n  expect(response.body.id).toEqual(expected.id);\n}')),
    ).not.toContain('UT003');
  });

  it('does not report UT003 when string literal whitespace differs', () => {
    expect(
      ids(testCase("{\n  expect(format('a b')).toEqual(format('ab'));\n}")),
    ).not.toContain('UT003');
  });

  it('reports UT008 for an empty catch block and a catch block that only logs', () => {
    const findings = evaluateRules(
      testCase(
        '{\n  try {\n    await save();\n  } catch {}\n  try {\n    await save();\n  } catch (error) {\n    console.error(error);\n  }\n}',
      ),
    ).filter((finding) => finding.ruleId === 'UT008');

    expect(findings).toMatchObject([
      { line: 13, severity: 'CRITICAL' },
      { line: 16, severity: 'CRITICAL' },
    ]);
  });

  it('does not report UT008 when the catch block rethrows', () => {
    expect(
      ids(
        testCase(
          '{\n  try { await save(); } catch (error) { throw error; }\n}',
        ),
      ),
    ).not.toContain('UT008');
  });

  it('reports UT011 when expected and actual call the same callee with identical arguments', () => {
    expect(
      ids(
        testCase(
          '{\n  expect(service.get(' +
            "'a'" +
            ")).toEqual(service.get('a'));\n}",
        ),
      ),
    ).toContain('UT011');
  });

  it('does not report UT011 when the same callee receives different arguments', () => {
    expect(
      ids(
        testCase("{\n  expect(service.get('a')).toEqual(service.get('b'));\n}"),
      ),
    ).not.toContain('UT011');
  });

  it('does not report UT011 when expected and actual call different callees', () => {
    expect(
      ids(
        testCase("{\n  expect(service.get('a')).toEqual(factory.get('a'));\n}"),
      ),
    ).not.toContain('UT011');
  });

  it("reports API001 only when status is the test's sole assertion target", () => {
    expect(
      ids(
        testCase('{\n  expect(response.statusCode).toBe(201);\n}', {
          type: 'api',
        }),
      ),
    ).toContain('API001');
    expect(
      ids(
        testCase(
          "{\n  expect(response.status).toBe(200);\n  expect(response.body.id).toBe('a');\n}",
          { type: 'api' },
        ),
      ),
    ).not.toContain('API001');
  });

  it('reports API003 for response-object existence only', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response).toBeDefined();
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API003');
    expect(
      ids(
        testCase(
          `{
  expect(response).toBeDefined();
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API003');
  });

  it('reports API004 for request-echo-only response assertions', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual(requestBody);
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API004');
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual(requestPayload.map(normalize));
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API004');
  });

  it('reports API005 for body property-presence-only assertions', () => {
    expect(
      ids(
        testCase("{ expect(response.body).toHaveProperty('id'); }", {
          type: 'api',
        }),
      ),
    ).toContain('API005');
    expect(
      ids(
        testCase(
          "{ expect(response.body).toHaveProperty('id', expectedId); }",
          {
            type: 'api',
          },
        ),
      ),
    ).not.toContain('API005');
  });

  it('reports API006 for response-headers existence only', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response.headers).toBeDefined();
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API006');
    expect(
      ids(
        testCase(
          `{
  expect(response.headers).toBeDefined();
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API006');
  });

  it('reports API007 for content-type-only metadata assertions', () => {
    expect(
      ids(
        testCase(
          "{ expect(response.headers.get('content-type')).toContain('json'); }",
          {
            type: 'api',
          },
        ),
      ),
    ).toContain('API007');
    expect(
      ids(
        testCase(
          `{
  expect(response.headers.get('content-type')).toContain('json');
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API007');
  });

  it('reports API008 for response request metadata only', () => {
    expect(
      ids(
        testCase("{ expect(response.request.method()).toBe('POST'); }", {
          type: 'api',
        }),
      ),
    ).toContain('API008');
    expect(
      ids(
        testCase(
          `{
  expect(response.request.method()).toBe('POST');
  expect(response.body.id).toBe(expectedId);
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API008');
  });

  it('reports API009 for empty response results only', () => {
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual({});
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API009');
    expect(
      ids(
        testCase(
          `{
  expect(response.body).toEqual({ id: expectedId });
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API009');
  });

  it('reports API010 when an API request error is swallowed', () => {
    expect(
      ids(
        testCase(
          `{
  try { await request.get("/items"); } catch (error) { console.error(error); }
}`,
          { type: 'api' },
        ),
      ),
    ).toContain('API010');
    expect(
      ids(
        testCase(
          `{
  try { await request.get("/items"); } catch (error) { throw error; }
}`,
          { type: 'api' },
        ),
      ),
    ).not.toContain('API010');
  });

  it("reports E2E002 only when URL is the test's sole assertion matcher", () => {
    expect(
      ids(
        testCase("{\n  await expect(page).toHaveURL('/checkout');\n}", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E002');
    expect(
      ids(
        testCase(
          "{\n  await expect(page).toHaveURL('/checkout');\n  await expect(page.getByRole('heading')).toBeVisible();\n}",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E002');
  });

  it('reports E2E001 when a Playwright journey has no assertion', () => {
    expect(
      ids(
        testCase(
          "{ await page.goto('/checkout'); await page.getByRole('button', { name: 'Pay' }).click(); }",
          {
            framework: 'playwright',
            type: 'e2e',
          },
        ),
      ),
    ).toContain('E2E001');
  });

  it('reports E2E004 for a numeric Playwright waitForTimeout but not a variable timeout', () => {
    expect(
      ids(
        testCase('{\n  await page.waitForTimeout(500);\n}', {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E004');
    expect(
      ids(
        testCase('{\n  await page.waitForTimeout(retryDelay);\n}', {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E004');
  });

  it('reports E2E005 for unstable literal selectors but not explicit selectors', () => {
    expect(
      ids(
        testCase("{ page.locator('.checkout-button'); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E005');
    expect(
      ids(
        testCase(
          `{
  page.locator('[data-testid="checkout"]');
  page.getByRole('button', { name: 'Checkout' });
}`,
          {
            framework: 'playwright',
            type: 'e2e',
          },
        ),
      ),
    ).not.toContain('E2E005');
  });

  it('reports E2E006 when a Playwright error is swallowed', () => {
    const finding = evaluateRules(
      testCase(
        '{ try { await page.goto("/"); } catch (error) { console.error(error); } }',
        { framework: 'playwright', type: 'e2e' },
      ),
    ).find((item) => item.ruleId === 'E2E006');
    expect(finding).toMatchObject({
      classification: 'FAKE',
      severity: 'CRITICAL',
      confidence: 'HIGH',
    });
    expect(
      ids(
        testCase(
          '{ try { await page.goto("/"); } catch (error) { throw error; } }',
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E006');
  });

  it('reports E2E007 when an assertion is conditional', () => {
    expect(
      ids(
        testCase(
          "{ if (ready) await expect(page.getByRole('heading')).toBeVisible(); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E007');
    expect(
      ids(
        testCase("{ await expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E007');
    expect(
      ids(
        testCase(
          "{ ready && (await expect(page.getByRole('heading')).toBeVisible()); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).toContain('E2E007');
  });

  it('reports E2E008 for direct unawaited matchers but not wrappers', () => {
    expect(
      ids(
        testCase("{ expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E008');
    expect(
      ids(
        testCase("{ await expect(page.getByRole('heading')).toBeVisible(); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E008');
    expect(
      ids(
        testCase(
          "{ await Promise.all([expect(page.getByRole('heading')).toBeVisible()]); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E008');
  });

  it('reports E2E009 for explicit page actions without await', () => {
    expect(
      ids(
        testCase("{ page.click('#submit'); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).toContain('E2E009');
    expect(
      ids(
        testCase("{ await page.click('#submit'); }", {
          framework: 'playwright',
          type: 'e2e',
        }),
      ),
    ).not.toContain('E2E009');
  });

  it('reports E2E010 for empty text or attribute assertions only', () => {
    expect(
      ids(
        testCase(
          `{
  await expect(page.getByRole('status')).toHaveText('');
  await expect(page.getByRole('status')).toHaveAttribute('aria-label', '');
}`,
          {
            framework: 'playwright',
            type: 'e2e',
          },
        ),
      ),
    ).toContain('E2E010');
    expect(
      ids(
        testCase(
          "{ await expect(page.getByRole('status')).toHaveText('Ready'); }",
          { framework: 'playwright', type: 'e2e' },
        ),
      ),
    ).not.toContain('E2E010');
  });

  it('keeps API and E2E findings weak high-confidence warnings', () => {
    const cases = [
      testCase('{\n  expect(response.status).toBe(200);\n}', { type: 'api' }),
      testCase("{\n  await expect(page).toHaveURL('/');\n}", {
        framework: 'playwright',
        type: 'e2e',
      }),
      testCase(
        "{\n  await page.waitForTimeout(10);\n  await expect(page).toHaveTitle('Checkout');\n}",
        {
          framework: 'playwright',
          type: 'e2e',
        },
      ),
    ];

    for (const auditCase of cases) {
      for (const finding of evaluateRules(auditCase)) {
        expect(finding).toMatchObject({
          classification: 'WEAK',
          severity: 'WARNING',
          confidence: 'HIGH',
        });
      }
    }
  });

  it.each([
    ['UT001', testCase('{\n  run();\n}'), 'UT001', 10],
    ['UT002', testCase('{\n  expect(true).toBe(true);\n}'), 'UT002', 11],
    [
      'UT003',
      testCase('{\n  expect(result.value).toEqual(result.value);\n}'),
      'UT003',
      11,
    ],
    [
      'UT008',
      testCase('{\n  try { run(); } catch (error) { console.warn(error); }\n}'),
      'UT008',
      11,
    ],
    [
      'UT011',
      testCase("{\n  expect(sut.read('a')).toEqual(sut.read('a'));\n}"),
      'UT011',
      11,
    ],
    [
      'API001',
      testCase('{\n  expect(response.status).toBe(200);\n}', { type: 'api' }),
      'API001',
      11,
    ],
    [
      'E2E001',
      testCase("{ await page.goto('/'); }", {
        framework: 'playwright',
        type: 'e2e',
      }),
      'E2E001',
      10,
    ],
    [
      'E2E002',
      testCase("{\n  await expect(page).toHaveURL('/');\n}", {
        framework: 'playwright',
        type: 'e2e',
      }),
      'E2E002',
      11,
    ],
    [
      'E2E004',
      testCase('{\n  await page.waitForTimeout(1);\n}', {
        framework: 'playwright',
        type: 'e2e',
      }),
      'E2E004',
      11,
    ],
  ])('preserves the source line for %s', (_name, auditCase, ruleId, line) => {
    expect(evaluateRules(auditCase)).toContainEqual(
      expect.objectContaining({ ruleId, line }),
    );
  });
});
