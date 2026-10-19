// TrustLens React 组件
// 库本身保持零构建：不使用 JSX，直接调用 createElement
import { createElement, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { init } from 'trust-lens-core';

/**
 * @param {Object} props
 * @param {string} props.siteName  站点名称
 * @param {Array}  props.claims    接口声明
 * @param {boolean} props.showFab  是否显示右下角浮标（false 时用 ref 自建 UI）
 * @param {Function} props.onUpdate 刷新回调
 */
export const TrustLens = forwardRef(function TrustLens(
  { siteName = '本站', claims = [], showFab = true, onUpdate },
  ref
) {
  const tlRef = useRef(null);
  const key = JSON.stringify(claims);

  useEffect(() => {
    tlRef.current = init({ siteName, claims, showFab });
    return () => {
      tlRef.current?.destroy();
      tlRef.current = null;
    };
  }, [siteName, key, showFab]);

  useImperativeHandle(ref, () => ({
    getSummary: () => tlRef.current?.getSummary(),
    getGrade: () => tlRef.current?.getGrade(),
    getRecords: () => tlRef.current?.getRecords(),
    refresh: () => {
      tlRef.current?.refresh();
      onUpdate?.(tlRef.current?.getSummary());
    },
  }));

  // UI 由 Shadow DOM 浮窗承载，组件本身不渲染可见内容
  return null;
});

export default TrustLens;
