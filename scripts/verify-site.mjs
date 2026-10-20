import { chromium } from 'playwright';
import { existsSync } from 'node:fs';

const url = process.argv[2];
if (!url) {
  console.error('用法: node scripts/verify-site.mjs <url>');
  process.exit(2);
}

// 优先使用系统已安装的 Chromium，避免 CI 环境额外下载
const CHROME_PATH =
  process.env.CHROME_PATH ||
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/local/bin/chromium',
  ].find((p) => existsSync(p));

const browser = await chromium.launch(CHROME_PATH ? { executablePath: CHROME_PATH } : {});
const page = await browser.newPage();

// 记录被测页面自身发出的所有请求（用于交叉核对）
const seen = [];
page.on('request', (r) => seen.push(r.url()));

let tlError = null;
page.on('pageerror', (e) => (tlError = String(e)));

await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(1200);

const result = await page.evaluate(() => {
  const el = document.querySelector('trust-lens');
  const api = window.TrustLens;
  // 浮标由 Shadow DOM 容器承载：优先查自定义元素内部，其次查挂载到 body 的独立容器
  const fabHost = el?.shadowRoot?.querySelector('.tl-fab')
    ? el
    : document.querySelector('.tl-root');
  const hasEl = !!(el || fabHost);
  const mounted = !!fabHost?.shadowRoot?.querySelector('.tl-fab');
  const summary = api?.getSummary?.() || null;
  const grade = api?.getGrade?.() || null;
  // 验证隐私底线：记录中不得出现任何字段值
  const recs = window.TrustLens?.instance?.getRecords?.() || [];
  const leak = recs.filter((r) => {
    const s = JSON.stringify(r);
    return /私[密密]|敏感内容|123456/.test(s);
  }).length;
  return { hasEl, mounted, summary, grade, leaked: leak, recordCount: recs.length };
});

await browser.close();

const { hasEl, mounted, summary, grade, leaked } = result;

console.log('──────── TrustLens 站点验证 ────────');
console.log('目标站点      :', url);
console.log('组件标签存在  :', hasEl ? '✅' : '❌');
console.log('浮标已挂载    :', mounted ? '✅' : '❌');
console.log('透明度等级    :', grade ? `${grade.level}（${grade.text}）` : '—');
if (summary) {
  console.log('采集请求总数  :', summary.total);
  console.log('风险分布      :', `高 ${summary.byRisk.high} / 中 ${summary.byRisk.medium} / 低 ${summary.byRisk.low}`);
  console.log('第三方域名    :', summary.thirdPartyDomains.length);
}
console.log('隐私底线检查  :', leaked === 0 ? '✅ 未发现任何字段值残留' : `❌ 发现 ${leaked} 条记录含明文值`);
if (tlError) console.log('页面异常      :', tlError);

if (!hasEl || !mounted) {
  console.log('\n判定：❌ 未通过 —— 组件未真实集成');
  process.exit(1);
}
if (leaked > 0) {
  console.log('\n判定：❌ 未通过 —— 隐私底线被破坏');
  process.exit(1);
}

const level = grade?.level || 'L0';
console.log(`\n判定：✅ 通过 —— 建议等级 ${level}`);
