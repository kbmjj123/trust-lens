import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/examples/cdn.html';
  // 模拟站点后端
  if (p.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('{"ok":true}');
  }
  try {
    const buf = await readFile(resolve(ROOT, '.' + p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end('404');
  }
});
await new Promise((r) => server.listen(8901, r));

const CHROME_PATH = ['/usr/bin/google-chrome', '/usr/local/bin/chromium'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: CHROME_PATH });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[页面异常]', String(e)));

await page.goto('http://127.0.0.1:8901/examples/cdn.html', { waitUntil: 'load' });
await page.waitForTimeout(600);

// 触发三类请求
await page.click('text=触发「已声明」接口');
await page.click('text=触发「未声明提交」');
await page.waitForTimeout(800);

const out = await page.evaluate(() => {
  const s = window.TrustLens.getSummary();
  return {
    total: s.total,
    byKind: s.byKind,
    byRisk: s.byRisk,
    userDataCount: s.userDataCount,
    grade: window.TrustLens.getGrade(),
    kinds: s.classified.map((c) => ({ kind: c.kind, title: c.title, method: c.raw.method, domain: c.raw.domain })),
    // 隐私底线：绝不出现字段值
    raw: JSON.stringify(window.TrustLens.instance.getRecords()),
  };
});

console.log('\n══════ TrustLens 功能验证 ══════');
console.log('总请求数    :', out.total);
console.log('分类分布    :', JSON.stringify(out.byKind));
console.log('风险分布    :', `高 ${out.byRisk.high} / 中 ${out.byRisk.medium} / 低 ${out.byRisk.low}`);
console.log('等级判定    :', `${out.grade.level}（${out.grade.text}）`);
console.log('\n明细：');
out.kinds.forEach((k) => console.log(`  [${k.kind.padEnd(11)}] ${k.method.padEnd(5)} ${k.domain.padEnd(24)} ${k.title}`));

const LEAK = ['私密文件.pdf', '敏感内容', '123456'];
const leaked = LEAK.filter((v) => out.raw.includes(v));
console.log('\n隐私底线    :', leaked.length === 0 ? '✅ 未出现任何字段值' : `❌ 泄漏: ${leaked.join(',')}`);

const need = ['declared', 'unexpected'];
const hit = need.filter((n) => out.byKind[n] > 0);
console.log('分类正确性  :', hit.length === need.length ? '✅ 已声明 / 未声明 均已正确识别' : `❌ 缺失: ${need.filter(n=>!hit.includes(n))}`);

await browser.close();
server.close();
