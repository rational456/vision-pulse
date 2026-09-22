<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiRequest } from '../api/client';
import type { Paper } from '../types';

const route = useRoute(); const router = useRouter();
const paper = ref<Paper | null>(null); const related = ref<Paper[]>([]); const loading = ref(true); const error = ref('');
async function load(): Promise<void> {
  loading.value = true; error.value = '';
  try { const id = String(route.params.id); [paper.value, related.value] = await Promise.all([apiRequest<Paper>(`/api/papers/${id}`), apiRequest<Paper[]>(`/api/papers/${id}/related?limit=3`)]); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : '论文加载失败'; }
  finally { loading.value = false; }
}
watch(() => route.params.id, load); onMounted(load);
</script>
<template><main class="page-shell detail-page" v-loading="loading"><div class="detail-heading"><div><span class="eyebrow">PAPER PROFILE</span><h1>论文详情</h1><p>论文编号：DEMO-{{ String(paper?.id ?? '').padStart(3, '0') }}</p></div><button class="button button-secondary" @click="router.push('/papers')">← 返回论文列表</button></div><el-alert v-if="error" :title="error" type="error" :closable="false" /><section v-if="paper" class="detail-layout"><article class="panel paper-main"><h2>{{ paper.title }}</h2><div class="tag-row"><span class="tag lime-tag">{{ paper.conference ?? '未分类' }}</span><span class="tag">{{ paper.year ?? '年份未知' }}</span><span class="tag">来源：{{ paper.source }}</span></div><p class="authors">作者：{{ paper.authors.join('、') || '暂无作者信息' }}</p><hr><h3>论文摘要</h3><p class="abstract-text">{{ paper.abstract || '暂无摘要。' }}</p><h3>原文链接</h3><a class="source-link" :href="paper.paperUrl" target="_blank" rel="noreferrer"><span>{{ paper.paperUrl }}</span><strong>访问原文 ↗</strong></a></article><aside class="detail-aside"><article class="panel keyword-panel"><h2>关键词</h2><p>用于热词统计与相关论文推荐</p><div class="tag-row"><button v-for="(item,index) in paper.keywords" :key="item" class="tag" :class="{ 'lime-tag': index === 0 }" @click="router.push({ name:'papers', query:{ keyword:item } })">{{ item }}</button><span v-if="!paper.keywords.length" class="muted">暂无关键词</span></div></article><article class="panel related-panel"><h2>相关论文</h2><p>根据共有关键词推荐</p><button v-for="item in related" :key="item.id" class="related-item" @click="router.push(`/papers/${item.id}`)"><span><strong>{{ item.title }}</strong><small>{{ item.conference ?? '—' }} · {{ item.year ?? '—' }} · {{ item.keywords.length }} 个关键词</small></span><b>→</b></button><div v-if="!related.length" class="empty-state">暂无相关论文</div></article></aside></section></main></template>
