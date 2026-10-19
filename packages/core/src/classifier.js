/**
 * 请求分类：把技术请求翻译成普通人能看懂的话
 *
 * 分类优先级（从最确定到最不确定）：
 *   静态资源 → 已知追踪域名 → 站点已声明 → 跨站凭证 → 携带用户数据但未声明 → 未知
 */

import { matchTracker, KIND_LABEL } from './trackers.js';
import { matchClaim, SCOPE_LABEL } from './claims.js';

const STATIC_EXT = /\.(js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wasm|map|json|txt|xml)$/i;

const INITIATOR_LABEL = {
  link: '样式表',
  script: '脚本',
  img: '图片',
  css: '样式引用的资源',
  fetch: '数据请求',
  xmlhttprequest: '数据请求',
  iframe: '嵌入页面',
  font: '字体',
  video: '视频',
  audio: '音频',
  beacon: '信标上报',
  other: '其他资源',
};

/** 判断该请求是否「携带了用户数据」 */
function carriesUserData(rec) {
  // 非 GET 且请求体有字段 → 大概率在提交数据
  if (rec.method !== 'GET' && rec.method !== 'HEAD' && rec.bodyFingerprint) {
    const fp = rec.bodyFingerprint;
    if (fp.keys && fp.keys.length > 0) return true;
    if (fp.size && fp.size > 0) return true;
  }
  // GET 但是查询串很长 / 带明显数据参数
  if (rec.method === 'GET') {
    const q = rec.url.split('?')[1];
    if (q && q.length > 12) {
      const keys = [...new URLSearchParams(q).keys()].filter((k) => !/^_t$|timestamp|ts$|v$/.test(k));
      if (keys.length > 0) return true;
    }
  }
  return false;
}

/**
 * 单条请求分类
 * @returns {{kind, risk, title, detail, tags:string[]}}
 */
export function classify(rec, claims = []) {
  const tags = [];
  const host = rec.domain;

  // ── 1. 静态资源 ──
  if (
    rec.source === 'resource' ||
    (rec.method === 'GET' && STATIC_EXT.test(rec.path) && rec.source !== 'beacon')
  ) {
    const ext = (rec.path.match(STATIC_EXT) || [])[1];
    const kindName = ext ? guessAssetName(ext) : INITIATOR_LABEL[rec.initiatorType] || '静态资源';
    // 静态资源若命中追踪域名，仍然要标出来
    const tr = matchTracker(rec.url);
    if (tr) {
      return {
        kind: 'tracker',
        risk: 'medium',
        title: `${KIND_LABEL[tr.kind] || '第三方'}（${tr.vendor}）`,
        detail: `这是由 ${tr.vendor} 提供的${KIND_LABEL[tr.kind] || '第三方'}脚本。它会看到你的 IP、浏览器信息与当前页面地址。`,
        tags: ['第三方', tr.vendor],
      };
    }
    // 第三方资源若 URL 携带了数据参数（如追踪像素），视为未声明的数据提交
    if (!rec.sameSite && carriesUserData(rec)) {
      return {
        kind: 'unexpected',
        risk: 'high',
        title: `向 ${host} 提交了数据（站点未声明）`,
        detail: `这是一个 GET 请求，URL 中携带了你相关的参数，但站点没有声明它的用途。建议向站点所有者确认。`,
        tags: ['未声明', 'GET'],
      };
    }
    return {
      kind: 'static',
      risk: 'low',
      title: `加载${kindName}`,
      detail: `用于呈现页面${rec.sameSite ? '' : `（来自 ${host}）`}，不包含你输入的任何内容。`,
      tags: rec.sameSite ? ['本站资源'] : ['外部 CDN'],
    };
  }

  // ── 2. 已知追踪域名 ──
  const tracker = matchTracker(rec.url);
  if (tracker) {
    return {
      kind: 'tracker',
      risk: 'high',
      title: `${KIND_LABEL[tracker.kind] || '第三方追踪'}：${tracker.vendor}`,
      detail: `该请求发往 ${tracker.vendor} 的${KIND_LABEL[tracker.kind] || '追踪'}服务，可能记录你的浏览行为、设备信息或当前页面地址。`,
      tags: ['第三方', tracker.vendor, KIND_LABEL[tracker.kind] || '追踪'],
    };
  }

  // ── 3. 站点已声明 ──
  const claim = matchClaim(rec.url, claims);
  if (claim) {
    const riskByScope = { none: 'low', meta: 'low', input: 'medium', credential: 'high' };
    return {
      kind: 'declared',
      risk: riskByScope[claim.scope] || 'medium',
      title: claim.label,
      detail:
        claim.data ||
        `站点已声明此接口的用途。数据范围：${SCOPE_LABEL[claim.scope] || '传输您提交的内容'}。`,
      tags: ['已声明', claim.label],
      claim,
    };
  }

  // ── 4. 跨站携带凭证 ──
  if ((rec.hasCredential || rec.crossOriginCreds) && !rec.sameSite) {
    return {
      kind: 'credential',
      risk: 'high',
      title: `向 ${host} 发送了身份凭证`,
      detail: `该请求携带 Authorization / Cookie 等身份信息，且目标不是本站。请确认你是否信任 ${host}。`,
      tags: ['第三方', '身份凭证'],
    };
  }

  // ── 5. 携带用户数据但未声明 ──
  if (carriesUserData(rec)) {
    return {
      kind: 'unexpected',
      risk: 'high',
      title: `向 ${host} 提交了数据（站点未声明）`,
      detail: `这是一个 ${rec.method} 请求，包含你提交的内容，但站点没有声明它的用途。建议向站点所有者确认。`,
      tags: ['未声明', rec.method],
    };
  }

  // ── 6. 本站普通请求 ──
  if (rec.sameSite) {
    return {
      kind: 'internal',
      risk: 'low',
      title: '本站数据请求',
      detail: `与 ${host} 通信${rec.status ? `，返回状态 ${rec.status}` : ''}。未检测到你提交的内容。`,
      tags: ['本站'],
    };
  }

  // ── 7. WebSocket / 实时连接 ──
  if (rec.source === 'websocket') {
    return rec.sameSite
      ? {
          kind: 'internal',
          risk: 'low',
          title: '本站实时连接',
          detail: `与 ${host} 建立了 WebSocket 实时连接，未检测到你提交的内容或身份凭证。`,
          tags: ['本站'],
        }
      : {
          kind: 'unknown',
          risk: 'medium',
          title: `与 ${host} 建立实时连接`,
          detail: `与 ${host} 建立了 WebSocket 连接。实时通道不在常规请求采集范围内，请确认你是否信任该连接。`,
          tags: ['第三方'],
        };
  }

  return {
    kind: 'unknown',
    risk: 'medium',
    title: `向 ${host} 发起请求`,
    detail: '无法自动判断用途，未检测到你提交的内容或身份凭证。',
    tags: ['第三方'],
  };
}

function guessAssetName(ext) {
  const map = {
    js: '脚本', mjs: '脚本', css: '样式', png: '图片', jpg: '图片', jpeg: '图片',
    gif: '图片', svg: '图片', webp: '图片', ico: '图标', woff2: '字体', woff: '字体',
    ttf: '字体', otf: '字体', eot: '字体', mp4: '视频', webm: '视频', mp3: '音频',
    wasm: '计算模块', map: '调试映射', json: '数据文件', txt: '文本', xml: '数据文件',
  };
  return map[ext.toLowerCase()] || '静态资源';
}

export const KIND_META = {
  static: { label: '页面资源', color: '#10b981', icon: '📦' },
  declared: { label: '已声明接口', color: '#3b82f6', icon: '✅' },
  internal: { label: '本站通信', color: '#0ea5e9', icon: '🔄' },
  tracker: { label: '第三方追踪', color: '#f59e0b', icon: '🎯' },
  credential: { label: '身份凭证外发', color: '#ef4444', icon: '🔑' },
  unexpected: { label: '未声明的数据提交', color: '#ef4444', icon: '⚠️' },
  unknown: { label: '用途不明', color: '#94a3b8', icon: '❓' },
};

export const RISK_META = {
  low: { label: '低风险', color: '#10b981' },
  medium: { label: '需留意', color: '#f59e0b' },
  high: { label: '高风险', color: '#ef4444' },
};

/** 汇总统计 */
export function summarize(records, claims = []) {
  const classified = records.map((r) => ({ raw: r, ...classify(r, claims) }));
  const byKind = {};
  const byRisk = { low: 0, medium: 0, high: 0 };
  let userDataCount = 0;

  classified.forEach((c) => {
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
    byRisk[c.risk] = (byRisk[c.risk] || 0) + 1;
    if (c.kind === 'unexpected' || c.kind === 'credential' || c.kind === 'tracker') userDataCount++;
  });

  const thirdPartyDomains = [...new Set(classified.filter((c) => !c.raw.sameSite).map((c) => c.raw.domain))];

  return {
    total: classified.length,
    byKind,
    byRisk,
    userDataCount,
    thirdPartyDomains,
    hasUnexpected: byKind.unexpected > 0 || byKind.credential > 0,
    classified,
  };
}
