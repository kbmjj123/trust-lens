/**
 * CI：从 sites.json 的 PR diff 中找出新增站点，逐个跑真实浏览器验证，
 * 输出 verify-comment.md 供 workflow 评论到 PR。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const newJson = JSON.parse(readFileSync('showcase/sites.json', 'utf8'));
const basePath = process.env.BASE_JSON || 'base/showcase/sites.json';
let oldUrls = new Set();
if (existsSync(basePath)) {
  try {
    oldUrls = new Set(JSON.parse(readFileSync(basePath, 'utf8')).sites.map((s) => s.url));
  } catch { /* 首次提交 */ }
}

const added = newJson.sites.filter((s) => !oldUrls.has(s.url));
if (added.length === 0) {
  console.log('未发现新增站点，跳过验证');
  process.exit(0);
}

const rows = [];
for (const site of added) {
  let level = 'L0';
  let note = '验证失败';
  try {
    const out = execFileSync('node', ['scripts/verify-site.mjs', site.url], {
      encoding: 'utf8',
      timeout: 90_000,
    });
    const m = out.match(/建议等级 (\w+)/) || out.match(/等级\s*:\s*(\w+)/);
    level = m ? m[1] : 'L1';
    const total = (out.match(/采集请求总数\s*:\s*(\d+)/) || [])[1] || '0';
    note = `采集 ${total} 个请求`;
    if (out.includes('隐私底线检查  : ❌')) note += '，⚠️ 隐私底线检查未通过';
  } catch (e) {
    note = `无法访问或组件未挂载：${String(e).slice(0, 80)}`;
  }
  rows.push({ ...site, level, note });
}

const badge = { L3: '🥇', L2: '🥈', L1: '🥉', L0: '❌' };
const md = [
  '## 🤖 TrustLens 自动验证结果',
  '',
  '| | 站点 | 等级 | 说明 |',
  '|---|---|---|---|',
  ...rows.map((r) => `| ${badge[r.level] || ''} | [${r.name}](${r.url}) | **${r.level}** | ${r.note} |`),
  '',
  '> 等级说明：🥇 L3 声明完整且实测一致 · 🥈 L2 已声明但有未声明请求 · 🥉 L1 仅接入未声明 · ❌ 未通过',
  '',
  '等级由 CI 自动判定，请按结果修正 `level` 字段后等待人工复审。',
].join('\n');

writeFileSync('verify-comment.md', md);
console.log(md);
