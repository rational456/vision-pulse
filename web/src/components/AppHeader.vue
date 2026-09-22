<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const open = ref(false);
const links = [
  { label: '热门总览', to: '/', key: 'overview' },
  { label: '热度走势', to: '/trends', key: 'trends' },
  { label: '论文库', to: '/papers', key: 'papers' },
  { label: '数据导入', to: '/import', key: 'import' },
  { label: '关于', to: '/about', key: 'about' },
];
const active = computed(() => route.path.startsWith('/papers') ? 'papers' : String(route.name ?? 'overview'));
</script>

<template>
  <header class="site-header">
    <RouterLink class="brand" to="/" aria-label="视界脉冲首页">
      <span class="brand-mark" aria-hidden="true"><i></i></span>
      <span class="brand-name">视界脉冲</span>
      <small>VISION PULSE</small>
    </RouterLink>

    <button class="nav-toggle" type="button" :aria-expanded="open" @click="open = !open">
      <span></span><span></span>
      <span class="sr-only">切换导航</span>
    </button>

    <nav :class="{ 'is-open': open }" aria-label="主导航" @click="open = false">
      <RouterLink
        v-for="link in links"
        :key="link.key"
        :to="link.to"
        :class="{ 'is-active': active === link.key }"
      >{{ link.label }}</RouterLink>
    </nav>

    <RouterLink class="primary-pill header-cta" to="/papers">查看论文 <span>→</span></RouterLink>
  </header>
</template>
