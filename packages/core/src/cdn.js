// CDN 入口：自动注册 <trust-lens> 自定义元素
import { init, defineElement, TrustLensElement } from './index.js';

defineElement();

if (typeof window !== 'undefined') {
  window.TrustLens = Object.assign(window.TrustLens || {}, { init, defineElement, TrustLensElement, version: '1.0.0' });
}

export { init, defineElement, TrustLensElement };
