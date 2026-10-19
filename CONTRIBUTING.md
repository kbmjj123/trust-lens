# 贡献指南

感谢你考虑为 TrustLens 做贡献。本项目有两种贡献方式：**改进组件本身** 与 **提交站点展示**。

---

## 一、提交站点展示（换取外链）

集成 TrustLens 后，你可以提交 PR 把站点加入 [Showcase 展示墙](./showcase/sites.json)。
展示墙会渲染在 README 与官网上，附带指向你站点的链接。

### 准入条件

| 条件 | 说明 |
|---|---|
| ✅ 真实集成 | 页面必须真实加载并渲染组件，CI 会自动检测 |
| ✅ 公开可访问 | 无需登录即可看到「数据透明」浮标 |
| ✅ 有实质内容 | 有真实功能或内容的站点，非采集站 / 跳转站 / 纯广告页 |
| ✅ 内容合法 | 不涉及违法违规内容 |
| ✅ 接受复审 | 站点下线或移除组件后，维护者有权将其从展示墙移除 |

### 透明度等级（决定展示权重）

| 等级 | 条件 | 展示位置 |
|:---:|---|:---:|
| 🥉 **L1** | 仅引入组件，浮标可见 | 列表区（小字号） |
| 🥈 **L2** | 填写了 `claims` 声明接口用途 | 卡片区 |
| 🥇 **L3** | 声明完整 + 实测无未声明的数据提交 | 精选区 + 首页推荐 |

等级由 CI 自动判定，无需自评。想拿 L3，就把每个接口的用途都声明清楚。

### 提交步骤

1. Fork 本仓库
2. 编辑 `showcase/sites.json`，在 `sites` 数组**末尾**追加一条：

```json
{
  "name": "你的站点名称",
  "url": "https://your-site.com",
  "desc": "一句话简介，20 字以内",
  "category": "开发工具",
  "level": "L3",
  "verifiedAt": "2026-10-19"
}
```

> `level` 与 `verifiedAt` 可留空，CI 验证后会自动填写并评论在你的 PR 上。

3. 提交 PR，填写模板中的自查项
4. 等待 CI 运行（约 30 秒），机器人会在 PR 下评论验证结果与等级
5. 维护者审核合并

### 关于外链的说明

展示墙是**贡献者名录**，不是广告位。我们保留对任何展示申请的拒绝权，
以维护展示墙的质量与合规性。请不要提交与本站内容无关的站点。

---

## 二、改进组件本身

### 本地开发

```bash
git clone https://github.com/YOUR_ID/trust-lens.git
cd trust-lens
npm install
npm run build        # 打包 core 到 packages/core/dist
node test-local.mjs  # 起本地服务 + 真实浏览器跑功能验证
```

### 目录说明

```
packages/core/src/
├── collector.js    请求采集（fetch / XHR / Resource Timing）
├── classifier.js   请求分类 —— 翻译成人话
├── claims.js       站点声明解析与匹配
├── trackers.js     已知追踪域名表
├── ui.js           Shadow DOM 浮窗
└── index.js        入口 + Web Component
```

### 三条不可动摇的底线

提交代码前请确认没有破坏以下原则，否则 PR 会被拒绝：

1. **零网络请求** —— 组件自身不得发起任何网络请求，不得加载远程字体 / 图标 / 脚本
2. **零内容留存** —— 只能记录字段名与体积，绝不能保存请求体或请求头的具体值
3. **零持久化** —— 记录只存内存，不得写入 localStorage / sessionStorage / IndexedDB

### 补充追踪域名

编辑 `packages/core/src/trackers.js`，追加规则：

```js
{ domain: 'example-tracker.com', vendor: '厂商名', kind: 'analytics' }
```

`kind` 取值：`analytics` / `ads` / `social` / `session` / `error`。
若该域名下只有部分路径是追踪行为，可用 `pathHint` 正则限定。

---

## 行为准则

请保持友善、就事论事。人身攻击与歧视性言论将导致被移出社区。
