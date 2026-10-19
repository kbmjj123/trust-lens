/**
 * 站点声明（Claims）解析与匹配
 *
 * 站点通过 claims 主动声明「每个接口是干什么的 / 传了什么数据」。
 * TrustLens 只负责把「声明」与「实际发生的请求」做比对，
 * 未声明却携带用户数据的请求会被如实标出 —— 站点没有机会撒谎。
 */

/**
 * @typedef {Object} Claim
 * @property {string|RegExp|function} pattern  URL 匹配规则
 * @property {string} label  接口用途（人话，例："格式转换"）
 * @property {string} data   数据说明（人话，例："文件内容本地处理，不上传"）
 * @property {'none'|'input'|'meta'|'credential'} [scope] 数据敏感度，默认 input
 */

/**
 * 规范化 claims：把各种写法统一成 { test(url), label, data, scope }
 * @param {Claim[]|Object|string} claims
 */
export function normalizeClaims(claims) {
  if (!claims) return [];

  // 支持 object map 写法：{ "/api/convert": { label, data } }
  if (!Array.isArray(claims) && typeof claims === 'object') {
    claims = Object.entries(claims).map(([pattern, v]) =>
      typeof v === 'string' ? { pattern, label: v, data: '' } : { pattern, ...v }
    );
  }
  if (!Array.isArray(claims)) return [];

  return claims
    .filter(Boolean)
    .map((c) => {
      let test;
      if (typeof c.pattern === 'function') test = c.pattern;
      else if (c.pattern instanceof RegExp) test = (url) => c.pattern.test(url);
      else if (typeof c.pattern === 'string') {
        const s = c.pattern;
        // 支持极简 glob：* 通配
        if (s.includes('*')) {
          const re = new RegExp('^' + s.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
          test = (url) => re.test(url);
        } else {
          test = (url) => url.includes(s);
        }
      } else test = () => false;

      return {
        test,
        label: c.label || '已声明接口',
        data: c.data || '',
        scope: c.scope || 'input',
      };
    });
}

/** 返回首个命中的声明，未命中返回 null */
export function matchClaim(url, claims) {
  for (const c of claims) {
    try {
      if (c.test(url)) return c;
    } catch {
      /* 忽略非法正则 */
    }
  }
  return null;
}

export const SCOPE_LABEL = {
  none: '不传输用户数据',
  input: '传输您提交的内容',
  meta: '仅传输匿名统计信息',
  credential: '传输您的身份凭证',
};

/** 站点整体透明度等级：L1 仅接入 / L2 已声明 / L3 声明完整且无异常 */
export function gradeSite({ booted, claimCount, hasUnexpected }) {
  if (!booted) return { level: 'L0', text: '未接入' };
  if (claimCount === 0) return { level: 'L1', text: '已接入，未声明接口' };
  if (hasUnexpected) return { level: 'L2', text: '已声明，存在未声明请求' };
  return { level: 'L3', text: '声明完整，实测一致' };
}
