<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { ExternalPaperCandidate } from '@hotwords/shared';
import { apiRequest, jsonRequest, queryString } from '../api/client';
import PageIntro from '../components/PageIntro.vue';
import type { ImportResult, Paper, PaperSearchResult } from '../types';

const title = ref('');
const searching = ref(false);
const searchResult = ref<PaperSearchResult | null>(null);
const selectedFile = ref<File | null>(null);
const importing = ref(false);
const importResult = ref<ImportResult | null>(null);
const dragActive = ref(false);
const candidates = computed(() => searchResult.value?.items ?? []);

async function search(): Promise<void> {
  if (title.value.trim().length < 3) {
    ElMessage.warning('请输入至少 3 个字符的完整论文题目');
    return;
  }
  searching.value = true;
  try {
    searchResult.value = await apiRequest(`/api/search${queryString({ title: title.value.trim() })}`);
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '检索失败');
  } finally {
    searching.value = false;
  }
}

function isLocal(item: Paper | ExternalPaperCandidate): item is Paper {
  return 'id' in item;
}

async function saveCandidate(item: Paper | ExternalPaperCandidate): Promise<void> {
  if (isLocal(item)) {
    ElMessage.info('该论文已在本地数据库中');
    return;
  }
  try {
    await jsonRequest('/api/papers', 'POST', { ...item });
    ElMessage.success('候选论文已保存');
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '保存失败');
  }
}

function selectFile(file: File | undefined): void {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv')) {
    ElMessage.error('请选择 CSV 文件');
    return;
  }
  if (file.size > 1024 * 1024) {
    ElMessage.error('CSV 文件不能超过 1 MB');
    return;
  }
  selectedFile.value = file;
  importResult.value = null;
}

function resetImport(): void {
  importResult.value = null;
  selectedFile.value = null;
}

async function importCsv(): Promise<void> {
  if (!selectedFile.value) return;
  importing.value = true;
  try {
    importResult.value = await apiRequest('/api/imports/csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-File-Name': selectedFile.value.name,
      },
      body: await selectedFile.value.text(),
    });
    ElMessage.success('CSV 导入完成');
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '导入失败');
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <main class="page-shell import-page">
    <PageIntro title="论文爬取与导入" description="按题目检索本地与外部论文，或批量导入 CSV 数据。" />
    <section class="import-layout">
      <article class="panel search-panel">
        <div class="section-heading">
          <div>
            <span class="eyebrow">LOCAL FIRST</span>
            <h2>按题目获取论文</h2>
            <p>优先查询本地数据库，未命中时再查询 OpenAlex / DBLP</p>
          </div>
        </div>
        <label class="field-label">论文题目</label>
        <div class="inline-input">
          <el-input v-model="title" placeholder="请输入完整论文题目" @keyup.enter="search" />
          <el-button type="primary" :loading="searching" @click="search">检索论文</el-button>
        </div>
        <div class="search-route">检索路径：本地未命中 → OpenAlex 候选 → DBLP 校对</div>
        <div v-if="searchResult" class="candidate-list">
          <div class="candidate-header">
            <h3>{{ searchResult.origin === 'local' ? '本地匹配结果' : '外部候选结果' }}</h3>
            <span>{{ searchResult.origin }}</span>
          </div>
          <article v-for="item in candidates" :key="item.paperUrl" class="candidate">
            <h4>{{ item.title }}</h4>
            <p>{{ item.conference ?? item.venue ?? '未知会议' }} · {{ item.year ?? '未知年份' }}</p>
            <p class="muted">{{ item.keywords.slice(0, 4).join(' · ') || item.authors.slice(0, 3).join('、') }}</p>
            <el-button type="primary" @click="saveCandidate(item)">
              {{ isLocal(item) ? '已在本地' : '确认保存' }}
            </el-button>
          </article>
          <div v-if="!candidates.length" class="empty-state">未找到匹配论文</div>
        </div>
      </article>

      <article v-if="!importResult" class="panel csv-panel">
        <div class="section-heading"><div><span class="eyebrow">BATCH DATA</span><h2>CSV 批量导入</h2></div></div>
        <label
          class="drop-zone"
          :class="{ active: dragActive }"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="dragActive = false; selectFile($event.dataTransfer?.files[0])"
        >
          <input type="file" accept=".csv,text/csv" @change="selectFile(($event.target as HTMLInputElement).files?.[0])">
          <b>↑</b><strong>拖放 CSV 文件到此处</strong><span>或点击选择文件</span>
        </label>
        <div class="requirements">
          <h3>文件要求</h3>
          <p>最大 1 MB，最多 500 条数据</p>
          <p>必填列：title、conference、year、paperUrl</p>
          <p>authors、keywords 多个值使用 | 分隔</p>
        </div>
        <div v-if="selectedFile" class="file-chip">
          <span>▤</span>
          <div><strong>{{ selectedFile.name }}</strong><small>{{ (selectedFile.size / 1024).toFixed(1) }} KB</small></div>
          <button @click="selectedFile = null">×</button>
        </div>
        <el-button v-if="selectedFile" class="import-button" type="primary" :loading="importing" @click="importCsv">开始导入</el-button>
      </article>

      <article v-else class="panel csv-panel result-panel">
        <div class="section-heading"><div><span class="eyebrow">IMPORT REPORT</span><h2>CSV 导入结果</h2></div></div>
        <div class="success-banner">✓ {{ importResult.fileName }} 导入完成</div>
        <div class="result-stats">
          <div><strong class="teal">{{ importResult.totalCount }}</strong><span>总数据</span></div>
          <div><strong class="lime">{{ importResult.successCount }}</strong><span>成功导入</span></div>
          <div><strong class="orange">{{ importResult.failureCount }}</strong><span>导入失败</span></div>
        </div>
        <div v-if="importResult.failures.length" class="failure-box">
          <h3>失败明细</h3>
          <table>
            <thead><tr><th>行号</th><th>失败原因</th></tr></thead>
            <tbody><tr v-for="failure in importResult.failures" :key="failure.line"><td>第 {{ failure.line }} 行</td><td>{{ failure.reason }}</td></tr></tbody>
          </table>
          <p>成功记录已保存，失败记录请修改后重新导入。</p>
        </div>
        <el-button class="result-back" @click="resetImport">返回导入</el-button>
      </article>
    </section>
  </main>
</template>
