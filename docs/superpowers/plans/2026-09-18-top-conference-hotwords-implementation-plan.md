# 顶会热词统计平台实施计划

日期：2026-09-18  
依据：[顶会热词统计平台设计说明](../specs/2026-09-18-top-conference-hotwords-design.md)  
状态：待执行

## 1. 实施原则

1. 优先完成五项基础功能，再做视觉优化和附加功能。
2. 每个阶段都产生可运行、可验证的成果。
3. 采用小步提交，提交信息描述真实变更，计划产生不少于 18 次有效 commit。
4. 核心算法和后端接口先写测试，再实现功能。
5. 每个阶段保存关键 AI 对话、人工修改理由、运行截图和测试结果，供作业博客使用。
6. `dev` 分支用于开发，阶段验收后通过 Pull Request 合并到 `main`。

## 2. 里程碑

| 里程碑 | 目标 | 验收结果 |
|---|---|---|
| M1 | 工程骨架和规范 | 前后端均可启动，检查命令通过 |
| M2 | 数据库和论文管理 | CRUD、分页和筛选接口可用 |
| M3 | 数据获取和导入 | 本地优先、OpenAlex/DBLP 降级查询和 CSV 导入可用 |
| M4 | 热词分析 | Top 10、图谱和趋势接口通过测试 |
| M5 | 完整前端 | 六个页面和五项基础功能可操作 |
| M6 | 测试与部署 | 生产构建、华为云部署和持久化通过验收 |
| M7 | 作业交付 | Release 1.0.0、README、博客材料齐全 |

## 3. 任务清单

### 任务 1：初始化 CodeArts 与 Git 工作流

目标：建立满足作业要求的版本管理基础。

操作：

- 在 CodeArts 创建以学号命名的项目和代码仓库。
- 在当前目录初始化 Git，并绑定 CodeArts 远程仓库。
- 创建 `dev` 分支，后续功能开发均在 `dev` 进行。
- 增加根目录 `.gitignore`，排除依赖、构建产物、环境变量、日志和 SQLite 运行数据库。

验收：

- `main` 和 `dev` 分支均存在。
- 远程仓库地址正确。
- `papers.db`、`.env`、`node_modules` 和 `dist` 不会被追踪。

建议 commit：`chore: initialize repository and development branch`

### 任务 2：创建项目骨架

计划文件：

```text
package.json
web/package.json
web/src/
server/package.json
server/src/
shared/package.json
```

操作：

- 建立 npm workspace 或 pnpm workspace。
- 创建 Vue 3 + TypeScript + Vite 前端。
- 创建 Express + TypeScript 后端。
- 创建 `shared` 包存放接口 DTO 和公共类型。
- 配置开发、构建、类型检查和测试命令。

验收：

- 前端开发服务器可打开初始页面。
- 后端 `/api/health` 返回成功。
- 根目录命令可以同时构建前后端。

建议 commit：`chore: scaffold TypeScript web and server workspaces`

### 任务 3：建立代码规范和质量检查

计划文件：

```text
codestyle.md
eslint.config.*
.prettierrc*
README.md
```

操作：

- 配置 ESLint、Prettier 和 TypeScript 严格检查。
- 编写 `codestyle.md`，标注规范来源。
- 在 README 中先写项目简介、作业链接、学号 `102400328`、运行方式、数据来源和 AI 使用说明章节。

验收：

- lint、格式检查和类型检查命令通过。
- `codestyle.md` 明确命名、目录、接口、错误处理和提交规范。

建议 commit：`docs: add coding standards and project documentation`

### 任务 4：实现数据库基础设施

计划文件：

```text
server/src/database/
server/migrations/
server/data/.gitkeep
server/src/config/
```

操作：

- 配置 SQLite 连接和环境变量。
- 创建 `papers`、`keyword_stats`、`import_tasks` 表。
- 增加数据库初始化和迁移命令。
- 为外部编号以及标题、会议、年份建立必要索引和唯一性约束。

验收：

- 空环境可以一条命令创建数据库。
- 重复外部编号或重复论文会被数据库约束阻止。

建议 commit：`feat(server): add SQLite schema and migrations`

### 任务 5：实现论文数据访问层

计划文件：

```text
server/src/modules/paper/paper.repository.ts
server/src/modules/paper/paper.types.ts
server/src/modules/paper/paper.repository.test.ts
```

操作：

- 先编写新增、读取、更新、删除、分页和筛选的数据访问测试。
- 实现数据访问层。
- 确认组合筛选不会拼接不安全 SQL。

验收：

- CRUD 和筛选测试通过。
- 数据访问层不包含 HTTP 请求或页面逻辑。

建议 commit：`test(server): define paper repository behavior`  
建议 commit：`feat(server): implement paper repository`

### 任务 6：实现论文 REST API

计划文件：

```text
server/src/modules/paper/paper.service.ts
server/src/modules/paper/paper.controller.ts
server/src/modules/paper/paper.routes.ts
server/src/modules/paper/paper.api.test.ts
```

操作：

- 实现列表、详情、新增、编辑和删除接口。
- 实现题目精确查询及编号、关键词、会议、年份组合筛选。
- 加入输入校验、统一响应和统一异常处理。

验收：

- 正常、空结果、非法输入、重复数据和不存在记录均有测试。
- 删除接口会触发后续统计更新入口。

建议 commit：`test(server): add paper API contract tests`  
建议 commit：`feat(server): implement paper management API`

### 任务 7：建立种子数据流程

计划文件：

```text
server/seeds/
server/src/scripts/seed.ts
server/src/scripts/seed.test.ts
```

操作：

- 确定公开数据字段映射。
- 编写清洗、去重和写入脚本。
- 准备体积可控的 CVPR、ICCV、ECCV 多年份数据。
- 记录数据来源和获取日期。

验收：

- 空数据库可通过命令导入种子数据。
- 重复执行不会产生重复论文。
- 三个会议和多个年份均有数据。

建议 commit：`feat(data): add reproducible conference paper seed pipeline`

### 任务 8：实现 OpenAlex/DBLP 查询与降级

计划文件：

```text
server/src/integrations/dblp/
server/src/integrations/openalex/
server/src/modules/search/
server/src/modules/search/search.test.ts
```

操作：

- 定义外部数据客户端接口，便于测试时替换为 Mock。
- 本地数据库优先查询。
- 本地无结果时查询 OpenAlex，并在 DBLP 可用时合并书目信息，再转换为统一论文结构。
- 加入超时、无结果、返回格式异常和网络错误处理。
- 外部结果只返回候选项，不自动写入数据库。

验收：

- 本地命中时不调用外部数据源。
- 单个数据源失败时返回可用候选项和警告；全部数据源失败时返回安全、明确的错误响应。
- Mock 测试不依赖真实网络。

建议 commit：`test(server): cover resilient external paper search`
建议 commit：`feat(server): add OpenAlex and DBLP paper search`

### 任务 9：实现 CSV 批量导入

计划文件：

```text
server/src/modules/import/
server/src/modules/import/import.test.ts
```

操作：

- 定义 CSV 模板字段。
- 校验标题、会议、年份、摘要、关键词和链接。
- 支持部分成功，记录错误行号与原因。
- 保存导入任务统计。
- 对文件大小和记录数设置课程项目所需的合理上限。

验收：

- 正常导入、空文件、缺列、非法年份、重复数据和部分失败测试通过。
- 导入结果能返回成功数、失败数和错误详情。

建议 commit：`test(server): define CSV import validation cases`  
建议 commit：`feat(server): implement partial-success CSV import`

### 任务 10：实现关键词处理算法

计划文件：

```text
server/src/modules/analysis/tokenizer.ts
server/src/modules/analysis/normalizer.ts
server/src/modules/analysis/analysis.test.ts
server/src/resources/stopwords-en.txt
```

操作：

- 编写停用词过滤、大小写归一化、标点和数字处理。
- 支持原始关键词优先。
- 为少量计算机视觉常用短语及单复数建立可解释的归一化规则。
- 编写同一论文内关键词去重逻辑。

验收：

- 给定固定标题和摘要时产生稳定结果。
- `object detection` 等短语不会被错误拆散。
- 同一关键词在同一论文中只计一次。

建议 commit：`test(analysis): specify keyword normalization rules`  
建议 commit：`feat(analysis): implement keyword extraction pipeline`

### 任务 11：实现 Top 10、图谱和趋势 API

计划文件：

```text
server/src/modules/analysis/analysis.service.ts
server/src/modules/analysis/analysis.controller.ts
server/src/modules/analysis/analysis.routes.ts
server/src/modules/analysis/analysis.api.test.ts
```

操作：

- 计算关键词论文数和热度占比。
- 生成 Top 10 排名。
- 计算关键词共现节点和边。
- 生成按年份、会议分组的数量和热度趋势。
- 论文数据改变时更新受影响的统计范围。

验收：

- 排名、并列排序、空数据和筛选范围测试通过。
- 图谱节点大小、边权重和趋势数据可以由固定样本人工复核。

建议 commit：`test(analysis): add ranking graph and trend fixtures`  
建议 commit：`feat(analysis): expose keyword analysis APIs`

### 任务 12：实现前端框架和 API 层

计划文件：

```text
web/src/router/
web/src/layouts/
web/src/api/
web/src/stores/
web/src/components/common/
```

操作：

- 建立六个页面路由和统一布局。
- 封装类型安全的 API 请求层。
- 实现全局加载、错误提示和空状态组件。
- 确保浏览器刷新非首页路由仍能正确打开。

验收：

- 六个页面都可以导航。
- API 错误具有统一提示。
- 布局在常见桌面尺寸下可用。

建议 commit：`feat(web): add application shell routing and API client`

### 任务 13：实现论文列表和详情页面

计划文件：

```text
web/src/views/PaperListView.vue
web/src/views/PaperDetailView.vue
web/src/components/paper/
```

操作：

- 实现分页、精确查询、模糊查询和组合筛选。
- 实现新增、编辑和删除弹窗。
- 删除操作加入二次确认。
- 详情页展示论文信息和相关论文。

验收：

- CRUD 完整流程可通过浏览器操作。
- 查询条件可以重置，并反映在 URL 或状态中。
- 从关键词图谱跳转后自动应用关键词筛选。

建议 commit：`feat(web): implement paper management and detail views`

### 任务 14：实现论文获取和导入页面

计划文件：

```text
web/src/views/PaperImportView.vue
web/src/components/import/
```

操作：

- 实现本地优先的论文检索。
- 展示 OpenAlex/DBLP 候选结果并提供确认保存操作。
- 提供 CSV 模板说明、文件选择和导入结果展示。
- 清晰展示部分成功的失败行及原因。

验收：

- 本地命中、外部命中、无结果和网络错误均有明确界面。
- 导入后论文列表和统计结果能够刷新。

建议 commit：`feat(web): add paper lookup and batch import workflow`

### 任务 15：实现首页和关键词图谱

计划文件：

```text
web/src/views/DashboardView.vue
web/src/components/charts/TopKeywordsChart.vue
web/src/components/charts/KeywordGraph.vue
```

操作：

- 展示统计卡片和 Top 10。
- 使用 ECharts graph 展示关键词共现关系。
- 加入会议和年份筛选。
- 点击关键词跳转论文列表。

验收：

- 图谱节点和边与 API 数据一致。
- 空数据和加载状态显示正常。
- 关键词点击联动正确。

建议 commit：`feat(web): build dashboard and interactive keyword graph`

### 任务 16：实现趋势动画页面

计划文件：

```text
web/src/views/TrendView.vue
web/src/components/charts/KeywordRaceChart.vue
web/src/components/charts/ConferenceTrendChart.vue
```

操作：

- 实现按年份变化的动态排名图。
- 实现不同会议的关键词热度折线对比。
- 加入播放、暂停、重播、关键词、会议和年份筛选。

验收：

- 动画状态可以控制，不会因切换筛选产生多个计时器。
- 数量和热度占比两种指标均能展示。
- 可录制成博客所需 GIF 或视频。

建议 commit：`feat(web): add animated keyword trend comparison`

### 任务 17：完成关于页面和可解释性内容

计划文件：

```text
web/src/views/AboutView.vue
web/src/content/
```

操作：

- 添加三大顶会简介。
- 展示数据来源、获取方式、统计范围和统计公式。
- 说明关键词清洗、归一化和共现图谱规则。

验收：

- 页面说明与实际算法一致。
- 不夸大数据覆盖范围或统计结论。

建议 commit：`docs(web): explain data sources and analysis methodology`

### 任务 18：执行系统测试和缺陷修复

操作：

- 运行全部单元测试、API 测试、lint、类型检查和生产构建。
- 使用干净数据库执行种子导入。
- 按五项基础功能逐项人工验收。
- 测试服务重启后的数据库持久性。
- 测试 OpenAlex/DBLP 不可用、CSV 错误和无数据图表。
- 保存至少一个有代表性的 AI 调试案例。

验收：

- 自动化检查全部通过。
- 五项基础功能不存在阻断性缺陷。
- 缺陷修复有独立、真实的 commit。

建议 commit：`test: add full workflow regression coverage`  
建议 commit：`fix: resolve issues found during system verification`

### 任务 19：部署到华为云

计划文件：

```text
server/src/app.ts
server/src/config/env.ts
.env.example
DEPLOYMENT.md
```

操作：

- 生成前端生产构建并交由 Express 托管。
- 配置生产环境变量和持久化数据库路径。
- 编写华为云部署文档。
- 启动生产服务，并确保异常退出后能够恢复。
- 验证公网访问、API、静态资源、页面刷新和数据持久化。

验收：

- 公网地址可访问。
- 新增论文后重启服务，数据仍然存在。
- `.env`、数据库和日志未进入仓库。

建议 commit：`chore: add production deployment configuration`

### 任务 20：完成仓库交付和 Release

操作：

- 补全 README：项目介绍、功能、技术栈、数据来源、AI 使用说明、运行、测试和部署方式。
- 检查 commit 数量、时间和内容是否真实合理。
- 创建 Pull Request，将 `dev` 合并到 `main`。
- 在基本功能完成后发布 `1.0.0` Release。
- 保留部署链接和 Release 链接。

验收：

- 新环境可以依据 README 构建项目。
- `main` 为已验收版本。
- CodeArts 中存在 `1.0.0` Release。

建议 commit：`docs: finalize README and release documentation`

### 任务 21：整理博客和展示材料

操作：

- 更新 PSP 实际耗时并分析偏差。
- 输出功能结构图。
- 整理 NABCD、原型链接、仓库链接、代码规范链接和云端链接。
- 准备至少 10 张功能截图，或使用 GIF/视频替代部分截图。
- 选取约 300 行关键代码并解释设计思路。
- 整理至少三个 AI 协作案例。
- 完成 AI 与人类结对的比较、收获和局限性反思。

验收：

- 对照作业评分表逐项检查，无缺失项。
- 博客目录可以正确跳转。
- 在截止时间前预留 CSDN 审核时间并提交链接。

## 4. 推荐提交序列

计划至少产生以下 26 次可独立解释的提交；实际提交应以真实完成情况为准，不为凑数量制造空提交：

1. `chore: initialize repository and development branch`
2. `chore: scaffold TypeScript web and server workspaces`
3. `docs: add coding standards and project documentation`
4. `feat(server): add SQLite schema and migrations`
5. `test(server): define paper repository behavior`
6. `feat(server): implement paper repository`
7. `test(server): add paper API contract tests`
8. `feat(server): implement paper management API`
9. `feat(data): add reproducible conference paper seed pipeline`
10. `test(server): cover resilient external paper search`
11. `feat(server): add OpenAlex and DBLP paper search`
12. `test(server): define CSV import validation cases`
13. `feat(server): implement partial-success CSV import`
14. `test(analysis): specify keyword normalization rules`
15. `feat(analysis): implement keyword extraction pipeline`
16. `test(analysis): add ranking graph and trend fixtures`
17. `feat(analysis): expose keyword analysis APIs`
18. `feat(web): add application shell routing and API client`
19. `feat(web): implement paper management and detail views`
20. `feat(web): add paper lookup and batch import workflow`
21. `feat(web): build dashboard and interactive keyword graph`
22. `feat(web): add animated keyword trend comparison`
23. `docs(web): explain data sources and analysis methodology`
24. `test: add full workflow regression coverage`
25. `fix: resolve issues found during system verification`
26. `chore: add production deployment configuration`
27. `docs: finalize README and release documentation`

## 5. 每阶段检查命令

具体命令在项目初始化时写入根目录 `package.json`。计划提供以下统一入口：

```text
安装依赖
运行开发环境
执行 lint
执行类型检查
执行全部测试
生成生产构建
初始化数据库
导入种子数据
启动生产服务
```

实现阶段不得仅以“页面能打开”作为验收标准；每个任务完成后必须执行与该任务相关的检查，并记录失败与修复过程。

## 6. 风险及应对

| 风险 | 应对措施 |
|---|---|
| DBLP 结果缺少摘要或主题，且可能触发反爬验证 | 由 OpenAlex 提供内容字段，DBLP 仅作可选书目校对；使用预置数据保证分析，不编造缺失内容 |
| 公开数据规模过大 | 先选定有限年份和必要字段，提供可重复的数据导入流程 |
| 图谱节点过多导致卡顿 | 限制 Top N 节点和最低共现次数，筛选后再渲染 |
| 趋势动画状态混乱 | 将动画控制封装为独立组件，切换条件时先清理旧定时器 |
| SQLite 并发写入限制 | 课程项目采用短事务和单实例部署，不引入高并发设计 |
| 云服务器重建导致数据丢失 | 保留种子和迁移脚本，数据库使用持久化目录并定期备份 |
| 截止前博客仍在审核 | 提前发布，并在截止前先提交已发布链接 |
| 范围失控 | 登录、权限、收藏等功能不进入 1.0.0 基础范围 |

## 7. 完成定义

只有同时满足以下条件，项目才视为完成：

- 五项基础功能均可通过公网网站操作。
- 六个页面与已批准设计一致。
- 核心算法、CRUD、查询、导入和降级测试通过。
- SQLite 数据在服务重启后保持不变。
- CodeArts 有真实、合理且不少于 15 次的提交记录。
- 使用 `dev`、Pull Request、`main` 和 `1.0.0` Release。
- README、`codestyle.md`、部署说明和数据来源完整。
- 博客材料覆盖评分标准及三个 AI 协作案例。
