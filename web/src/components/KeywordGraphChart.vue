<script setup lang="ts">
import * as echarts from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { KeywordGraph } from '../types';

const props = defineProps<{ graph: KeywordGraph | null }>();
const emit = defineEmits<{ select: [keyword: string] }>();
const root = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function render() {
  if (!root.value || !props.graph) return;
  chart ??= echarts.init(root.value);
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: '#10231d', borderColor: '#335148', textStyle: { color: '#eef4ec' } },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      label: { show: true, color: '#dfe9e5', fontSize: 11 },
      force: { repulsion: 145, edgeLength: [54, 130], gravity: 0.08 },
      lineStyle: { color: '#5b8c7e', opacity: 0.38, curveness: 0.08 },
      emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.9 } },
      data: props.graph.nodes.map((node, index) => ({
        name: node.keyword, value: node.paperCount,
        symbolSize: 24 + Math.min(38, node.heat * 80),
        itemStyle: {
          color: index === 0 ? '#c8ff42' : index % 3 === 0 ? '#64d8cb' : '#2f6558',
          shadowBlur: index === 0 ? 24 : 10,
          shadowColor: index === 0 ? 'rgba(200,255,66,.45)' : 'rgba(100,216,203,.2)',
        },
      })),
      links: props.graph.edges.map((edge) => ({
        source: edge.source, target: edge.target, value: edge.cooccurrence,
        lineStyle: { width: Math.min(5, 0.5 + edge.cooccurrence) },
      })),
    }],
  });
  chart.off('click');
  chart.on('click', (params) => {
    if (params.dataType === 'node' && typeof params.name === 'string') emit('select', params.name);
  });
}

onMounted(() => {
  render();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  if (root.value) resizeObserver.observe(root.value);
});
watch(() => props.graph, render, { deep: true });
onBeforeUnmount(() => { resizeObserver?.disconnect(); chart?.dispose(); });
</script>

<template><div ref="root" class="chart-root" aria-label="关键词共现图谱"></div></template>
