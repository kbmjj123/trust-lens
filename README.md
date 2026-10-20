# 🔍 TrustLens

> An open-source transparency component that lays out a website's data flows for users to see — zero dependencies, zero network requests, zero content retention.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Bundle size](https://img.shields.io/badge/CDN%20Bundle-25KB-brightgreen.svg)](./packages/core/dist)

📖 简体中文文档：[README.zh-CN.md](./README.zh-CN.md)

---

## The problem it solves

Every client-side tool site claims "your data is never uploaded to our servers" — yet users **cannot verify** it.

TrustLens turns that verbal promise into something **you can see with your own eyes**:

- Users open the bottom-right floating badge to see every request the page has made
- Each request is translated into plain language: "📊 Reported your browsing behavior to Google" instead of `POST /g/collect`
- Whatever endpoints the site declares (and what data they send) is shown honestly; **anything sent without declaration is flagged in red**

For site owners, this is the lowest-cost trust infrastructure; for users, it's a mirror that reflects where their data flows.

---

## Preview

```
┌──────────────────────────────────────────┐
│ 🛡️ Data Transparency Panel   JSON Formatter│
├──────────────────────────────────────────┤
│  This browsing session overview          │
│  6 requests   1 high-risk   1 caution   4 low-risk │
│  ✅ No input content detected sent externally │
├──────────────────────────────────────────┤
│ ✅ File format conversion        POST     │
│    127.0.0.1 · 200 · 12ms                │
│    ├ What did this request do?           │
│    │  File content processed locally in your browser │
│    ├ What did it carry?                  │
│    │  Fields: filename (name only, no content) │
│    └ Risk level: caution                 │
├──────────────────────────────────────────┤
│ ⚠️ Submitted data to 127.0.0.1 (undeclared by site) │
│    Consider confirming with the site owner │
└──────────────────────────────────────────┘
```

---

## Quick Start

### ① CDN (recommended, zero-build for static sites)

```html
<!-- Place before </body>; defer ensures it never blocks rendering -->
<script src="https://cdn.jsdelivr.net/npm/trust-lens-core/dist/trust-lens.min.js" defer></script>

<trust-lens
  site-name="My Tool Site"
  claims='[
    {"pattern":"/api/convert","label":"File format conversion","data":"File content is processed locally in the browser; only the filename is uploaded","scope":"input"}
  ]'>
</trust-lens>
```

Want to ditch third-party CDNs entirely? Download `trust-lens.min.js` (25KB) and host it on your own server.

### ② Vue 3

```bash
npm i trust-lens-core trust-lens-vue
```

```vue
<script setup>
import { TrustLens } from 'trust-lens-vue'

const claims = [
  { pattern: '/api/convert', label: 'File format conversion', data: 'Processed locally, no content uploaded', scope: 'input' },
]
</script>

<template>
  <TrustLens site-name="My Tool Site" :claims="claims" />
</template>
```

### ③ React

```bash
npm i trust-lens-core trust-lens-react
```

```jsx
import TrustLens from 'trust-lens-react'

const claims = [
  { pattern: '/api/convert', label: 'File format conversion', data: 'Processed locally, no content uploaded', scope: 'input' },
]

export default function App() {
  return <TrustLens siteName="My Tool Site" claims={claims} />
}
```

Don't want the floating panel — just render your own UI? The component returns `null`; grab the data via `ref` to build your own interface:

```jsx
const ref = useRef()
// ref.current.getSummary() / getRecords() / getGrade()
<TrustLens ref={ref} claims={claims} showFab={false} />
```

---

## Declaring endpoints: claims

A site proactively explains "what each endpoint does" via `claims`. The component compares the declarations against the actual requests.

```js
{
  pattern: '/api/convert',                  // substring / glob(*) / RegExp / function
  label: 'File format conversion',          // human-readable purpose
  data: 'File content is processed locally in the browser; only the filename is uploaded', // human-readable data note
  scope: 'input'                            // none | meta | input | credential
}
```

`scope` determines the risk color: `none`/`meta` green, `input` orange, `credential` red.

**It runs even without claims** — all data requests will simply be marked "undeclared" and the site won't reach L3.

---

## How requests get translated

| Category | Meaning | Risk |
|---|---|:---:|
| 📦 Page assets | scripts / styles / fonts / images, no user input | 🟢 |
| ✅ Declared endpoints | purpose declared by the site, with the site's own explanation | 🟢🟠 |
| 🔄 Same-site communication | communicating with the site's own domain, no submitted content detected | 🟢 |
| 🎯 Third-party tracking | matches the built-in tracker domain list (Google Analytics / Baidu Tongji / Sentry, 30+ in total) | 🟠🔴 |
| 🔑 Credential leakage | sent Cookie / Authorization to a **non-same-site** domain | 🔴 |
| ⚠️ Undeclared data submission | carried user data but the site never declared this endpoint | 🔴 |
| ❓ Purpose unknown | cannot be auto-classified | 🟠 |

---

## Privacy baseline (an auditable promise)

A transparency tool must be transparent itself. The component strictly follows three baselines — feel free to audit line by line:

| Baseline | Implementation |
|---|---|
| **Zero network requests** | the component itself makes no requests and loads no remote fonts / icons / scripts |
| **Zero content retention** | request bodies keep only **field names and size**; request headers keep only **key names**; values are never stored |
| **Zero persistence** | records live only in memory and are destroyed when the page closes; nothing is written to localStorage / IndexedDB |

> For example, if you submit `{password: "123456"}`, the panel only shows "Field: password" — the fact that the value is `123456` **never enters any data structure of the component**.

Want to self-check in the console? Open any page integrated with TrustLens:

```js
TrustLens.getSummary()   // current stats
TrustLens.getGrade()     // site transparency grade
```

---

## 🌐 Showcase Wall

Sites integrating TrustLens can submit a PR to join the wall; the README and official site will display your site name, description, and external link.

| Site | Description | Grade |
|---|---|:---:|
| [TrustLens Official Demo](https://trustlens.dev) | Component capability demo | 🥇 L3 |

**Grades are auto-determined by CI, not self-assessed:**

| Grade | Condition | Display weight |
|:---:|---|:---:|
| 🥇 L3 | Complete declarations + verified no undeclared data submission | Featured + homepage recommendation |
| 🥈 L2 | Declared endpoints exist, but undeclared requests are present | Card area |
| 🥉 L1 | Component merely embedded | List area |

Verification: GitHub Actions visits your site with a real browser, checking whether the component renders, whether declarations are complete, and whether any undeclared data submissions exist.

👉 See [CONTRIBUTING.md](./CONTRIBUTING.md) for full rules. Before submitting, please ensure your site has substantial content, is lawful and compliant, and is publicly accessible.

---

## Project Structure

```
trust-lens/
├── packages/                # three publishable packages
│   ├── core/                # zero-dependency core (25KB CDN single file)
│   │   ├── src/
│   │   │   ├── collector.js    request collection: fetch / XHR / Resource Timing
│   │   │   ├── classifier.js   request classification — translated to plain language
│   │   │   ├── claims.js       site declaration matching
│   │   │   ├── trackers.js     tracker domain list (community-maintained)
│   │   │   ├── ui.js           Shadow DOM floating panel
│   │   │   └── index.js        entry point + Web Component
│   │   └── dist/               three artifacts: esm / cjs / min(IIFE)
│   ├── vue/                 # trust-lens-vue (zero-build)
│   └── react/               # trust-lens-react (zero-build, pure JS no JSX)
├── examples/                # runnable example projects
│   ├── cdn.html             plain HTML + CDN
│   ├── vue3/                Vue 3 + Vite full project
│   └── react/               React 18 + Vite full project
├── showcase/sites.json      # showcase wall data source (edit via PR)
├── scripts/
│   ├── verify-site.mjs      single-site verification (real browser)
│   └── verify-pr.mjs        PR batch verification
├── test-local.mjs           # core functional verification
└── test-examples.mjs        # example project end-to-end verification
```

The two wrapper packages (`vue` / `react`) are both **zero-build**:
The Vue version uses the `h()` render function, the React version uses `createElement`, containing no JSX / SFC,
so no compilation step is needed when publishing to npm.

---

## Local Development

```bash
npm install
npm run build            # bundle core → packages/core/dist
node test-local.mjs      # start local server + run functional verification in a real browser
node scripts/verify-site.mjs https://your-site.com   # verify any live site
```

## Runnable Example Projects

`examples/` contains three **ready-to-run** complete projects; see [examples/README.md](./examples/README.md) for details.

| Example | How to start |
|---|---|
| Plain HTML + CDN | open `examples/cdn.html` directly in a browser |
| Vue 3 + Vite | `cd examples/vue3 && npm install && npm run dev` |
| React 18 + Vite | `cd examples/react && npm install && npm run dev` |

The examples ship with a mock `/api/*` backend and three trigger buttons, so you can actually see how "declared / undeclared / third-party tracking"
requests are identified and translated. They also demonstrate two patterns: **the built-in floating panel** and **building your own UI via ref**.

After changing component source, run end-to-end verification:

```bash
cd examples/vue3  && npx vite build
cd examples/react && npx vite build
node test-examples.mjs   # open both build artifacts in a real browser and assert
```

---

## Roadmap

- [x] Core collection and classification
- [x] CDN / Vue3 / React three integration paths
- [x] Showcase wall and CI auto grade determination
- [x] Multi-language (English copy)
- [ ] Rule plugin mechanism (community-sourced tracker domains)
- [ ] Custom panel themes and exportable reports unrelated to analytics
- [ ] Integration display with extensions like Privacy Badger

---

## FAQ

**Q: Can the response body be seen?**
A: No. The browser restricts JS from reading response bodies; the component only collects URL, method, status code, duration, request header key names, and request body field names.

**Q: Does it affect page performance?**
A: fetch / XHR go through a lightweight wrapper (only metadata is recorded); static resources use native PerformanceObserver collection, non-intrusive. The CDN single file is 25KB and loads with `defer`, never blocking rendering.

**Q: Can a site bypass this by simply not declaring?**
A: No. Undeclared requests that carry data are flagged as "⚠️ Undeclared data submission" and counted as high-risk — the site has no opportunity to lie, it can only choose transparency.

**Q: Can it be submitted to cdnjs?**
A: The npm package already auto-supports jsDelivr / unpkg. cdnjs requires going through its official process; contributions are welcome.

---

## Known Limitations (the boundary of the transparency promise)

TrustLens collects requests through Monkey-patching. Please be aware of the following boundaries before integrating:

- **Caching the `fetch` reference in advance bypasses interception**: if the page executes `const f = window.fetch; f(...)` before the component initializes, that call will not be recorded. The component should be imported as early as possible at the app entry point.
- **WebSocket / sendBeacon only record the connection and target**: real-time channels and beacons are recorded as "who you're communicating with", but their frame content cannot be read (which still complies with the "no values stored" baseline).
- **URL query parameter values are masked in display**: the `?k=***` in the panel and records keeps only the parameter name and hides the value; however, the raw requests in the site's own browser console still contain the full URL — this is a browser-level limitation, not a component leak.
- **Cross-site credential detection is based on explicit signals**: only when the request header contains `Authorization/Cookie` etc., or `fetch` explicitly sets `credentials:'include'`, or `XMLHttpRequest.withCredentials=true`, will it be flagged as cross-site credential leakage; credentials automatically attached by the browser but not explicitly declared may not be recognized.
- **Response body is invisible**: the browser restricts JS from reading response bodies; the component only collects URL, method, status code, duration, request header key names, and request body field names.

## License

[MIT](./LICENSE) — free to use, including commercial projects, no attribution required (but attribution is much appreciated).

If this project helped you, please give it a ⭐, or submit a PR to join the showcase wall after integrating it into your site.
