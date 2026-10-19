// TrustLens Vue 3 组件（零构建，直接可用）
import { defineComponent, h, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { init } from 'trust-lens-core';

export const TrustLens = defineComponent({
  name: 'TrustLens',
  props: {
    siteName: { type: String, default: '本站' },
    claims: { type: Array, default: () => [] },
    showFab: { type: Boolean, default: true },
  },
  emits: ['update'],
  setup(props, { emit, expose }) {
    const tl = ref(null);
    const summary = ref(null);
    const grade = ref(null);

    function boot() {
      tl.value = init({
        siteName: props.siteName,
        claims: props.claims,
        showFab: props.showFab,
      });
      summary.value = tl.value.getSummary();
      grade.value = tl.value.getGrade();
    }

    onMounted(boot);
    onBeforeUnmount(() => tl.value?.destroy());

    watch(
      () => [props.siteName, props.claims],
      () => {
        tl.value?.destroy();
        boot();
      },
      { deep: true }
    );

    // 暴露实例，父组件可自行渲染定制面板
    expose({
      get instance() { return tl.value; },
      getSummary: () => tl.value?.getSummary(),
      getGrade: () => tl.value?.getGrade(),
      getRecords: () => tl.value?.getRecords(),
      refresh: () => {
        tl.value?.refresh();
        summary.value = tl.value?.getSummary();
        emit('update', summary.value);
      },
    });

    // 默认渲染空节点：UI 由 Shadow DOM 浮窗承载
    return () => h('div', { class: 'trust-lens-vue', style: 'display:contents' });
  },
});

export default TrustLens;

export function install(app) {
  app.component('TrustLens', TrustLens);
}
