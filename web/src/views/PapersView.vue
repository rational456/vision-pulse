<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { apiRequest, jsonRequest, queryString } from '../api/client';
import PageIntro from '../components/PageIntro.vue';
import PaperFormDialog from '../components/PaperFormDialog.vue';
import type { Paper, PaperPage, PaperPayload } from '../types';

const route = useRoute();
const router = useRouter();
const filters = reactive({ title: '', keyword: String(route.query.keyword ?? ''), conference: '', year: '', id: '', exact: false });
const result = ref<PaperPage>({ items: [], total: 0, page: 1, pageSize: 4 });
const page = ref(1);
const loading = ref(false);
const dialogOpen = ref(false);
const saving = ref(false);
const editing = ref<Paper | null>(null);
const totalPages = computed(() => Math.max(1, Math.ceil(result.value.total / result.value.pageSize)));

async function load(): Promise<void> {
  loading.value = true;
  try {
    result.value = await apiRequest(`/api/papers${queryString({
      [filters.exact ? 'title' : 'q']: filters.title || undefined,
      keyword: filters.keyword || undefined,
      conference: filters.conference || undefined,
      year: filters.year || undefined,
      id: filters.id || undefined,
      page: page.value,
      pageSize: 4,
    })}`);
  } catch (reason) { ElMessage.error(reason instanceof Error ? reason.message : '查询失败'); }
  finally { loading.value = false; }
}
function search(): void { page.value = 1; void load(); }
function reset(): void { Object.assign(filters, { title: '', keyword: '', conference: '', year: '', id: '', exact: false }); page.value = 1; void load(); }
function openCreate(): void { editing.value = null; dialogOpen.value = true; }
function openEdit(paper: Paper): void { editing.value = paper; dialogOpen.value = true; }
async function save(payload: PaperPayload): Promise<void> {
  saving.value = true;
  try {
    if (editing.value) await jsonRequest(`/api/papers/${editing.value.id}`, 'PATCH', payload);
    else await jsonRequest('/api/papers', 'POST', payload);
    ElMessage.success(editing.value ? '论文已更新' : '论文已新增'); dialogOpen.value = false; await load();
  } catch (reason) { ElMessage.error(reason instanceof Error ? reason.message : '保存失败'); }
  finally { saving.value = false; }
}
async function remove(paper: Paper): Promise<void> {
  try {
    const paperNumber = `DEMO-${String(paper.id).padStart(3, '0')}`;
    await ElMessageBox.confirm(
      h('div', { class: 'delete-paper-copy' }, [
        h('span', { class: 'delete-paper-title', title: paper.title }, `将删除《${paper.title}》`),
        h('span', { class: 'delete-paper-warning' }, `（${paperNumber}）。删除后无法恢复。`),
      ]),
      '确认删除论文？',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        customClass: 'delete-paper-box',
        modalClass: 'delete-paper-overlay',
        showClose: false,
        closeOnClickModal: false,
      },
    );
    await apiRequest(`/api/papers/${paper.id}`, { method: 'DELETE' }); ElMessage.success('论文已删除'); await load();
  } catch (reason) { if (reason !== 'cancel' && reason !== 'close') ElMessage.error(reason instanceof Error ? reason.message : '删除失败'); }
}
watch(() => route.query.keyword, (value) => { filters.keyword = String(value ?? ''); search(); });
onMounted(load);
</script>

<template>
  <main class="page-shell papers-page">
    <PageIntro title="论文列表管理" description="检索、筛选与维护顶会论文数据。"><template #actions><button class="button button-primary" @click="openCreate">＋ 新增论文</button></template></PageIntro>
    <section class="filter-strip paper-filters">
      <el-input v-model="filters.title" placeholder="论文题目" clearable @keyup.enter="search" />
      <el-input v-model="filters.keyword" placeholder="关键词" clearable @keyup.enter="search" />
      <el-select v-model="filters.conference" clearable placeholder="会议"><el-option v-for="item in ['CVPR','ICCV','ECCV']" :key="item" :label="item" :value="item" /></el-select>
      <el-input v-model="filters.year" placeholder="年份" clearable @keyup.enter="search" />
      <el-input v-model="filters.id" placeholder="论文编号" clearable @keyup.enter="search" />
      <label class="check-row"><el-checkbox v-model="filters.exact" />题目精确匹配</label>
      <div class="filter-actions"><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></div>
    </section>
    <section class="panel table-panel" v-loading="loading">
      <div class="section-heading"><div><h2>论文数据</h2><p>原型示例</p></div></div>
      <div class="paper-table-wrap"><table class="paper-table"><thead><tr><th>编号</th><th>论文标题</th><th>会议</th><th>年份</th><th>关键词</th><th>来源</th><th>操作</th></tr></thead><tbody><tr v-for="paper in result.items" :key="paper.id"><td>DEMO-{{ String(paper.id).padStart(3, '0') }}</td><td><button class="title-link" @click="router.push(`/papers/${paper.id}`)">{{ paper.title }}</button></td><td>{{ paper.conference ?? '—' }}</td><td>{{ paper.year ?? '—' }}</td><td class="keyword-cell">{{ paper.keywords.slice(0, 2).join(' · ') || '—' }}</td><td>{{ paper.source }}</td><td class="actions-cell"><button @click="openEdit(paper)">编辑</button><button class="danger-link" @click="remove(paper)">删除</button></td></tr><tr v-if="!result.items.length"><td colspan="7"><div class="empty-state">没有符合条件的论文</div></td></tr></tbody></table></div>
      <footer class="table-footer"><span>第 {{ result.page }} / {{ totalPages }} 页</span><el-pagination v-model:current-page="page" background layout="prev, pager, next" :page-size="result.pageSize" :total="result.total" @current-change="load" /></footer>
    </section>
    <PaperFormDialog v-model="dialogOpen" :paper="editing" :saving="saving" @submit="save" />
  </main>
</template>
