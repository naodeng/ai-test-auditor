import type { AuditResult, Finding } from './core/types.js';
import { getRuleDefinition } from './rules/catalog.js';

export type ReportLocale = 'en' | 'zh-CN';

const labels = {
  en: {
    title: 'AI Test Auditor',
    findings: 'Findings',
    auditItems: 'Audit items',
    extractedTests: 'Extracted test cases',
    fake: 'Fake tests (FAKE)',
    weak: 'Review hints (WEAK)',
    unassessed: 'Unassessed (UNASSESSED)',
    invalid: 'Invalid source (INVALID)',
    ftr: 'Fake Test Ratio',
    trust: 'Trust Score',
    filter: 'Filter findings',
    file: 'File name',
    rule: 'Rule ID',
    reset: 'Reset filters',
    noStrong: 'No finding does not mean a test is STRONG.',
    sourceOnly:
      'Static source analysis only: reviewed tests were not executed.',
    remediation: 'Remediation',
    noResults: 'No findings match these filters.',
    noFindings: 'No findings were reported by static analysis.',
    classification: 'Classification',
    navigation: 'Browse by rule',
    files: 'Browse by file',
    classifications: 'Browse by classification',
    navigationLabel: 'Audit navigation',
    frameworkSummary: 'Static scope by framework',
    staticCallbacks: 'Static callbacks',
    findingCount: 'Findings',
    runnerCountsNotAvailable:
      'Runner registration instances were not executed or counted.',
  },
  'zh-CN': {
    title: 'AI Test Auditor',
    findings: '发现项',
    auditItems: '静态审计项',
    extractedTests: '已识别测试回调',
    fake: '虚假测试（FAKE）',
    weak: '待人工复核（WEAK）',
    unassessed: '未评估（UNASSESSED）',
    invalid: '无效源码（INVALID）',
    ftr: '虚假测试比例',
    trust: '信任分数',
    filter: '筛选发现项',
    file: '文件名',
    rule: '规则 ID',
    reset: '重置筛选',
    noStrong: '没有发现项不表示测试是 STRONG。',
    sourceOnly: '仅静态源码分析：未执行被审计测试。',
    remediation: '修复建议',
    noResults: '没有匹配当前筛选条件的发现项。',
    noFindings: '静态分析未发现问题。',
    classification: '分类',
    navigation: '按规则浏览',
    files: '按文件浏览',
    classifications: '按分类浏览',
    navigationLabel: '审计导航',
    frameworkSummary: '按框架静态口径',
    staticCallbacks: '静态回调',
    findingCount: '发现项',
    runnerCountsNotAvailable: '运行器注册实例未执行、未统计。',
  },
} as const;

const classificationLabels = {
  en: {
    FAKE: 'Fake test',
    WEAK: 'Review hint',
    INVALID: 'Invalid source',
    STRONG: 'Strong test',
    UNASSESSED: 'Unassessed',
  },
  'zh-CN': {
    FAKE: '虚假测试',
    WEAK: '待人工复核',
    INVALID: '无效源码',
    STRONG: '强测试',
    UNASSESSED: '未评估',
  },
} as const;

const severityLabels = {
  en: { CRITICAL: 'Critical', WARNING: 'Warning', INFO: 'Info' },
  'zh-CN': { CRITICAL: '严重', WARNING: '警告', INFO: '提示' },
} as const;

const ruleDescriptions = {
  E2E001: {
    en: 'Playwright test callback has no recognized expect assertion.',
    'zh-CN': 'Playwright 测试回调中没有可识别的 expect 断言。',
  },
  E2E002: {
    en: 'Every recognized Playwright assertion checks only the page URL.',
    'zh-CN': '所有可识别的 Playwright 断言只检查页面 URL。',
  },
  E2E003: {
    en: 'Every direct Playwright assertion only checks element visibility.',
    'zh-CN': '所有直接 Playwright 断言只检查元素可见性。',
  },
  E2E004: {
    en: 'page.waitForTimeout receives a numeric literal.',
    'zh-CN': 'page.waitForTimeout 使用了数字字面量。',
  },
} as const;

const chineseFindingCopy = {
  E2E001: {
    message:
      'E2E001 未在此 Playwright 流程中识别到 expect 断言。静态分析无法证明仅有导航或操作即可验证用户可见结果。',
    remediation:
      '补充对可观察用户结果或状态变化的断言。静态分析无法判断每个预期的流程结果是否都已覆盖。',
  },
  E2E002: {
    message:
      'E2E002 仅验证页面 URL。静态分析无法判断仅验证导航是否足以证明用户旅程完成。',
    remediation:
      '补充对用户可见结果或状态变化的断言。静态分析无法判断所有有意义的用户旅程结果。',
  },
  E2E003: {
    message:
      'E2E003 仅验证元素可见性。静态分析无法判断可见 UI 是否足以证明用户旅程完成。',
    remediation:
      '补充对用户可见值、状态变化或已完成结果的断言。静态分析无法判断所有有意义的用户旅程结果。',
  },
  E2E004: {
    message:
      'E2E004 使用了数字字面量形式的 page.waitForTimeout 等待。静态分析无法判断该等待是否由外部系统所必需。',
    remediation:
      '改为等待明确的页面条件或网络结果。静态分析无法验证所有异步依赖。',
  },
} as const;

export function renderJson(result: AuditResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

function localizedFindingCopy(
  finding: Pick<Finding, 'ruleId' | 'message' | 'remediation'>,
  locale: ReportLocale,
): { readonly message: string; readonly remediation: string } {
  if (locale === 'en') {
    return { message: finding.message, remediation: finding.remediation };
  }
  const legacyCopy =
    chineseFindingCopy[finding.ruleId as keyof typeof chineseFindingCopy];
  if (legacyCopy) return legacyCopy;
  const definition = getRuleDefinition(finding.ruleId);
  if (!definition) {
    return { message: finding.message, remediation: finding.remediation };
  }
  return {
    message:
      finding.ruleId +
      '：' +
      definition.description.zh +
      ' 静态分析无法判断该有限证据是否足够。',
    remediation:
      definition.evidenceBoundary.zh + ' 请结合业务语义进行人工复核。',
  };
}

export function renderText(
  result: AuditResult,
  locale: ReportLocale = 'en',
): string {
  const t = labels[locale];
  const isChinese = locale === 'zh-CN';
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
    isChinese
      ? t.auditItems +
        '：' +
        summary.total +
        ' 总计，' +
        summary.assessed +
        ' 已评估'
      : 'Audit items: ' +
        summary.total +
        ' total, ' +
        summary.assessed +
        ' assessed',
    isChinese
      ? t.extractedTests + '：' + result.tests.length
      : 'Extracted test cases: ' + result.tests.length,
    isChinese
      ? '分类：' +
        classificationLabels[locale].FAKE +
        ' ' +
        summary.fake +
        ' | ' +
        classificationLabels[locale].WEAK +
        ' ' +
        summary.weak +
        ' | ' +
        classificationLabels[locale].INVALID +
        ' ' +
        summary.invalid +
        ' | ' +
        classificationLabels[locale].UNASSESSED +
        ' ' +
        summary.unassessed
      : 'Classifications: FAKE ' +
        summary.fake +
        ' | WEAK ' +
        summary.weak +
        ' | INVALID ' +
        summary.invalid +
        ' | UNASSESSED ' +
        summary.unassessed,
    isChinese
      ? t.ftr +
        '：' +
        summary.fakeTestRatio.toFixed(2) +
        '%（' +
        summary.fake +
        ' / ' +
        summary.assessed +
        ' 已评估）'
      : 'Fake Test Ratio: ' +
        summary.fakeTestRatio.toFixed(2) +
        '% (' +
        summary.fake +
        ' / ' +
        summary.assessed +
        ' assessed)',
    isChinese
      ? t.trust +
        '：' +
        summary.trustScore +
        '/100（100 - ' +
        critical +
        ' 严重 x 25 - ' +
        warning +
        ' 警告 x 10）'
      : 'Trust Score: ' +
        summary.trustScore +
        '/100 (100 - ' +
        critical +
        ' critical x 25 - ' +
        warning +
        ' warning x 10)',
    '',
  ];
  if (result.selection) {
    lines.push(
      '',
      isChinese
        ? '文件筛选：' +
            result.selection.mode +
            '（' +
            result.selection.files.length +
            ' 个变更候选）'
        : 'File selection: ' +
            result.selection.mode +
            ' (' +
            result.selection.files.length +
            ' changed candidates)',
    );
  }

  if (result.findings.length === 0) {
    lines.push(
      isChinese
        ? t.noFindings + ' ' + t.noStrong
        : 'No deterministic findings. Unflagged tests remain UNASSESSED; this is not evidence that they are STRONG.',
    );
  } else {
    lines.push(isChinese ? t.findings : 'Findings');
    for (const finding of result.findings) {
      const copy = localizedFindingCopy(finding, locale);
      const classification = isChinese
        ? classificationLabels[locale][finding.classification]
        : finding.classification;
      const severity = isChinese
        ? severityLabels[locale][finding.severity]
        : finding.severity;
      lines.push(
        '',
        finding.filePath +
          ':' +
          finding.line +
          ' [' +
          severity +
          '] [' +
          classification +
          '] ' +
          finding.ruleId,
        '  ' + copy.message,
        '  ' +
          (isChinese ? '修复建议' : 'Remediation') +
          ': ' +
          copy.remediation,
      );
    }
  }

  if (result.diagnostics && result.diagnostics.length > 0) {
    lines.push(
      '',
      isChinese
        ? 'Parser 诊断（仅源码语法）'
        : 'Parser diagnostics (source syntax only)',
    );
    for (const diagnostic of result.diagnostics) {
      lines.push(
        diagnostic.filePath +
          ':' +
          diagnostic.line +
          ' [PARSER001] ' +
          diagnostic.message,
      );
    }
  }

  if (result.semantic) {
    lines.push(
      '',
      isChinese
        ? '语义推断（' + result.semantic.provider + '；仅供参考）'
        : 'Semantic inferences (' +
            result.semantic.provider +
            '; advisory only)',
    );
    for (const inference of result.semantic.inferences) {
      lines.push(
        inference.filePath +
          ':' +
          inference.line +
          ' [' +
          inference.confidence +
          '] ' +
          inference.summary,
      );
    }
  }

  if (result.mutation) {
    const { mutation } = result;
    lines.push(
      '',
      isChinese ? '变异证据（仅供参考）' : 'Mutation evidence (advisory only)',
      (isChinese ? '引擎' : 'Engine') + ': ' + mutation.engine,
      (isChinese ? '命令' : 'Command') + ': ' + mutation.command,
      (isChinese ? '分数' : 'Score') +
        ': ' +
        mutation.result.score.toFixed(2) +
        '% (' +
        mutation.result.killed +
        ' killed / ' +
        mutation.result.totalMutants +
        ' total; ' +
        mutation.result.survived +
        ' survived)',
      (isChinese ? '阈值' : 'Threshold') +
        ': ' +
        (mutation.meetsThreshold ? 'met' : 'below') +
        ' (' +
        mutation.threshold.minimumScore.toFixed(2) +
        '%)',
      (isChinese ? '阈值来源' : 'Threshold source') +
        ': ' +
        mutation.threshold.source,
    );
  }

  if (result.baseline) {
    lines.push(
      '',
      isChinese ? '基线（仅供参考）' : 'Baseline (advisory only)',
      'ID: ' + result.baseline.id,
      (isChinese ? '历史发现项' : 'Historical findings') +
        ': ' +
        result.baseline.historicalFindingCount,
      (isChinese ? '新增发现项' : 'New findings') +
        ': ' +
        result.baseline.newFindingCount,
    );
  }

  if (result.policy) {
    lines.push(
      '',
      isChinese ? '策略（仅供参考）' : 'Policy (advisory only)',
      'ID: ' + result.policy.id,
      (isChinese ? '已禁用发现项' : 'Disabled findings') +
        ': ' +
        result.policy.disabledFindingCount,
      (isChinese ? '启用发现项' : 'Active findings') +
        ': ' +
        result.policy.activeFindingCount,
    );
  }

  lines.push(
    '',
    isChinese
      ? '仅静态源码分析：未执行测试，也未评估运行时行为。'
      : 'Static source analysis only: tests were not executed, and runtime behavior was not assessed.',
  );

  return `${lines.join('\n')}\n`;
}

function renderHtmlBase(
  result: AuditResult,
  locale: ReportLocale = 'en',
): string {
  const t = labels[locale];
  const data = result.findings.map(
    ({
      ruleId,
      severity,
      classification,
      filePath,
      line,
      message,
      remediation,
    }) => ({
      ruleId,
      severity,
      classification,
      filePath,
      line,
      message,
      remediation,
    }),
  );
  const cardHtml = data.map((finding, index) => {
    const classification = classificationLabels[locale][finding.classification];
    const severity = severityLabels[locale][finding.severity];
    const ruleDescription = getRuleDescription(finding.ruleId, locale);
    const ruleTitle = ruleDescription
      ? `${finding.ruleId}${locale === 'zh-CN' ? '：' : ': '}${ruleDescription}`
      : finding.ruleId;
    const localizedCopy = localizedFindingCopy(finding, locale);
    const message = localizedCopy.message;
    const remediation = localizedCopy.remediation;
    const tooltipId = `rule-tooltip-${index}`;
    return `<article class="finding" data-classification="${escapeHtml(finding.classification)}" data-rule="${escapeHtml(finding.ruleId)}" data-file="${escapeHtml(finding.filePath)}"><header><b>${escapeHtml(classification)} (${escapeHtml(finding.classification)})</b> <span class="rule-id" tabindex="0" aria-describedby="${tooltipId}"><code title="${escapeHtml(ruleTitle)}" aria-label="${escapeHtml(ruleTitle)}">${escapeHtml(finding.ruleId)}</code><span id="${tooltipId}" class="rule-tooltip" role="tooltip">${escapeHtml(ruleTitle)}</span></span> · ${escapeHtml(severity)} (${escapeHtml(severity)}) · ${escapeHtml(finding.filePath)}:${finding.line}</header><p>${escapeHtml(message)}</p><details><summary>${escapeHtml(t.remediation)}</summary><p>${escapeHtml(remediation)}</p></details></article>`;
  });
  const ruleCounts = countBy(data.map((finding) => finding.ruleId));
  const fileCounts = countBy(data.map((finding) => finding.filePath));
  const classificationCounts = countBy(
    data.map((finding) => finding.classification),
  );
  const frameworkByFile = new Map(
    result.tests.map((test) => [test.filePath, test.framework]),
  );
  const frameworkSummaries = countBy(
    result.tests.map((test) => test.framework),
  ).map(([framework, callbackCount]) => {
    const findingCount = result.findings.filter(
      (finding) => frameworkByFile.get(finding.filePath) === framework,
    ).length;
    return { framework, callbackCount, findingCount };
  });
  const frameworkSummary = `<section class="framework-summary" aria-label="${escapeHtml(t.frameworkSummary)}"><h2>${escapeHtml(t.frameworkSummary)}</h2><p class="framework-summary-note">${escapeHtml(t.runnerCountsNotAvailable)}</p><div class="framework-grid">${frameworkSummaries.map(({ framework, callbackCount, findingCount }) => `<p class="framework-card">${escapeHtml(frameworkLabel(framework, locale))} · ${escapeHtml(t.staticCallbacks)} ${callbackCount} · ${escapeHtml(t.findingCount)} ${findingCount}</p>`).join('')}</div></section>`;
  const navigation = `<nav><h2>${escapeHtml(t.navigation)}</h2>${ruleCounts
    .map(([rule, count]) => {
      const description = getRuleDescription(rule, locale);
      return `<button type="button" class="rule-navigation-item" data-filter-kind="rule" data-filter-value="${escapeHtml(rule)}"><span>${escapeHtml(rule)} <b>${count}</b></span>${description ? `<small class="rule-navigation-description">${escapeHtml(description)}</small>` : ''}</button>`;
    })
    .join(
      '',
    )}<h2>${escapeHtml(t.classifications)}</h2>${classificationCounts.map(([classification, count]) => `<button type="button" data-filter-kind="classification" data-filter-value="${escapeHtml(classification)}">${escapeHtml(classificationLabels[locale][classification as keyof typeof classificationLabels.en] ?? classification)} <b>${count}</b></button>`).join('')}<h2>${escapeHtml(t.files)}</h2>${fileCounts.map(([file, count]) => `<button type="button" data-filter-kind="file" data-filter-value="${escapeHtml(file)}">${escapeHtml(file.split(/[\\/]/).pop() ?? file)} <b>${count}</b></button>`).join('')}</nav>`;
  const groupedCards = fileCounts
    .map(([file, count]) => {
      const fileName = file.split(/[\\/]/).pop() ?? file;
      return `<section class="finding-group" data-group-file="${escapeHtml(file)}"><h2 class="finding-group-title">${escapeHtml(fileName)} <b>${count}</b></h2><p class="finding-group-path">${escapeHtml(file)}</p>${data.map((finding, index) => (finding.filePath === file ? cardHtml[index] : '')).join('')}</section>`;
    })
    .join('');
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t.title}</title><style>:root{color-scheme:dark;--bg:#111827;--panel:#1f2937;--ink:#f3f4f6;--muted:#cbd5e1;--fake:#fb7185;--weak:#fbbf24}body{margin:0;background:var(--bg);color:var(--ink);font:16px ui-sans-serif,system-ui,sans-serif}main{max-width:1480px;margin:auto;padding:32px}.report-layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;align-items:start}.report-navigation{position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto}.report-content{min-width:0}h1{font-family:Charter,'Iowan Old Style',Georgia,serif;letter-spacing:-.02em}.grid,.framework-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.card,.finding,fieldset,.report-navigation,.finding-group,.framework-summary{background:var(--panel);padding:14px;border-radius:8px}.card b{font-size:1.25rem}.framework-summary{margin:16px 0}.framework-summary h2{margin:0;font-size:1rem}.framework-summary-note{margin:6px 0 12px;color:var(--muted);font-size:.9rem}.framework-card{margin:0;padding:10px;border:1px solid #475569;border-radius:6px;background:#111827}.report-navigation h2{font-size:1rem;margin:8px 0}.report-navigation button{display:block;width:100%;text-align:left}.rule-navigation-description{display:block;margin-top:4px;color:var(--muted);font-size:.75rem;line-height:1.35}.finding-group{margin:16px 0}.finding-group-title{margin:0;font-size:1.15rem}.finding-group-path{margin:4px 0 12px;color:var(--muted);font:13px ui-monospace,monospace;overflow-wrap:anywhere}.finding{margin:12px 0;border:1px solid #475569;line-height:1.45}.finding[data-classification="FAKE"]{border-color:#9f1239}input,select,button{padding:8px;margin:4px;background:#111827;color:inherit;border:1px solid #64748b;border-radius:4px}.rule-id{position:relative;display:inline-block}.rule-id code{color:#93c5fd;cursor:help;text-decoration:underline dotted}.rule-tooltip{position:absolute;z-index:1;top:calc(100% + 6px);left:0;width:max-content;max-width:min(360px,calc(100vw - 48px));padding:8px;border:1px solid #93c5fd;border-radius:4px;background:#0f172a;color:var(--ink);font:14px ui-sans-serif,sans-serif;line-height:1.4;opacity:0;pointer-events:none;visibility:hidden}.rule-id:hover .rule-tooltip,.rule-id:focus .rule-tooltip{opacity:1;visibility:visible}.hidden{display:none}@media (max-width: 720px){main{padding:16px}.report-layout{display:flex;flex-direction:column}.report-navigation{position:static;width:auto;max-height:none;order:0}.report-content{width:100%}}
</style><main><h1>${t.title}</h1><div class="report-layout"><aside class="report-navigation" aria-label="${escapeHtml(t.navigationLabel)}">${navigation}</aside><section class="report-content"><p>${t.sourceOnly} ${t.noStrong}</p><section class="grid"><div class="card">${t.auditItems}<br><b>${result.summary.total}</b></div><div class="card">${t.extractedTests}<br><b>${result.tests.length}</b></div><div class="card">${t.fake}<br><b>${result.summary.fake}</b></div><div class="card">${t.weak}<br><b>${result.summary.weak}</b></div><div class="card">${t.unassessed}<br><b>${result.summary.unassessed}</b></div><div class="card">${t.ftr}<br><b>${result.summary.fakeTestRatio.toFixed(2)}%</b></div><div class="card">${t.trust}<br><b>${result.summary.trustScore}</b></div></section>${frameworkSummary}<fieldset><legend>${t.filter}</legend><select id="classification"><option value="">${t.findings}</option><option value="FAKE">${t.fake}</option><option value="WEAK">${t.weak}</option><option value="INVALID">${t.invalid}</option></select><label for="rule">${t.rule}</label><input id="rule" aria-label="${t.rule}" placeholder="${t.rule}"><label for="file">${t.file}</label><input id="file" aria-label="${t.file}" placeholder="${t.file}"><button id="reset">${t.reset}</button></fieldset><p id="empty" class="${data.length ? 'hidden' : ''}">${t.noResults}</p><section id="findings">${groupedCards}</section></section></div></main><script>const q=s=>document.querySelector(s),all=[...document.querySelectorAll('.finding')];function f(){const c=q('#classification').value,r=q('#rule').value.toLowerCase(),p=q('#file').value.toLowerCase();let n=0;all.forEach(x=>{const ok=(!c||x.dataset.classification===c)&&(!r||x.dataset.rule.toLowerCase().includes(r))&&(!p||x.dataset.file.toLowerCase().includes(p));x.classList.toggle('hidden',!ok);if(ok)n++});document.querySelectorAll('.finding-group').forEach(g=>g.classList.toggle('hidden',![...g.querySelectorAll('.finding')].some(x=>!x.classList.contains('hidden'))));q('#empty').textContent=all.length===0?'${t.noFindings}':'${t.noResults}';q('#empty').classList.toggle('hidden',n>0)}['#rule','#file'].forEach(x=>q(x).addEventListener('input',f));['input','change'].forEach(e=>q('#classification').addEventListener(e,f));q('#reset').onclick=()=>{q('#classification').value=q('#rule').value=q('#file').value='';f()};document.querySelectorAll('[data-filter-kind]').forEach(x=>x.onclick=()=>{if(x.dataset.filterKind==='rule'){q('#file').value='';q('#rule').value=x.dataset.filterValue||''}else if(x.dataset.filterKind==='file'){q('#rule').value='';q('#file').value=x.dataset.filterValue||''}else{q('#classification').value=x.dataset.filterValue||'';q('#rule').value='';q('#file').value='';q('#rule').value='';q('#file').value=''};f()});f();</script></html>`;
}

export function renderHtml(
  result: AuditResult,
  locale: ReportLocale = 'en',
): string {
  return renderHtmlBase(result, locale).replace(
    '<p id="empty" class="',
    '<p id="empty" role="status" aria-live="polite" class="',
  );
}

function countBy(
  values: readonly string[],
): ReadonlyArray<readonly [string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function frameworkLabel(framework: string, locale: ReportLocale): string {
  if (framework === 'vitest') return 'Vitest';
  if (framework === 'playwright') return 'Playwright';
  if (framework === 'jest') return 'Jest';
  if (framework === 'node-test') {
    return locale === 'zh-CN' ? 'Node 内置测试' : 'Node test';
  }
  return framework;
}

function getRuleDescription(
  ruleId: string,
  locale: ReportLocale,
): string | undefined {
  const language = locale === 'zh-CN' ? 'zh' : 'en';
  return (
    getRuleDefinition(ruleId)?.description[language] ??
    ruleDescriptions[ruleId as keyof typeof ruleDescriptions]?.[locale]
  );
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ] ?? character,
  );
}
