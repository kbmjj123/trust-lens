/**
 * 请求采集层
 *
 * 隐私底线（自证清白的关键）：
 *   1. 组件自身不发起任何网络请求
 *   2. 请求体 / 请求头只保留「字段名」与「体积」，绝不保存具体值
 *   3. 记录只存内存，页面关闭即销毁，不写 localStorage / sessionStorage
 */

const MAX_RECORDS = 500;
const listeners = new Set();
const seenUrls = new Set();
let resourceObserver = null;

/* ────────────── 工具函数 ────────────── */

function safeParseUrl(url) {
  try {
    return new URL(url, typeof location !== 'undefined' ? location.href : 'http://localhost/');
  } catch {
    return null;
  }
}

/**
 * URL 脱敏：保留协议 / 域名 / 路径与查询参数名，将参数值替换为 ***。
 * 既满足「不保存具体值」的隐私底线，又不影响基于 host/path/keys 的分类。
 */
function maskUrl(url) {
  if (typeof url !== 'string') return url;
  const q = url.indexOf('?');
  if (q < 0) return url;
  const base = url.slice(0, q);
  const masked = url
    .slice(q + 1)
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      return eq < 0 ? pair : pair.slice(0, eq) + '=***';
    })
    .join('&');
  return base + '?' + masked;
}

/** 记录已采集的 URL，避免 sendBeacon / WebSocket 与 resource timing 重复计数 */
function markSeen(url) {
  const u = safeParseUrl(typeof url === 'string' ? url : String(url));
  const key = u ? u.href : String(url);
  if (seenUrls.has(key)) return true;
  seenUrls.add(key);
  return false;
}

export function getDomain(url) {
  const u = safeParseUrl(url);
  return u ? u.hostname : '';
}

export function isSameSite(url) {
  if (typeof location === 'undefined') return true;
  const u = safeParseUrl(url);
  return u ? u.hostname === location.hostname : true;
}

/** 请求头中是否携带身份凭证 */
export function hasCredentialHeader(headers) {
  if (!headers) return false;
  const keys = [];
  try {
    if (typeof headers.forEach === 'function') headers.forEach((v, k) => keys.push(String(k).toLowerCase()));
    else if (typeof headers === 'object') Object.keys(headers).forEach((k) => keys.push(k.toLowerCase()));
  } catch {
    return false;
  }
  return keys.some((k) => k === 'authorization' || k === 'cookie' || k === 'x-auth-token' || k === 'proxy-authorization');
}

/** 请求头脱敏：只保留键名 */
function headerKeys(headers) {
  const out = [];
  if (!headers) return out;
  try {
    if (typeof headers.forEach === 'function') headers.forEach((_v, k) => out.push(String(k).toLowerCase()));
    else if (typeof headers === 'object') Object.keys(headers).forEach((k) => out.push(String(k).toLowerCase()));
  } catch {
    /* noop */
  }
  return out;
}

/**
 * 请求体指纹：只提取字段名与体积，不保存任何值
 * 形如 { type: 'json', keys: ['name','email'], size: 128 }
 */
function fingerprintBody(body) {
  if (body === null || body === undefined) return null;
  try {
    if (typeof body === 'string') {
      const size = body.length;
      let keys = null;
      let type = 'text';
      try {
        const parsed = JSON.parse(body);
        type = 'json';
        keys = objKeys(parsed);
      } catch {
        // 可能是 a=b&c=d 表单串
        if (body.includes('=')) {
          type = 'form';
          keys = [...new URLSearchParams(body).keys()];
        }
      }
      return { type, keys, size };
    }
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return { type: 'form-data', keys: [...body.keys()], size: null };
    }
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
      return { type: 'form', keys: [...body.keys()], size: body.toString().length };
    }
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      return { type: 'blob', keys: null, size: body.size };
    }
    if (ArrayBuffer.isView(body) || body instanceof ArrayBuffer) {
      return { type: 'binary', keys: null, size: body.byteLength ?? body.length };
    }
    return { type: 'unknown', keys: null, size: null };
  } catch {
    return { type: 'unknown', keys: null, size: null };
  }
}

function objKeys(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 2) return [];
  const keys = Array.isArray(obj) ? [] : Object.keys(obj);
  return keys.slice(0, 50);
}

/* ────────────── 记录构造 ────────────── */

function createRecord({ url, method, body, headers, source, credentials = false }) {
  const rawUrl = url && typeof url === 'object' && url.url ? url.url : String(url);
  const safeUrl = maskUrl(rawUrl);
  const u = safeParseUrl(safeUrl);
  return {
    id: Math.random().toString(36).slice(2, 10),
    url: safeUrl,
    method: (method || 'GET').toUpperCase(),
    domain: u ? u.hostname : '',
    path: u ? u.pathname : '',
    sameSite: isSameSite(safeUrl),
    source, // fetch | xhr | resource | beacon | websocket
    startTime: Date.now(),
    duration: null,
    status: null,
    error: null,
    bodyFingerprint: fingerprintBody(body),
    headerKeys: headerKeys(headers),
    hasCredential: hasCredentialHeader(headers),
    crossOriginCreds: !!credentials,
    done: false,
  };
}

function push(rec) {
  records.push(rec);
  if (records.length > MAX_RECORDS) records.shift();
  emitUpdate(rec);
}

function emitUpdate(rec) {
  listeners.forEach((fn) => {
    try {
      fn(rec, records);
    } catch {
      /* noop */
    }
  });
}

/* ────────────── Hook：fetch ────────────── */

function hookFetch() {
  if (typeof window === 'undefined' || window.fetch !== 'function') return;
  const orig = window.fetch;
  if (orig.__trustLens) return;

  const patched = function (input, init) {
    let url;
    let method = 'GET';
    let body;
    let headers;

    if (typeof input === 'string' || (typeof URL !== 'undefined' && input instanceof URL)) {
      url = String(input);
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      url = input.url;
      method = input.method;
      headers = input.headers;
      if (!init) {
        // Request body 是流，无法同步读取，仅标记存在
        body = input.__tlBodyExists ? '[stream]' : null;
      }
    }
    if (init) {
      if (init.method) method = init.method;
      if (init.body !== undefined) body = init.body;
      if (init.headers) headers = init.headers;
    }
    const credentials = init && init.credentials === 'include';

    let rec;
    try {
      rec = createRecord({ url, method, body, headers, source: 'fetch', credentials });
      push(rec);
    } catch {
      rec = null;
    }

    const t0 = performance.now();
    return orig.apply(this, arguments).then(
      (res) => {
        if (rec) {
          rec.status = res.status;
          rec.duration = Math.round(performance.now() - t0);
          rec.done = true;
          emitUpdate(rec);
        }
        return res;
      },
      (err) => {
        if (rec) {
          rec.error = String((err && err.message) || err);
          rec.duration = Math.round(performance.now() - t0);
          rec.done = true;
          emitUpdate(rec);
        }
        throw err;
      }
    );
  };

  patched.__trustLens = true;
  window.fetch = patched;
}

/* ────────────── Hook：XMLHttpRequest ────────────── */

function hookXHR() {
  if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') return;
  const Orig = window.XMLHttpRequest;
  if (Orig.__trustLens) return;

  const proto = Orig.prototype;
  const origOpen = proto.open;
  const origSend = proto.send;
  const origSetHeader = proto.setRequestHeader;

  proto.open = function (method, url) {
    this.__tl = { method, url, headerKeys: [], crossOriginCreds: false };
    return origOpen.apply(this, arguments);
  };

  proto.setRequestHeader = function (k) {
    if (this.__tl) this.__tl.headerKeys.push(String(k).toLowerCase());
    return origSetHeader.apply(this, arguments);
  };

  proto.send = function (body) {
    if (this.__tl) {
      const m = this.__tl;
      m.crossOriginCreds = this.withCredentials === true;
      let rec;
      try {
        rec = createRecord({
          url: m.url,
          method: m.method,
          body,
          headers: m.headerKeys,
          source: 'xhr',
          credentials: m.crossOriginCreds,
        });
        rec.headerKeys = m.headerKeys;
        rec.hasCredential = m.headerKeys.some(
          (k) => k === 'authorization' || k === 'cookie' || k === 'x-auth-token'
        );
        push(rec);
        this.__tl.rec = rec;
        this.__tl.t0 = performance.now();
      } catch {
        /* noop */
      }
      const self = this;
      this.addEventListener('loadend', function () {
        if (self.__tl && self.__tl.rec) {
          self.__tl.rec.status = self.status || 0;
          self.__tl.rec.duration = Math.round(performance.now() - (self.__tl.t0 || 0));
          self.__tl.rec.done = true;
          emitUpdate(self.__tl.rec);
        }
      });
    }
    return origSend.apply(this, arguments);
  };

  Orig.__trustLens = true;
}

/* ────────────── Hook：sendBeacon ────────────── */

function hookBeacon() {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  const orig = navigator.sendBeacon;
  if (orig.__trustLens) return;
  const patched = function (url, data) {
    try {
      const rec = createRecord({
        url: String(url),
        method: data ? 'POST' : 'GET',
        body: data,
        source: 'beacon',
      });
      markSeen(String(url));
      push(rec);
    } catch {
      /* noop */
    }
    return orig.apply(this, arguments);
  };
  patched.__trustLens = true;
  navigator.sendBeacon = patched;
}

/* ────────────── Hook：WebSocket ────────────── */

function hookWebSocket() {
  if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') return;
  const Orig = window.WebSocket;
  if (Orig.__trustLens) return;
  function Patched(url, protocols) {
    try {
      const rec = createRecord({ url: String(url), method: 'WS', source: 'websocket' });
      markSeen(String(url));
      push(rec);
    } catch {
      /* noop */
    }
    return protocols ? new Orig(url, protocols) : new Orig(url);
  }
  Patched.prototype = Orig.prototype;
  Object.setPrototypeOf(Patched, Orig);
  Patched.__trustLens = true;
  window.WebSocket = Patched;
}

/* ────────────── 静态资源：PerformanceObserver ────────────── */

function observeResources() {
  if (typeof performance === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  // 页面加载前已发生的资源
  try {
    performance
      .getEntriesByType('resource')
      .slice(-200)
      .forEach((r) => {
        if (markSeen(r.name)) return;
        push(
          Object.assign(
            createRecord({ url: r.name, method: 'GET', source: 'resource' }),
            { duration: Math.round(r.duration), status: 200, done: true }
          )
        );
      });
  } catch {
    /* noop */
  }

  try {
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((r) => {
        if (r.entryType !== 'resource') return;
        if (markSeen(r.name)) return;
        push(
          Object.assign(
            createRecord({ url: r.name, method: 'GET', source: 'resource' }),
            { duration: Math.round(r.duration), status: 200, done: true }
          )
        );
      });
    });
    resourceObserver = po;
    po.observe({ entryTypes: ['resource'] });
  } catch {
    /* noop */
  }
}

/* ────────────── 对外接口 ────────────── */

export function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  hookFetch();
  hookXHR();
  hookBeacon();
  hookWebSocket();
  observeResources();
}

export function stop() {
  started = false;
  listeners.clear();
  seenUrls.clear();
  if (resourceObserver) {
    try {
      resourceObserver.disconnect();
    } catch {
      /* noop */
    }
    resourceObserver = null;
  }
}

export function getRecords() {
  return records.slice();
}

export function clearRecords() {
  records.length = 0;
  seenUrls.clear();
  emitUpdate(null);
}

export function onUpdate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const __internals = { fingerprintBody, headerKeys, maskUrl, markSeen };
