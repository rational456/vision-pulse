<script setup lang="ts">
const conferenceNames = ['CVPR', 'ICCV', 'ECCV'];
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <a class="brand" href="#" aria-label="视界脉冲首页">
        <span class="brand-mark" aria-hidden="true">◉</span>
        <span>
          <strong>视界脉冲</strong>
          <small>VISION PULSE</small>
        </span>
      </a>

      <nav aria-label="主导航">
        <a class="is-active" href="#overview">热点总览</a>
        <a href="#papers">论文库</a>
        <a href="#trends">趋势演化</a>
        <a href="#about">关于</a>
      </nav>

      <button class="data-button" type="button">导入论文</button>
    </header>

    <main id="overview">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">COMPUTER VISION RESEARCH OBSERVATORY</p>
          <h1>听见计算机视觉<br /><em>研究浪潮</em>的脉搏</h1>
          <p class="hero-description">
            从论文文本中提炼研究方向，观察关键词如何跨越年份与顶会持续演化。
          </p>

          <div class="conference-list" aria-label="覆盖会议">
            <span v-for="name in conferenceNames" :key="name">{{ name }}</span>
          </div>
        </div>

        <div class="signal-card" aria-label="平台建设状态">
          <div class="signal-ring"><span>01</span></div>
          <p>平台骨架已经接通</p>
          <strong>等待论文数据汇入</strong>
          <small>API · /api/health</small>
        </div>
      </section>

      <section class="status-strip" aria-label="系统能力">
        <article>
          <span>01</span>
          <div><strong>论文检索</strong><small>本地优先 · DBLP 兜底</small></div>
        </article>
        <article>
          <span>02</span>
          <div><strong>语义聚合</strong><small>关键词归一化与共现</small></div>
        </article>
        <article>
          <span>03</span>
          <div><strong>趋势观测</strong><small>跨年份 · 跨会议对比</small></div>
        </article>
      </section>
    </main>
  </div>
</template>
