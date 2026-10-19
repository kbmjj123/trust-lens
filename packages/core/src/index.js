/**
 * TrustLens —— 让网站把数据流向摊开给用户看
 *
 * 隐私底线：
 *   · 组件自身零网络请求
 *   · 只保留请求字段名与体积，绝不保存内容
 *   · 记录仅存内存，页面关闭即销毁
 */

import * as collector from './collector.js';
import { normalizeClaims, gradeSite } from './claims.js';
import { summarize } from './classifier.js';
import { createUI } from './ui.js';

const DEFAULT_OPTIONS = {
  siteName: '本站',
  claims: [],
  position: 'bottom-right', // 预留
  theme: 'light',           // 预留
  autoStart: true,
  showFab: true,
  privacyUrl: '',
};

let instance = null;

/**
 * 初始化 TrustLens
 * @param {Object} options
 * @param {string} options.siteName  站点名称
 * @param {Array}  options.claims    接口声明
 * @param {boolean} options.showFab  是否显示右下角浮标
 * @returns {{destroy, refresh, getSummary, getGrade, getRecords}}
 */
export function init(options = {}) {
  if (instance) instance.destroy();
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { destroy() {}, refresh() {}, getSummary: () => emptySummary(), getGrade: () => gradeSite({ booted: false }), getRecords: () => [] };
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const claims = normalizeClaims(opts.claims);

  collector.start();

  const state = { summary: emptySummary() };
  const recompute = () => {
    state.summary = summarize(collector.getRecords(), claims);
  };
  recompute();

  let ui = null;
  if (opts.showFab) {
    ui = createUI({
      siteName: opts.siteName,
      claims,
      getState: () => state,
    });
    collector.onUpdate(() => {
      recompute();
      if (ui.element.shadowRoot?.querySelector('.tl-panel.open')) ui.render();
    });
  }

  instance = {
    options: opts,
    destroy() {
      ui?.destroy();
      collector.stop();
      instance = null;
    },
    refresh() {
      recompute();
      ui?.render();
    },
    getRecords: () => collector.getRecords(),
    getSummary: () => state.summary,
    getGrade: () =>
      gradeSite({
        booted: true,
        claimCount: claims.length,
        hasUnexpected: state.summary.hasUnexpected,
      }),
    // 供 CI 自动化验证使用：暴露只读快照
    __debug: () => ({
      version: '1.0.0',
      siteName: opts.siteName,
      claimCount: claims.length,
      ...state.summary,
      classified: undefined,
    }),
  };

  // 暴露到 window，便于 CI / 控制台审计
  try {
    window.TrustLens = Object.assign(window.TrustLens || {}, {
      instance,
      getSummary: instance.getSummary,
      getGrade: instance.getGrade,
    });
  } catch { /* noop */ }

  return instance;
}

function emptySummary() {
  return { total: 0, byKind: {}, byRisk: { low: 0, medium: 0, high: 0 }, userDataCount: 0, thirdPartyDomains: [], hasUnexpected: false, classified: [] };
}

/* ────────────── Web Component：<trust-lens> ────────────── */

export class TrustLensElement extends HTMLElement {
  connectedCallback() {
    const raw = this.getAttribute('claims');
    let claims = [];
    if (raw) {
      try {
        claims = JSON.parse(raw);
      } catch {
        claims = [];
      }
    }
    this.__tl = init({
      siteName: this.getAttribute('site-name') || '本站',
      claims,
      showFab: this.getAttribute('fab') !== 'false',
    });
  }
  disconnectedCallback() {
    this.__tl?.destroy();
  }
}

export function defineElement(tag = 'trust-lens') {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (!customElements.get(tag)) customElements.define(tag, TrustLensElement);
}

/* 导出底层能力，供高级用户自建 UI */
export { collector, normalizeClaims, summarize };

export default { init, defineElement, TrustLensElement };
