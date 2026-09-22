import { createRouter, createWebHistory } from 'vue-router';
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: () => import('../views/OverviewView.vue') },
    { path: '/trends', name: 'trends', component: () => import('../views/TrendsView.vue') },
    { path: '/papers', name: 'papers', component: () => import('../views/PapersView.vue') },
    { path: '/papers/:id', name: 'paper-detail', component: () => import('../views/PaperDetailView.vue') },
    { path: '/import', name: 'import', component: () => import('../views/ImportView.vue') },
    { path: '/about', name: 'about', component: () => import('../views/AboutView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
