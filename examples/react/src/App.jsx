import { useRef, useState, useEffect, useCallback } from 'react';
import TrustLens from 'trust-lens-react';

// ── 站点声明：告诉用户每个接口在干什么、传了什么 ──
const CLAIMS = [
  {
    pattern: '/api/convert',
    label: '文件格式转换',
    data: '文件内容在你的浏览器本地处理，仅上传文件名用于生成记录',
    scope: 'input',
  },
  {
    pattern: '/api/prefs',
    label: '保存界面偏好',
    data: '仅保存主题与字号设置，不含你的文件内容',
    scope: 'meta',
  },
];

const EMPTY = { total: 0, high: 0, medium: 0, low: 0, third: 0 };

export default function App() {
  const tl = useRef(null);
  const [stats, setStats] = useState(EMPTY);
  const [grade, setGrade] = useState('—');

  const refresh = useCallback(() => {
    const s = tl.current?.getSummary?.();
    const g = tl.current?.getGrade?.();
    if (s) {
      setStats({
        total: s.total,
        high: s.byRisk.high,
        medium: s.byRisk.medium,
        low: s.byRisk.low,
        third: s.thirdPartyDomains.length,
      });
    }
    if (g) setGrade(`${g.level} · ${g.text}`);
  }, []);

  // 请求是异步的，稍等一下再取统计
  const afterRequest = () => setTimeout(refresh, 300);

  const callDeclared = () => {
    fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 注意：这些值永远不会进入 TrustLens 的记录
      body: JSON.stringify({ filename: '私密文件.pdf', content: '敏感内容' }),
    }).catch(() => {});
    afterRequest();
  };

  const callUndeclared = () => {
    fetch('/api/secret-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '123456' }),
    }).catch(() => {});
    afterRequest();
  };

  const callTracker = () => {
    fetch('https://www.google-analytics.com/g/collect?v=1&tid=UA-DEMO', { method: 'POST' }).catch(() => {});
    afterRequest();
  };

  useEffect(() => {
    const t = setTimeout(refresh, 500);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div>
      <h1>TrustLens · React 接入示例</h1>
      <p className="lead">
        右下角有一个「🛡️ 数据透明」浮标，点开就能看到本页发出的每一个请求，以及它被翻译成了什么人话。
      </p>

      <div className="tip">
        这个示例用 <code>&lt;TrustLens&gt;</code> 组件挂载，通过 <code>ref</code> 取出统计数据自己渲染 ——
        说明组件既可以自带浮窗，也可以把数据交给你自建 UI。
      </div>

      <h2>① 触发请求，观察面板分类</h2>
      <div className="btn-row">
        <button className="primary" onClick={callDeclared}>触发「已声明」接口</button>
        <button onClick={callUndeclared}>触发「未声明」提交</button>
        <button onClick={callTracker}>触发「第三方追踪」</button>
        <button onClick={refresh}>刷新统计</button>
      </div>
      <p>
        提交体里写了 <code>filename</code>、<code>password</code> 等字段，
        打开面板你只会看到<b>字段名</b>，看不到任何值 —— 这是组件的设计底线。
      </p>

      <h2>② 用 ref 读取实时统计</h2>
      <div className="stat-grid">
        <div className="card"><span className="num">{stats.total}</span><span className="lbl">总请求</span></div>
        <div className="card"><span className="num" style={{ color: '#ef4444' }}>{stats.high}</span><span className="lbl">高风险</span></div>
        <div className="card"><span className="num" style={{ color: '#f59e0b' }}>{stats.medium}</span><span className="lbl">需留意</span></div>
        <div className="card"><span className="num" style={{ color: '#10b981' }}>{stats.low}</span><span className="lbl">低风险</span></div>
        <div className="card"><span className="num">{stats.third}</span><span className="lbl">第三方域名</span></div>
      </div>
      <p>当前站点透明度等级：<b>{grade}</b></p>

      <h2>③ 接入代码</h2>
      <pre><code>{`import { useRef } from 'react'
import TrustLens from 'trust-lens-react'

const claims = [
  {
    pattern: '/api/convert',
    label: '文件格式转换',
    data: '文件内容在浏览器本地处理，仅上传文件名',
    scope: 'input',
  },
]

export default function App() {
  const tl = useRef()
  // tl.current.getSummary() / getRecords() / getGrade()

  return <TrustLens ref={tl} siteName="我的工具站" claims={claims} />
}`}</code></pre>

      {/* 挂载即启用；组件本身不渲染可见 DOM，浮窗由 Shadow DOM 承载 */}
      <TrustLens ref={tl} siteName="React 示例站" claims={CLAIMS} />
    </div>
  );
}
