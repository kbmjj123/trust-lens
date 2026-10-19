/**
 * 端到端验证：直接用真实浏览器打开 Vue3 / React 示例的构建产物，
 * 触发三类请求，检查面板分类、ref 统计与隐私底线。
 *
 * 用法：node test-examples.mjs
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

/** 起一个静态服务，并内置 /api mock（模拟站点后端） */
function serve(dir, port) {
  const server = http.createServer(async (req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    if (p.startsWith('/api/')) {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: p }));
      }, 100);
      return;
    }
    try {
      const rel = p === '/' ? '/index.html' : p;
      const buf = await readFile(resolve(dir, '.' + rel));
      res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('404');
    }
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

const CHROME = ['/usr/bin/google-chrome', '/usr/local/bin/chromium'].find((p) => existsSync(p));

async function check(name, distDir, port) {
  const server = await serve(distDir, port);
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  const errs = [];
  // 示例故意访问 google-analytics.com，CORS 拦截与 favicon 404 属预期噪声，不计入异常
  const IGNORE = /google-analytics|favicon|CORS policy|404 \(Not Found\)|ERR_FAILED|Failed to load resource/i;
  page.on('pageerror', (e) => !IGNORE.test(String(e)) && errs.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  const h1 = (await page.textContent('h1'))?.trim();
  const fab = await page.evaluate(
    () => !!document.querySelector('.tl-root')?.shadowRoot?.querySelector('.tl-fab')
  );

  // 触发三类请求
  await page.click('text=触发「已声明」接口');
  await page.click('text=触发「未声明」提交');
  await page.click('text=触发「第三方追踪」');
  await page.waitForTimeout(1000);
  await page.click('text=刷新统计');
  await page.waitForTimeout(300);

  const out = await page.evaluate(() => {
    const s = window.TrustLens.getSummary();
    const g = window.TrustLens.getGrade();
    return {
      total: s.total,
      byKind: s.byKind,
      byRisk: s.byRisk,
      grade: `${g.level} · ${g.text}`,
      cards: [...document.querySelectorAll('.card')]
        .map((c) => `${c.querySelector('.lbl')?.textContent}=${c.querySelector('.num')?.textContent}`)
        .join('  '),
      gradeText: [...document.querySelectorAll('p')]
        .map((p) => p.textContent)
        .find((t) => t.includes('透明度等级'))
        ?.trim(),
      raw: JSON.stringify(window.TrustLens.instance.getRecords()),
    };
  });

  // 打开面板
  await page.click('.tl-fab');
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => {
    const sr = document.querySelector('.tl-root')?.shadowRoot;
    return {
      open: !!sr?.querySelector('.tl-panel.open'),
      items: sr?.querySelectorAll('.tl-item').length ?? 0,
      overview: sr?.querySelector('.tl-ov-note')?.textContent?.trim().slice(0, 70),
    };
  });

  const LEAK = ['私密文件.pdf', '敏感内容', '123456'];
  const leaked = LEAK.filter((v) => out.raw.includes(v));
  const kinds = out.byKind || {};
  const ok =
    fab && panel.open && leaked.length === 0 && kinds.declared > 0 && kinds.unexpected > 0 && errs.length === 0;

  console.log(`\n════════ ${name} ════════`);
  console.log('页面标题    :', h1);
  console.log('浮标挂载    :', fab ? '✅' : '❌');
  console.log('总请求数    :', out.total);
  console.log('分类分布    :', JSON.stringify(kinds));
  console.log('风险分布    :', `高 ${out.byRisk.high} / 中 ${out.byRisk.medium} / 低 ${out.byRisk.low}`);
  console.log('等级判定    :', out.grade);
  console.log('页面统计卡  :', out.cards);
  console.log('页面等级文案:', out.gradeText);
  console.log('面板可打开  :', panel.open ? `✅（${panel.items} 条）` : '❌');
  console.log('面板概览    :', panel.overview);
  console.log('隐私底线    :', leaked.length === 0 ? '✅ 未出现任何字段值' : `❌ 泄漏: ${leaked}`);
  console.log('运行时异常  :', errs.length ? `❌ ${errs.slice(0, 2).join(' | ')}` : '✅ 无');
  console.log('结论        :', ok ? '✅ 通过' : '❌ 未通过');

  await browser.close();
  server.close();
  return ok;
}

const a = await check('Vue 3 示例', resolve(ROOT, 'examples/vue3/dist'), 8911);
const b = await check('React 示例', resolve(ROOT, 'examples/react/dist'), 8912);

console.log('\n════════ 汇总 ════════');
console.log(`Vue3 ${a ? '✅' : '❌'}   React ${b ? '✅' : '❌'}`);
process.exit(a && b ? 0 : 1);
