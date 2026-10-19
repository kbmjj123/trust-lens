<script setup>
import { ref, onMounted } from 'vue';
import { TrustLens } from 'trust-lens-vue';

// ── 站点声明：告诉用户每个接口在干什么、传了什么 ──
const claims = [
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

const tl = ref(null);
const stats = ref({ total: 0, high: 0, medium: 0, low: 0, third: 0 });
const grade = ref('—');

function refresh() {
  const s = tl.value?.getSummary?.();
  const g = tl.value?.getGrade?.();
  if (s) {
    stats.value = {
      total: s.total,
      high: s.byRisk.high,
      medium: s.byRisk.medium,
      low: s.byRisk.low,
      third: s.thirdPartyDomains.length,
    };
  }
  if (g) grade.value = `${g.level} · ${g.text}`;
}

// 请求是异步的，稍等一下再取统计
function afterRequest() {
  setTimeout(refresh, 300);
}

function callDeclared() {
  fetch('/api/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // 注意：这些值永远不会进入 TrustLens 的记录
    body: JSON.stringify({ filename: '私密文件.pdf', content: '敏感内容' }),
  }).catch(() => {});
  afterRequest();
}

function callUndeclared() {
  fetch('/api/secret-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '123456' }),
  }).catch(() => {});
  afterRequest();
}

function callTracker() {
  fetch('https://www.google-analytics.com/g/collect?v=1&tid=UA-DEMO', { method: 'POST' }).catch(() => {});
  afterRequest();
}

onMounted(() => setTimeout(refresh, 500));
</script>

<template>
  <div>
    <h1>TrustLens · Vue 3 接入示例</h1>
    <p class="lead">
      右下角有一个「🛡️ 数据透明」浮标，点开就能看到本页发出的每一个请求，以及它被翻译成了什么人话。
    </p>

    <div class="tip">
      这个示例用 <code>&lt;TrustLens&gt;</code> 组件挂载，通过 <code>ref</code> 取出统计数据自己渲染 ——
      说明组件既可以自带浮窗，也可以把数据交给你自建 UI。
    </div>

    <h2>① 触发请求，观察面板分类</h2>
    <div class="btn-row">
      <button class="primary" @click="callDeclared">触发「已声明」接口</button>
      <button @click="callUndeclared">触发「未声明」提交</button>
      <button @click="callTracker">触发「第三方追踪」</button>
      <button @click="refresh">刷新统计</button>
    </div>
    <p>
      提交体里写了 <code>filename</code>、<code>password</code> 等字段，
      打开面板你只会看到<b>字段名</b>，看不到任何值 —— 这是组件的设计底线。
    </p>

    <h2>② 用 ref 读取实时统计</h2>
    <div class="stat-grid">
      <div class="card"><span class="num">{{ stats.total }}</span><span class="lbl">总请求</span></div>
      <div class="card"><span class="num" style="color:#ef4444">{{ stats.high }}</span><span class="lbl">高风险</span></div>
      <div class="card"><span class="num" style="color:#f59e0b">{{ stats.medium }}</span><span class="lbl">需留意</span></div>
      <div class="card"><span class="num" style="color:#10b981">{{ stats.low }}</span><span class="lbl">低风险</span></div>
      <div class="card"><span class="num">{{ stats.third }}</span><span class="lbl">第三方域名</span></div>
    </div>
    <p>当前站点透明度等级：<b>{{ grade }}</b></p>

    <h2>③ 接入代码</h2>
    <pre><code>&lt;script setup&gt;
import { ref } from 'vue'
import { TrustLens } from 'trust-lens-vue'

const claims = [
  {
    pattern: '/api/convert',
    label: '文件格式转换',
    data: '文件内容在浏览器本地处理，仅上传文件名',
    scope: 'input',
  },
]

const tl = ref()
// tl.value.getSummary() / getRecords() / getGrade()
&lt;/script&gt;

&lt;template&gt;
  &lt;TrustLens ref="tl" site-name="我的工具站" :claims="claims" /&gt;
&lt;/template&gt;</code></pre>

    <!-- 挂载即启用；组件本身不渲染可见 DOM，浮窗由 Shadow DOM 承载 -->
    <TrustLens ref="tl" site-name="Vue 示例站" :claims="claims" />
  </div>
</template>
