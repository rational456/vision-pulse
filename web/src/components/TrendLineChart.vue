<script setup lang="ts">
import * as echarts from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { TrendPoint } from '@hotwords/shared';
import type { Conference } from '../types';

const props = defineProps<{ points: TrendPoint[]; keyword: string }>();
const root = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;
let observer: ResizeObserver | null = null;
const conferences: Conference[] = ['CVPR', 'ICCV', 'ECCV'];
const colors = ['#c8ff42', '#64d8cb', '#f4a36a'];

function render() {
  if (!root.value) return;
  chart ??= echarts.init(root.value);
  const years = [...new Set(props.points.map((point) => point.year))].sort();
  chart.setOption({
    animationDuration: 700,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#10231d',
      borderColor: '#365c50',
      textStyle: { color: '#eef5f1' },
      valueFormatter: (value: unknown) => `${(Number(value) * 100).toFixed(1)}%`,
    },
    legend: { top: 0, textStyle: { color: '#a8bab4' }, itemWidth: 10, itemHeight: 10 },
    grid: { left: 38, right: 18, top: 42, bottom: 30 },
    xAxis: {
      type: 'category', data: years, boundaryGap: false,
      axisLine: { lineStyle: { color: '#365c50' } },
      axisTick: { show: false },
      axisLabel: { color: '#91a69f' },
    },
    yAxis: {
      type: 'value', min: 0,
      axisLabel: { formatter: (value: number) => `${Math.round(value * 100)}%`, color: '#91a69f' },
      splitLine: { lineStyle: { color: 'rgba(100, 216, 203, .12)' } },
    },
    series: conferences.map((conference, index) => ({
      name: conference, type: 'line', smooth: true, symbolSize: 7,
      lineStyle: { width: 3 }, itemStyle: { color: colors[index] },
      data: years.map((year) => props.points.find((point) => point.conference === conference && point.year === year && point.keyword === props.keyword)?.heat ?? 0),
    })),
  });
}

onMounted(() => {
  render();
  observer = new ResizeObserver(() => chart?.resize());
  if (root.value) observer.observe(root.value);
});
watch(() => [props.points, props.keyword], render, { deep: true });
onBeforeUnmount(() => { observer?.disconnect(); chart?.dispose(); });
</script>

<template><div ref="root" class="chart-root" aria-label="跨会议热度折线图"></div></template>
