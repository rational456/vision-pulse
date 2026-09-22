<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { Conference } from '@hotwords/shared';
import type { Paper, PaperPayload } from '../types';

const props = defineProps<{ modelValue: boolean; paper?: Paper | null; saving?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; submit: [payload: PaperPayload] }>();

const formRef = ref<FormInstance>();
const form = reactive({
  title: '', paperUrl: '', conference: '' as Conference | '', year: '', authors: '', keywords: '', abstract: '',
});
const title = computed(() => props.paper ? '编辑论文' : '新增论文');
const rules: FormRules = {
  title: [{ required: true, message: '请输入论文标题', trigger: 'blur' }],
  paperUrl: [
    { required: true, message: '请输入论文链接', trigger: 'blur' },
    { type: 'url', message: '请输入有效的 HTTP(S) 地址', trigger: 'blur' },
  ],
};

watch(() => [props.modelValue, props.paper] as const, () => {
  if (!props.modelValue) return;
  const paper = props.paper;
  form.title = paper?.title ?? '';
  form.paperUrl = paper?.paperUrl ?? '';
  form.conference = paper?.conference ?? '';
  form.year = paper?.year ? String(paper.year) : '';
  form.authors = paper?.authors.join(', ') ?? '';
  form.keywords = paper?.keywords.join(', ') ?? '';
  form.abstract = paper?.abstract ?? '';
}, { immediate: true });

function split(value: string): string[] {
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    title: form.title.trim(),
    paperUrl: form.paperUrl.trim(),
    conference: form.conference || null,
    year: form.year ? Number(form.year) : null,
    authors: split(form.authors),
    keywords: split(form.keywords),
    abstract: form.abstract.trim() || null,
    source: props.paper?.source ?? 'manual',
    externalId: props.paper?.externalId ?? null,
    venue: props.paper?.venue ?? (form.conference || null),
    doi: props.paper?.doi ?? null,
  });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="min(760px, calc(100vw - 28px))"
    class="paper-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
      <el-form-item label="论文标题" prop="title"><el-input v-model="form.title" placeholder="请输入论文标题" /></el-form-item>
      <el-form-item label="论文链接" prop="paperUrl"><el-input v-model="form.paperUrl" placeholder="请输入论文链接（URL）" /></el-form-item>
      <div class="form-grid">
        <el-form-item label="会议"><el-select v-model="form.conference" clearable placeholder="请选择会议"><el-option v-for="item in ['CVPR', 'ICCV', 'ECCV']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
        <el-form-item label="年份"><el-input v-model="form.year" inputmode="numeric" placeholder="请输入年份" /></el-form-item>
        <el-form-item label="作者"><el-input v-model="form.authors" placeholder="以逗号分隔作者" /></el-form-item>
        <el-form-item label="关键词"><el-input v-model="form.keywords" placeholder="以逗号分隔关键词" /></el-form-item>
      </div>
      <el-form-item label="摘要"><el-input v-model="form.abstract" type="textarea" :rows="5" placeholder="请输入摘要（选填）" /></el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-source">来源：{{ paper?.source ?? '手动录入' }}</span>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存论文</el-button>
    </template>
  </el-dialog>
</template>
