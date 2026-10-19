/**
 * 已知追踪 / 数据采集域名表
 * 由社区维护，欢迎 PR 补充（见 CONTRIBUTING.md）
 *
 * kind 取值：analytics(分析) / ads(广告) / social(社交) / session(会话录制) / error(错误上报)
 */
export const TRACKER_PATTERNS = [
  // ── 网站分析 ──
  { domain: 'google-analytics.com', vendor: 'Google', kind: 'analytics' },
  { domain: 'analytics.google.com', vendor: 'Google', kind: 'analytics' },
  { domain: 'googletagmanager.com', vendor: 'Google', kind: 'analytics' },
  { domain: 'googlesyndication.com', vendor: 'Google', kind: 'ads' },
  { domain: 'doubleclick.net', vendor: 'Google', kind: 'ads' },
  { domain: 'baidu.com', vendor: 'Baidu', kind: 'analytics', pathHint: /^\/(hm\.js|hm\.gif)/ },
  { domain: 'hm.baidu.com', vendor: 'Baidu', kind: 'analytics' },
  { domain: 'cnzz.com', vendor: 'CNZZ', kind: 'analytics' },
  { domain: 'umeng.com', vendor: 'Umeng', kind: 'analytics' },
  { domain: 'matomo.cloud', vendor: 'Matomo', kind: 'analytics' },
  { domain: 'plausible.io', vendor: 'Plausible', kind: 'analytics' },
  { domain: 'vercel-insights.com', vendor: 'Vercel', kind: 'analytics' },
  { domain: 'clarity.ms', vendor: 'Microsoft', kind: 'session' },
  { domain: 'hotjar.com', vendor: 'Hotjar', kind: 'session' },
  { domain: 'fullstory.com', vendor: 'FullStory', kind: 'session' },

  // ── 广告 ──
  { domain: 'adservice.google.com', vendor: 'Google', kind: 'ads' },
  { domain: 'facebook.net', vendor: 'Meta', kind: 'ads' },
  { domain: 'facebook.com', vendor: 'Meta', kind: 'social', pathHint: /^\/tr/ },
  { domain: 'adsrvr.org', vendor: 'The Trade Desk', kind: 'ads' },
  { domain: 'criteo.com', vendor: 'Criteo', kind: 'ads' },
  { domain: 'taboola.com', vendor: 'Taboola', kind: 'ads' },
  { domain: 'outbrain.com', vendor: 'Outbrain', kind: 'ads' },

  // ── 社交插件 ──
  { domain: 'platform.twitter.com', vendor: 'X / Twitter', kind: 'social' },
  { domain: 'connect.facebook.net', vendor: 'Meta', kind: 'social' },
  { domain: 'widgets.pinterest.com', vendor: 'Pinterest', kind: 'social' },

  // ── 错误 / 性能监控 ──
  { domain: 'sentry.io', vendor: 'Sentry', kind: 'error' },
  { domain: 'sentry-cdn.com', vendor: 'Sentry', kind: 'error' },
  { domain: 'bugsnag.com', vendor: 'Bugsnag', kind: 'error' },
  { domain: 'rollbar.com', vendor: 'Rollbar', kind: 'error' },
  { domain: 'newrelic.com', vendor: 'New Relic', kind: 'error' },
  { domain: 'nr-data.net', vendor: 'New Relic', kind: 'error' },
];

export const KIND_LABEL = {
  analytics: '网站分析',
  ads: '广告投放',
  social: '社交插件',
  session: '会话录制',
  error: '错误上报',
};

/** 匹配追踪域名，命中返回 { vendor, kind } */
export function matchTracker(url) {
  let host = '';
  let path = '';
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.href : 'http://localhost');
    host = u.hostname;
    path = u.pathname;
  } catch {
    return null;
  }
  for (const t of TRACKER_PATTERNS) {
    // 域名后缀匹配（含子域）
    if (host === t.domain || host.endsWith('.' + t.domain)) {
      // 若规则限定了路径特征，则路径必须匹配
      if (t.pathHint && !t.pathHint.test(path)) continue;
      return { vendor: t.vendor, kind: t.kind };
    }
  }
  return null;
}
