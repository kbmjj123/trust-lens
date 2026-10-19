import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * 内置 mock 后端：让示例能真实触发「已声明 / 未声明 / 追踪」三类请求。
 * 真实项目中删掉这个插件即可。
 */
function mockApi() {
  return {
    name: 'trust-lens-mock-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        // 故意延迟，让面板能看到真实的请求耗时
        setTimeout(() => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: req.url }));
        }, 120);
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), mockApi()],
  resolve: {
    // 直接指向本地源码，改组件代码即时生效，无需先打包
    alias: {
      'trust-lens-core': fileURLToPath(new URL('../../packages/core/src/index.js', import.meta.url)),
      'trust-lens-vue': fileURLToPath(new URL('../../packages/vue/src/index.js', import.meta.url)),
    },
  },
  server: { port: 5173, open: false },
});
