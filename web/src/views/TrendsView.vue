<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Conference } from '@hotwords/shared';
import { apiRequest } from '../api/client';
import PageIntro from '../components/PageIntro.vue';
import TrendLineChart from '../components/TrendLineChart.vue';
import type { TrendsResult } from '../types';

const data = ref<TrendsResult | null>(null);
const conference = ref<Conference>('CVPR');
const keyword = ref('');
const frameIndex = ref(0);
const playing = ref(true);
let timer: number | undefined;
const frames = computed(() => data.value?.frames.filter((item) => item.conference === conference.value) ?? []);
const frame = computed(() => frames.value[frameIndex.value]);
const maximumHeat = computed(() => Math.max(...(frame.value?.ranking.map((item) => item.heat) ?? [1]), 0.01));

function resetTimer(): void {
  window.clearInterval(timer);
  if (!playing.value || frames.value.length < 2) return;
  timer = window.setInterval(() => { frameIndex.value = (frameIndex.value + 1) % frames.value.length; }, 1800);
}
function replay(): void { frameIndex.value = 0; playing.value = true; resetTimer(); }
watch([playing, frames], () => { frameIndex.value = Math.min(frameIndex.value, Math.max(0, frames.value.length - 1)); resetTimer(); });
onMounted(async () => {
  const result = await apiRequest<TrendsResult>('/api/analysis/trends?keywordLimit=10');
  data.value = result;
  keyword.value = result.keywords[0] ?? '';
  resetTimer();
});
onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
  <main class="page-shell trends-page">
    <PageIntro eyebrow="TREND EXPLORER" title="热度如何随时间流动？" description="播放年度热词排名，比较同一方向在不同顶会的变化。">
      <template #actions><button class="button button-primary trend-play" @click="playing = !playing">{{ playing ? 'Ⅱ 暂停动画' : '▶ 播放动画' }}</button></template>
    </PageIntro>
    <section class="filter-strip trend-filters"><el-select v-model="conference" aria-label="会议"><el-option v-for="item in ['CVPR','ICCV','ECCV']" :key="item" :label="`全部会议 ${item}`" :value="item" /></el-select><el-select v-model="keyword" filterable aria-label="关键词"><el-option v-for="item in data?.keywords ?? []" :key="item" :label="item" :value="item" /></el-select><span>2022 — 2025</span><span>论文数</span></section>
    <section class="trend-layout">
      <article class="panel ranking-panel">
        <div class="section-heading"><div><h2>年度热词排名变化</h2><p>{{ conference }} · 论文样本</p></div><strong class="frame-year">{{ frame?.year ?? '—' }}</strong></div>
        <TransitionGroup name="rank" tag="div" class="trend-bars">
          <article v-for="item in (frame?.ranking ?? []).slice(0, 5)" :key="item.keyword"><span class="bar-track"><i :style="{ height: `${Math.max(12, item.heat / maximumHeat * 100)}%` }"></i></span><b>{{ item.keyword }}</b><small>{{ item.paperCount }}</small></article>
        </TransitionGroup>
        <div class="year-track"><button v-for="(item, index) in frames" :key="item.year" :class="{ active: index === frameIndex }" @click="frameIndex = index">{{ item.year }}</button></div>
        <button class="replay-link" @click="replay">↻ 重新播放</button>
      </article>
      <article class="panel line-panel"><div class="section-heading"><div><h2>同一关键词 · 跨会议对比</h2><p>{{ keyword || '关键词' }}｜热度占比</p></div></div><TrendLineChart v-if="data" :points="data.points" :keyword="keyword" /></article>
    </section>
  </main>
</template>
