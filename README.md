# 🔍 TrustLens

> 让网站把数据流向摊开给用户看 —— 零依赖、零网络请求、零内容留存的开源透明组件。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Bundle size](https://img.shields.io/badge/CDN%20Bundle-25KB-brightgreen.svg)](./packages/core/dist)

---

## 它解决什么问题

纯前端工具站都在说「你的数据不会上传到服务器」，但用户**无法验证**。

TrustLens 把这个口头承诺变成**可亲眼看到的事实**：

- 用户点开右下角浮标，就能看到这个页面发出的每一个请求
- 每个请求都被翻译成人话：「📊 向 Google 上报了你的浏览行为」而不是 `POST /g/collect`
- 站点声明了哪些接口传了什么数据，组件就如实展示；**没声明却偷偷传数据的，会被标红**

对站点方来说，这是最低成本的信任基建；对用户来说，这是一面能照出数据流向的镜子。

---

## 效果预览

```
┌──────────────────────────────────────────┐
│ 🛡️ 数据透明面板          JSON 格式化工具  │
├──────────────────────────────────────────┤
│  本次浏览概览                             │
│  6 总请求   1 高风险   1 需留意   4 低风险 │
│  ✅ 未检测到你的输入内容被发送到外部       │
├──────────────────────────────────────────┤
│ ✅ 文件格式转换              POST         │
│    127.0.0.1 · 200 · 12ms                │
│    ├ 这个请求做了什么？                   │
│    │  文件内容在你的浏览器本地处理         │
│    ├ 携带了什么？                         │
│    │  字段：filename（仅字段名，不含内容） │
│    └ 风险等级：需留意                     │
├──────────────────────────────────────────┤
│ ⚠️ 向 127.0.0.1 提交了数据（站点未声明）  │
│    建议向站点所有者确认                   │
└──────────────────────────────────────────┘
```

---

## 快速开始

### ① CDN（推荐，静态站零构建）

```html
<!-- 放在 </body> 前，defer 保证不阻塞渲染 -->
<script src="https://cdn.jsdelivr.net/npm/trust-lens-core/dist/trust-lens.min.js" defer></script>

<trust-lens
  site-name="我的工具站"
  claims='[
    {"pattern":"/api/convert","label":"文件格式转换","data":"文件内容在浏览器本地处理，仅上传文件名","scope":"input"}
  ]'>
</trust-lens>
```

想彻底摆脱第三方 CDN？下载 `trust-lens.min.js`（25KB）放到自己的服务器即可。

### ② Vue 3

```bash
npm i trust-lens-core trust-lens-vue
```

```vue
<script setup>
import { TrustLens } from 'trust-lens-vue'

const claims = [
  { pattern: '/api/convert', label: '文件格式转换', data: '本地处理，不上传内容', scope: 'input' },
]
</script>

<template>
  <TrustLens site-name="我的工具站" :claims="claims" />
</template>
```

### ③ React

```bash
npm i trust-lens-core trust-lens-react
```

```jsx
import TrustLens from 'trust-lens-react'

const claims = [
  { pattern: '/api/convert', label: '文件格式转换', data: '本地处理，不上传内容', scope: 'input' },
]

export default function App() {
  return <TrustLens siteName="我的工具站" claims={claims} />
}
```

不想要浮窗，只想自己渲染 UI？组件返回 `null`，用 `ref` 拿数据自建界面：

```jsx
const ref = useRef()
// ref.current.getSummary() / getRecords() / getGrade()
<TrustLens ref={ref} claims={claims} showFab={false} />
```

---

## 声明接口：claims

站点通过 `claims` 主动说明「每个接口在干什么」。组件会拿声明与实际请求做比对。

```js
{
  pattern: '/api/convert',                  // 字符串子串 / glob(*) / 正则 / 函数
  label: '文件格式转换',                     // 人话用途
  data: '文件内容在浏览器本地处理，仅上传文件名', // 人话数据说明
  scope: 'input'                            // none | meta | input | credential
}
```

`scope` 决定风险色：`none`/`meta` 绿色，`input` 橙色，`credential` 红色。

**不写 claims 也可以跑**，只是所有数据请求会被标成「未声明」，拿不到 L3 等级。

---

## 请求是怎么被翻译的

| 分类 | 含义 | 风险 |
|---|---|:---:|
| 📦 页面资源 | 脚本 / 样式 / 字体 / 图片，不含用户输入 | 🟢 |
| ✅ 已声明接口 | 站点已说明用途，附带站点自己的说明 | 🟢🟠 |
| 🔄 本站通信 | 与本站域名通信，未检测到提交内容 | 🟢 |
| 🎯 第三方追踪 | 命中内置追踪域名表（Google Analytics / 百度统计 / Sentry 等 30+） | 🟠🔴 |
| 🔑 身份凭证外发 | 向**非本站**域名发送了 Cookie / Authorization | 🔴 |
| ⚠️ 未声明的数据提交 | 携带了用户数据，但站点没声明这个接口 | 🔴 |
| ❓ 用途不明 | 无法自动判断 | 🟠 |

---

## 隐私底线（可被审计的承诺）

一个透明度工具，必须自己先做到透明。组件严格遵守三条底线，欢迎逐行审计：

| 底线 | 实现 |
|---|---|
| **零网络请求** | 组件自身不发起任何请求，不加载远程字体 / 图标 / 脚本 |
| **零内容留存** | 请求体只保留**字段名与体积**，请求头只保留**键名**，绝不保存具体值 |
| **零持久化** | 记录仅存内存，页面关闭即销毁，不写 localStorage / IndexedDB |

> 例如你提交 `{password: "123456"}`，面板只会显示「字段：password」，值为 `123456` 的事实**根本不会进入组件的任何数据结构**。

想在控制台自查？打开任意集成了 TrustLens 的页面：

```js
TrustLens.getSummary()   // 当前统计
TrustLens.getGrade()     // 站点透明度等级
```

---

## 🌐 Showcase 展示墙

集成了 TrustLens 的站点可以提交 PR 加入展示墙，README 与官网会展示你的站点名称、简介与外链。

| 站点 | 简介 | 等级 |
|---|---|:---:|
| [TrustLens 官方示例站](https://trustlens.dev) | 组件能力演示 | 🥇 L3 |

**等级由 CI 自动判定，不靠自评：**

| 等级 | 条件 | 展示权重 |
|:---:|---|:---:|
| 🥇 L3 | 声明完整 + 实测无未声明的数据提交 | 精选区 + 首页推荐 |
| 🥈 L2 | 已声明接口，但存在未声明请求 | 卡片区 |
| 🥉 L1 | 仅引入组件 | 列表区 |

验证方式：GitHub Actions 用真实浏览器访问你的站点，检测组件是否渲染、声明是否完整、有无未声明的数据提交。

👉 完整规则见 [CONTRIBUTING.md](./CONTRIBUTING.md)。提交前请确认站点有实质内容、合法合规、公开可访问。

---

## 项目结构

```
trust-lens/
├── packages/                # 三个发布包
│   ├── core/                # 零依赖核心（25KB CDN 单文件）
│   │   ├── src/
│   │   │   ├── collector.js    请求采集：fetch / XHR / Resource Timing
│   │   │   ├── classifier.js   请求分类 —— 翻译成人话
│   │   │   ├── claims.js       站点声明匹配
│   │   │   ├── trackers.js     追踪域名表（社区维护）
│   │   │   ├── ui.js           Shadow DOM 浮窗
│   │   │   └── index.js        入口 + Web Component
│   │   └── dist/               三种产物：esm / cjs / min(IIFE)
│   ├── vue/                 # trust-lens-vue（零构建）
│   └── react/               # trust-lens-react（零构建，纯 JS 无 JSX）
├── examples/                # 可运行示例工程
│   ├── cdn.html             纯 HTML + CDN
│   ├── vue3/                Vue 3 + Vite 完整工程
│   └── react/               React 18 + Vite 完整工程
├── showcase/sites.json      # 展示墙数据源（PR 改这里）
├── scripts/
│   ├── verify-site.mjs      单站点验证（真实浏览器）
│   └── verify-pr.mjs        PR 批量验证
├── test-local.mjs           # core 功能验证
└── test-examples.mjs        # 示例工程端到端验证
```

两个 wrapper 包（`vue` / `react`）都是**零构建**的：
Vue 版用 `h()` 渲染函数，React 版用 `createElement`，不含任何 JSX / SFC，
发布到 npm 时无需编译步骤。

---

## 本地开发

```bash
npm install
npm run build            # 打包 core → packages/core/dist
node test-local.mjs      # 起本地服务 + 真实浏览器跑功能验证
node scripts/verify-site.mjs https://your-site.com   # 验证任意线上站点
```

## 可运行的示例工程

`examples/` 下有三个**开箱即跑**的完整工程，详见 [examples/README.md](./examples/README.md)。

| 示例 | 启动方式 |
|---|---|
| 纯 HTML + CDN | 浏览器直接打开 `examples/cdn.html` |
| Vue 3 + Vite | `cd examples/vue3 && npm install && npm run dev` |
| React 18 + Vite | `cd examples/react && npm install && npm run dev` |

示例内置了 `/api/*` 假接口和三个触发按钮，可以真实看到「已声明 / 未声明 / 第三方追踪」
三类请求是怎么被识别和翻译的。同时也演示了**自带浮窗**和**用 ref 自建 UI**两种姿势。

改完组件源码后跑端到端验证：

```bash
cd examples/vue3  && npx vite build
cd examples/react && npx vite build
node test-examples.mjs   # 真实浏览器打开两个构建产物并断言
```

---

## 路线图

- [x] 核心采集与分类
- [x] CDN / Vue3 / React 三种接入
- [x] Showcase 与 CI 自动等级判定
- [ ] 规则库插件机制（社区众包追踪域名）
- [ ] 多语言（英文版文案）
- [ ] 自定义面板主题与埋点无关的导出报告
- [ ] 与 Privacy Badger 等扩展的联动展示

---

## 常见问题

**Q：响应体能看到吗？**
A：不能。浏览器限制了 JS 读取响应体，组件只采集 URL、方法、状态码、耗时、请求头键名与请求体字段名。

**Q：会影响页面性能吗？**
A：fetch / XHR 走轻量包装（只记录元数据），静态资源走 PerformanceObserver 原生采集，不侵入。CDN 单文件 25KB，`defer` 加载不阻塞渲染。

**Q：站点偷偷不声明就能绕过吗？**
A：不能。未声明但携带数据的请求会被标为「⚠️ 未声明的数据提交」并算高风险 —— 站点没有机会撒谎，只能选择透明。

**Q：能提交到 cdnjs 吗？**
A：npm 包已自动支持 jsDelivr / unpkg。cdnjs 需要通过其官方流程申请，欢迎协助提交。

---

## 已知限制（透明承诺的边界）

TrustLens 通过 Monkey-patch 采集请求，以下边界请在集成前知悉：

- **提前缓存 `fetch` 引用会绕过拦截**：若页面在组件初始化前执行了 `const f = window.fetch; f(...)`，该调用不会被记录。组件应在应用入口尽早引入。
- **WebSocket / sendBeacon 仅记录连接与目标**：实时通道与信标会被记录「与谁通信」，但无法读取其帧内容（同样符合「不保存具体值」的底线）。
- **URL 查询参数值会被脱敏展示**：面板与记录中 URL 的 `?k=***` 仅保留参数名、隐藏参数值；但站点自有浏览器控制台的原始请求仍含完整 URL，这是浏览器层面的限制，并非组件泄露。
- **跨站身份凭证判定基于显式信号**：仅当请求头含 `Authorization/Cookie` 等，或 `fetch` 显式 `credentials:'include'`、`XMLHttpRequest.withCredentials=true` 时才会标为跨站凭证外发；浏览器自动附加但未显式声明的凭证可能不被识别。
- **响应体不可见**：浏览器限制 JS 读取响应体，组件只采集 URL、方法、状态码、耗时、请求头键名与请求体字段名。

## 许可

[MIT](./LICENSE) —— 随便用，商业项目亦可，无需署名（但署名会很感谢）。

如果这个项目帮到了你，欢迎给个 ⭐，或在你的站点集成后提个 PR 加入展示墙。
