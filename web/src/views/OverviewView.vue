<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest } from '../api/client';
import KeywordGraphChart from '../components/KeywordGraphChart.vue';
import PageIntro from '../components/PageIntro.vue';
import type { AnalysisOverview, KeywordGraph, TopKeywordsResult } from '../types';

const router = useRouter();
const overview = ref<AnalysisOverview | null>(null);
const top = ref<TopKeywordsResult | null>(null);
const graph = ref<KeywordGraph | null>(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    [overview.value, top.value, graph.value] = await Promise.all([
      apiRequest<AnalysisOverview>('/api/analysis/overview'),
      apiRequest<TopKeywordsResult>('/api/analysis/top-keywords?limit=10'),
      apiRequest<KeywordGraph>('/api/analysis/graph?nodeLimit=30&minCooccurrence=1'),
    ]);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '数据加载失败';
  } finally { loading.value = false; }
});
</script>

<template>
  <main class="page-shell overview-page">
    <PageIntro title="计算机视觉顶会研究热点" description="聚焦 CVPR、ICCV、ECCV，观察论文关键词、研究方向与年度趋势。" />
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <section v-loading="loading" class="stat-grid" aria-label="数据概览">
      <article class="stat-card hero-stat"><span>已收录论文</span><strong>{{ overview?.totalPapers ?? '—' }}</strong><small>来自官方会议论文列表与用户确认数据</small></article>
      <article v-for="item in overview?.conferenceCounts ?? []" :key="item.conference" class="stat-card"><span>{{ item.conference }}</span><strong>{{ item.paperCount }}</strong><small>当前样本论文</small></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel top-panel">
        <div class="section-heading"><div><h2>热词 Top 10</h2><p>按当前论文样本中的热度排序</p></div><RouterLink to="/trends">查看趋势 →</RouterLink></div>
        <div v-if="top?.items.length" class="rank-list">
          <button v-for="(item, index) in top.items" :key="item.keyword" class="rank-row" @click="router.push({ name: 'papers', query: { keyword: item.keyword } })">
            <b>{{ String(index + 1).padStart(2, '0') }}</b><span>{{ item.keyword }}</span><i><em :style="{ width: `${Math.max(8, item.heat * 100)}%` }"></em></i><strong>{{ (item.heat * 100).toFixed(1) }}%</strong>
          </button>
        </div>
        <div v-else-if="!loading" class="empty-state">暂无关键词统计，请先导入论文数据。</div>
      </article>
      <article class="panel graph-panel">
        <div class="section-heading"><div><h2>关键词关联图谱</h2><p>关键词共现关系</p></div><span class="hint">点击节点筛选论文</span></div>
        <KeywordGraphChart v-if="graph" :graph="graph" @select="router.push({ name: 'papers', query: { keyword: $event } })" />
      </article>
    </section>
  </main>
</template>
