/**
 * 展示层：Shadow DOM 浮窗
 * 样式完全隔离，不污染宿主页面；零外部字体、零外部图标、零网络请求
 */

import { KIND_META, RISK_META } from './classifier.js';

const CSS = `
:host { all: initial; }
.tl-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; }

.tl-fab {
  position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 999px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff;
  font-size: 13px; font-weight: 600; letter-spacing: .2px;
  box-shadow: 0 6px 20px rgba(15,23,42,.28), 0 2px 6px rgba(15,23,42,.16);
  transition: transform .18s ease, box-shadow .18s ease;
}
.tl-fab:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(15,23,42,.34); }
.tl-fab svg { width: 16px; height: 16px; flex: none; }
.tl-badge {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
  background: #ef4444; color: #fff; font-size: 11px; line-height: 18px; text-align: center; font-weight: 700;
}
.tl-badge.tl-ok { background: #10b981; }

.tl-panel {
  position: fixed; right: 20px; bottom: 76px; z-index: 2147483001;
  width: 380px; max-width: calc(100vw - 40px); height: 540px; max-height: calc(100vh - 110px);
  display: none; flex-direction: column; overflow: hidden;
  background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
  box-shadow: 0 24px 60px rgba(15,23,42,.22);
  color: #0f172a; font-size: 13px;
}
.tl-panel.open { display: flex; }

.tl-head {
  padding: 14px 16px; border-bottom: 1px solid #eef2f7;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  display: flex; align-items: center; gap: 10px;
}
.tl-head h3 { margin: 0; font-size: 14px; font-weight: 700; flex: 1; }
.tl-head .tl-sub { font-size: 11px; color: #64748b; font-weight: 500; }
.tl-x { border: none; background: transparent; cursor: pointer; font-size: 18px; color: #64748b; line-height: 1; padding: 2px 4px; border-radius: 6px; }
.tl-x:hover { background: #e2e8f0; }

.tl-body { flex: 1; overflow-y: auto; padding: 12px 14px; }

.tl-overview {
  border-radius: 12px; padding: 12px 14px; margin-bottom: 12px;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #d1fae5;
}
.tl-overview.warn { background: linear-gradient(135deg, #fef2f2, #fff7ed); border-color: #fecaca; }
.tl-ov-title { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; }
.tl-ov-row { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #475569; }
.tl-ov-row b { font-size: 17px; color: #0f172a; display: block; line-height: 1.2; }
.tl-ov-note { margin-top: 8px; font-size: 11.5px; color: #64748b; line-height: 1.55; }

.tl-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.tl-chip {
  border: 1px solid #e2e8f0; background: #fff; border-radius: 999px;
  padding: 4px 10px; font-size: 11.5px; cursor: pointer; color: #475569;
}
.tl-chip.active { background: #0f172a; color: #fff; border-color: #0f172a; }

.tl-item {
  border: 1px solid #eef2f7; border-radius: 10px; padding: 9px 11px; margin-bottom: 7px;
  cursor: pointer; background: #fff; transition: border-color .15s, box-shadow .15s;
}
.tl-item:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(15,23,42,.06); }
.tl-item-top { display: flex; align-items: center; gap: 7px; }
.tl-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.tl-item-title { font-size: 12.5px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-method { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: #f1f5f9; color: #475569; flex: none; }
.tl-item-domain { font-size: 11px; color: #94a3b8; margin: 3px 0 0 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-detail { display: none; margin: 8px 0 2px 15px; padding: 9px 11px; border-radius: 8px; background: #f8fafc; font-size: 11.5px; line-height: 1.65; color: #475569; }
.tl-item.open .tl-detail { display: block; }
.tl-detail b { color: #334155; }
.tl-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; color: #64748b; word-break: break-all; }

.tl-foot { padding: 10px 14px; border-top: 1px solid #eef2f7; background: #f8fafc; font-size: 11px; color: #64748b; line-height: 1.6; }
.tl-foot b { color: #334155; }
.tl-empty { text-align: center; color: #94a3b8; padding: 32px 10px; font-size: 12px; }
`;

const SHIELD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;

export function createUI({ root = document.body, siteName = '本站', claims = [], getState, onClear } = {}) {
  const host = document.createElement('div');
  host.className = 'tl-root';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CSS;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button class="tl-fab" type="button" aria-label="打开数据透明面板">
      ${SHIELD}<span>数据透明</span><span class="tl-badge tl-ok">0</span>
    </button>
    <div class="tl-panel" role="dialog" aria-label="数据透明面板">
      <div class="tl-head">
        <div style="flex:1;min-width:0">
          <h3>🛡️ 数据透明面板</h3>
          <div class="tl-sub">${escapeHtml(siteName)} · 由 TrustLens 提供</div>
        </div>
        <button class="tl-x" type="button" aria-label="关闭">×</button>
      </div>
      <div class="tl-body"></div>
      <div class="tl-foot">
        <b>关于本面板：</b>TrustLens 是开源组件，仅在你的浏览器中运行，
        <b>自身不发起任何网络请求</b>，不保存请求内容（只保留字段名与体积），页面关闭即销毁。
      </div>
    </div>`;
  shadow.append(style, wrap);
  root.appendChild(host);

  const $ = (s) => shadow.querySelector(s);
  const fab = $('.tl-fab');
  const panel = $('.tl-panel');
  const body = $('.tl-body');
  const badge = $('.tl-badge');

  let filter = 'all';
  let openIds = new Set();

  fab.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) render();
  });
  $('.tl-x').addEventListener('click', () => panel.classList.remove('open'));

  function render() {
    const { summary } = getState();
    const risky = summary.byRisk.high + summary.byRisk.medium;

    // 徽标
    badge.textContent = String(summary.total);
    badge.classList.toggle('tl-ok', summary.byRisk.high === 0);

    // 概览
    const ov = document.createElement('div');
    ov.className = 'tl-overview' + (summary.userDataCount > 0 ? ' warn' : '');
    const claimCount = claims.length;
    ov.innerHTML = `
      <div class="tl-ov-title">本次浏览概览</div>
      <div class="tl-ov-row">
        <div><b>${summary.total}</b>总请求</div>
        <div style="color:#ef4444"><b>${summary.byRisk.high}</b>高风险</div>
        <div style="color:#f59e0b"><b>${summary.byRisk.medium}</b>需留意</div>
        <div style="color:#10b981"><b>${summary.byRisk.low}</b>低风险</div>
        <div><b>${summary.thirdPartyDomains.length}</b>第三方域名</div>
      </div>
      <div class="tl-ov-note">
        ${
          summary.userDataCount === 0
            ? `✅ 未检测到你的输入内容被发送到外部。站点已声明 <b>${claimCount}</b> 个接口。`
            : `⚠️ 有 <b>${summary.userDataCount}</b> 个请求涉及数据采集（追踪 / 凭证外发 / 未声明提交），已用橙色与红色标出。`
        }
      </div>`;

    // 过滤器
    const filters = document.createElement('div');
    filters.className = 'tl-filters';
    const chips = [['all', `全部 ${summary.total}`]];
    Object.entries(summary.byKind).forEach(([k, n]) => {
      chips.push([k, `${KIND_META[k]?.icon || ''} ${KIND_META[k]?.label || k} ${n}`]);
    });
    chips.forEach(([key, text]) => {
      const b = document.createElement('button');
      b.className = 'tl-chip' + (filter === key ? ' active' : '');
      b.textContent = text;
      b.addEventListener('click', () => {
        filter = key;
        render();
      });
      filters.appendChild(b);
    });

    body.innerHTML = '';
    body.append(ov, filters);

    const list = summary.classified.filter((c) => filter === 'all' || c.kind === filter);

    if (list.length === 0) {
      const e = document.createElement('div');
      e.className = 'tl-empty';
      e.textContent = '暂无请求记录';
      body.appendChild(e);
      return;
    }

    list
      .slice()
      .reverse()
      .forEach((c) => {
        const el = document.createElement('div');
        el.className = 'tl-item' + (openIds.has(c.raw.id) ? ' open' : '');
        const meta = KIND_META[c.kind] || KIND_META.unknown;
        const risk = RISK_META[c.risk];
        const fp = c.raw.bodyFingerprint;
        const fpText = fp
          ? fp.keys && fp.keys.length
            ? `字段：${escapeHtml(fp.keys.slice(0, 12).join('、'))}${fp.keys.length > 12 ? ' 等' : ''}`
            : `体积：${fp.size ?? '未知'} 字节`
          : '无请求体';

        el.innerHTML = `
          <div class="tl-item-top">
            <span class="tl-dot" style="background:${meta.color}"></span>
            <span class="tl-item-title">${escapeHtml(c.title)}</span>
            <span class="tl-method">${escapeHtml(c.raw.method)}</span>
          </div>
          <div class="tl-item-domain">${escapeHtml(c.raw.domain || '—')}${c.raw.status ? ` · ${c.raw.status}` : ''}${c.raw.duration != null ? ` · ${c.raw.duration}ms` : ''}</div>
          <div class="tl-detail">
            <div><b>这个请求做了什么？</b><br>${escapeHtml(c.detail)}</div>
            <div style="margin-top:6px"><b>携带了什么？</b><br>${fpText}（仅记录字段名，不保存内容）</div>
            <div style="margin-top:6px"><b>风险等级：</b><span style="color:${risk.color};font-weight:700">${risk.label}</span></div>
            <div style="margin-top:6px" class="tl-mono">${escapeHtml(truncate(c.raw.url, 220))}</div>
          </div>`;
        el.addEventListener('click', () => {
          const id = c.raw.id;
          openIds.has(id) ? openIds.delete(id) : openIds.add(id);
          el.classList.toggle('open');
        });
        body.appendChild(el);
      });
  }

  return {
    element: host,
    render,
    destroy() {
      host.remove();
    },
    setClaims(next) {
      claims = next || [];
    },
  };
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + '…' : s || '';
}
