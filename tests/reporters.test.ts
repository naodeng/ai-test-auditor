import { describe, expect, it } from 'vitest';
import { renderHtml, renderJson, renderText } from '../src/reporters';
import type { AuditResult } from '../src/core/types';

const result: AuditResult = {
  tests: [
    {
      filePath: '/repo/example.test.ts',
      name: 'example',
      framework: 'vitest',
      type: 'unit',
      line: 4,
      source: '() => { expect(true).toBe(true); }',
      body: '{ expect(true).toBe(true); }',
    },
  ],
  findings: [
    {
      ruleId: 'UT002',
      severity: 'CRITICAL',
      classification: 'FAKE',
      confidence: 'HIGH',
      filePath: '/repo/example.test.ts',
      line: 4,
      message: 'The same literal appears on both sides.',
      remediation: 'Use an independent expected value.',
    },
  ],
  summary: {
    total: 1,
    assessed: 1,
    fake: 1,
    weak: 0,
    invalid: 0,
    unassessed: 0,
    fakeTestRatio: 100,
    trustScore: 75,
  },
};

describe('reporters', () => {
  it('renders findings and transparent FTR and score formulas as text', () => {
    const output = renderText(result);

    expect(output).toContain('Fake Test Ratio: 100.00% (1 / 1 assessed)');
    expect(output).toContain(
      'Trust Score: 75/100 (100 - 1 critical x 25 - 0 warning x 10)',
    );
    expect(output).toContain('/repo/example.test.ts:4');
    expect(output).toContain('[CRITICAL] [FAKE] UT002');
    expect(output).toContain('Static source analysis only');
  });

  it('localizes text labels and catalog-backed finding copy', () => {
    const output = renderText(result, 'zh-CN');

    expect(output).toContain('静态审计项：1 总计，1 已评估');
    expect(output).toContain('虚假测试');
    expect(output).toContain('仅静态源码分析');
    expect(output).toContain(
      'UT002：matcher 或 Node 原生比较断言两侧比较相同的基本字面量。',
    );
  });

  it('warns that no findings do not make tests strong', () => {
    const output = renderText({
      tests: result.tests,
      findings: [],
      summary: {
        ...result.summary,
        assessed: 0,
        fake: 0,
        unassessed: 1,
        fakeTestRatio: 0,
        trustScore: 100,
      },
    });

    expect(output).toContain('UNASSESSED');
    expect(output).toContain('not evidence that they are STRONG');
  });

  it('distinguishes parser audit items from extracted test cases', () => {
    const output = renderText({
      tests: [],
      findings: [
        {
          ruleId: 'PARSER001',
          severity: 'WARNING',
          classification: 'INVALID',
          confidence: 'HIGH',
          filePath: '/repo/broken.test.ts',
          line: 1,
          message: 'Source syntax is invalid.',
          remediation: 'Fix the syntax.',
        },
      ],
      summary: {
        total: 1,
        assessed: 1,
        fake: 0,
        weak: 0,
        invalid: 1,
        unassessed: 0,
        fakeTestRatio: 0,
        trustScore: 90,
      },
    });

    expect(output).toContain('Audit items: 1 total, 1 assessed');
    expect(output).toContain('Extracted test cases: 0');
  });

  it('renders the complete audit result as parseable JSON', () => {
    expect(JSON.parse(renderJson(result))).toEqual(result);
  });

  it('renders a standalone filterable HTML report without test source', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          {
            ...result.findings[0]!,
            ruleId: 'E2E001',
            severity: 'CRITICAL',
            classification: 'FAKE',
          },
        ],
      },
      'zh-CN',
    );
    expect(output).toContain('<!doctype html>');
    expect(output).toContain('静态审计项');
    expect(output).toContain('已识别测试回调');
    expect(output).toContain('筛选发现项');
    expect(output).toContain('data-classification="FAKE"');
    expect(output).toContain('虚假测试');
    expect(output).toContain('严重');
    expect(output).toContain(
      'title="E2E001：Playwright 测试回调中没有可识别的 expect 断言。"',
    );
    expect(output).toContain('example.test.ts');
    expect(output).not.toContain(result.tests[0]?.source ?? '');
  });

  it('separates static callback and finding counts by framework in Chinese HTML', () => {
    const output = renderHtml(
      {
        ...result,
        tests: [
          ...result.tests,
          {
            ...result.tests[0]!,
            filePath: '/repo/journey.spec.ts',
            framework: 'playwright',
            type: 'e2e',
          },
          {
            ...result.tests[0]!,
            filePath: '/repo/native.test.js',
            framework: 'node-test',
            type: 'unknown',
          },
        ],
        findings: [
          {
            ...result.findings[0]!,
            filePath: '/repo/journey.spec.ts',
            ruleId: 'E2E003',
            classification: 'WEAK',
            severity: 'WARNING',
          },
        ],
      },
      'zh-CN',
    );

    expect(output).toContain('按框架静态口径');
    expect(output).toContain('Vitest · 静态回调 1 · 发现项 0');
    expect(output).toContain('Playwright · 静态回调 1 · 发现项 1');
    expect(output).toContain('Node 内置测试 · 静态回调 1 · 发现项 0');
    expect(output).toContain('运行器注册实例未执行、未统计。');
  });

  it('provides Chinese hover descriptions for every E2E00x rule', () => {
    const output = renderHtml(
      {
        ...result,
        findings: ['E2E001', 'E2E002', 'E2E003', 'E2E004'].map((ruleId) => ({
          ...result.findings[0]!,
          ruleId,
        })),
      },
      'zh-CN',
    );

    expect(output).toContain(
      'title="E2E001：Playwright 测试回调中没有可识别的 expect 断言。"',
    );
    expect(output).toContain(
      'title="E2E002：所有可识别的 Playwright 断言只检查页面 URL。"',
    );
    expect(output).toContain(
      'title="E2E003：所有直接 Playwright 断言只检查元素可见性。"',
    );
    expect(output).toContain(
      'title="E2E004：page.waitForTimeout 使用了数字字面量。"',
    );
  });

  it('provides a catalog-backed tooltip for a new E2E rule', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [{ ...result.findings[0]!, ruleId: 'E2E010' }],
      },
      'zh-CN',
    );

    expect(output).toContain(
      'title="E2E010：所有直接断言只检查空文本或空属性。"',
    );
  });

  it('exposes empty and filtered states as an accessible status', () => {
    const output = renderHtml({ ...result, tests: [], findings: [] }, 'zh-CN');

    expect(output).toContain('<p id="empty" role="status" aria-live="polite"');
    expect(output).toContain('没有匹配当前筛选条件的发现项。');
    expect(output).toContain("q('#empty').classList.toggle('hidden',n>0)");
  });

  it('localizes the Chinese HTML finding message and remediation for E2E rules', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          {
            ...result.findings[0]!,
            ruleId: 'E2E003',
            message:
              'E2E003 verifies only element visibility. Static analysis cannot determine whether visible UI proves the user journey outcome.',
            remediation:
              'Add assertions for the user-visible value, state change, or completed outcome. Static analysis cannot judge every meaningful journey outcome.',
          },
        ],
      },
      'zh-CN',
    );

    expect(output).toContain(
      'E2E003 仅验证元素可见性。静态分析无法判断可见 UI 是否足以证明用户旅程完成。',
    );
    expect(output).toContain(
      '补充对用户可见值、状态变化或已完成结果的断言。静态分析无法判断所有有意义的用户旅程结果。',
    );
    expect(output).not.toContain('E2E003 verifies only element visibility.');
  });

  it('renders a visible-on-hover tooltip instead of relying only on a native title', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          {
            ...result.findings[0]!,
            ruleId: 'E2E001',
          },
        ],
      },
      'zh-CN',
    );

    expect(output).toContain('class="rule-id" tabindex="0"');
    expect(output).toContain('class="rule-tooltip" role="tooltip"');
    expect(output).toContain(
      'E2E001：Playwright 测试回调中没有可识别的 expect 断言。',
    );
    expect(output).toContain('.rule-id:hover .rule-tooltip');
    expect(output).toContain('.rule-id:focus .rule-tooltip');
  });

  it('shows a rule explanation in the rule navigation entry', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          {
            ...result.findings[0]!,
            ruleId: 'E2E001',
          },
        ],
      },
      'zh-CN',
    );

    expect(output).toContain('class="rule-navigation-item"');
    expect(output).toContain('class="rule-navigation-description"');
    expect(output).toContain('Playwright 测试回调中没有可识别的 expect 断言。');
  });

  it('renders localized rule and file navigation counts', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          {
            ...result.findings[0]!,
            ruleId: 'E2E001',
            filePath: '/repo/a.e2e.ts',
          },
          {
            ...result.findings[0]!,
            ruleId: 'E2E004',
            filePath: '/repo/a.e2e.ts',
          },
        ],
      },
      'zh-CN',
    );

    expect(output).toContain('按规则浏览');
    expect(output).toContain('E2E001 <b>1</b>');
    expect(output).toContain('a.e2e.ts <b>2</b>');
  });

  it('groups findings under a readable file name while retaining the full path', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          { ...result.findings[0]!, line: 4 },
          { ...result.findings[0]!, line: 9 },
        ],
      },
      'zh-CN',
    );
    expect(output).toContain('<section class="finding-group"');
    expect(output).toContain(
      '<h2 class="finding-group-title">example.test.ts <b>2</b></h2>',
    );
    expect(output).toContain(
      '<p class="finding-group-path">/repo/example.test.ts</p>',
    );
    expect(output).toContain('<details><summary>修复建议</summary>');
    expect(output).not.toContain(result.tests[0]!.source);
  });

  it('puts navigation semantics on the aside and shortens Windows file paths', () => {
    const output = renderHtml(
      {
        ...result,
        findings: [
          { ...result.findings[0]!, filePath: 'C:\\\\repo\\\\a.e2e.ts' },
        ],
      },
      'en',
    );
    expect(output).toContain(
      '<aside class="report-navigation" aria-label="Audit navigation">',
    );
    expect(output).toContain('>a.e2e.ts <b>1</b>');
    expect(output).toContain('data-filter-value="C:\\\\repo\\\\a.e2e.ts"');
  });

  it('uses a neutral navigation label and clears the opposite text filter', () => {
    const output = renderHtml(result, 'en');
    expect(output).toContain(
      '<aside class="report-navigation" aria-label="Audit navigation">',
    );
    expect(output).toContain(
      "q('#rule').value='';q('#file').value=x.dataset.filterValue||''",
    );
    expect(output).toContain(
      "q('#file').value='';q('#rule').value=x.dataset.filterValue||''",
    );
    expect(output).toContain(
      "['input','change'].forEach(e=>q('#classification').addEventListener(e,f))",
    );
  });

  it('renders an offline responsive audit workbench', () => {
    const output = renderHtml(result, 'en');
    expect(output).toContain('class="report-layout"');
    expect(output).toContain('class="report-navigation"');
    expect(output).toContain('@media (max-width: 720px)');
    expect(output).not.toMatch(/https?:\/\//);
  });

  it('renders mutation evidence as advisory only', () => {
    const output = renderText({
      ...result,
      mutation: {
        version: '1',
        engine: 'stryker',
        command: 'npx stryker run',
        threshold: {
          minimumScore: 90,
          source: 'stryker.conf.json: thresholds.high',
        },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
        meetsThreshold: false,
      },
    });

    expect(output).toContain('Mutation evidence (advisory only)');
    expect(output).toContain('Threshold: below (90.00%)');
    expect(output).toContain('stryker.conf.json: thresholds.high');
  });

  it('renders a met mutation threshold without making it a static finding', () => {
    const output = renderText({
      ...result,
      mutation: {
        version: '1',
        engine: 'generic',
        command: 'mutation-tool --report report.json',
        threshold: { minimumScore: 80, source: 'policy.json' },
        result: { totalMutants: 10, killed: 8, survived: 2, score: 80 },
        meetsThreshold: true,
      },
    });

    expect(output).toContain('Threshold: met (80.00%)');
    expect(output).toContain('[CRITICAL] [FAKE] UT002');
  });

  it('renders advisory policy counts with the stable text labels', () => {
    const output = renderText({
      ...result,
      policy: {
        version: '1',
        id: 'local-policy',
        mode: 'advisory',
        disabledRuleIds: ['UT002'],
        disabledFindingCount: 1,
        activeFindingCount: 0,
      },
    });

    expect(output).toContain(
      '\nPolicy (advisory only)\nID: local-policy\nDisabled findings: 1\nActive findings: 0\n\nStatic source analysis only:',
    );
  });

  it('renders advisory baseline counts without changing findings', () => {
    const output = renderText({
      ...result,
      baseline: {
        version: '1',
        id: 'main',
        historicalFindingCount: 1,
        newFindingCount: 0,
      },
    });
    expect(output).toContain(
      'Baseline (advisory only)\nID: main\nHistorical findings: 1\nNew findings: 0',
    );
  });
});
