<script setup lang="ts">
defineProps<{ eyebrow?: string; title: string; description: string }>();
</script>

<template>
  <section class="page-intro reveal">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <slot></slot>
    <div v-if="$slots.actions" class="intro-actions"><slot name="actions"></slot></div>
  </section>
</template>
