# 视界脉冲 · Vision Pulse

软件工程实践第二次作业（学号：102400328）。本项目是一个面向 CVPR、ICCV、ECCV 论文的热门研究方向分析与可视化平台，支持论文管理、关键词统计、年度趋势比较、论文检索和 CSV 批量导入。

## 项目入口

- 作业要求：[CSDN 作业页面](https://bbs.csdn.net/topics/620526318)
- 华为云 CodeArts：[仓库项目页](https://devcloud.cn-north-4.huaweicloud.com/codehub/project/cc8f24d1c344473688f742c7a429d0b7/codehub/3087813/repo)
- Figma：[设计稿](https://www.figma.com/design/Oq2iDo2gYAb48uy7FDrsxX/%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B%E5%AE%9E%E8%B7%B5?node-id=0-1&t=Ks4WTe5RqD47CL35-1)
- Figma：[交互原型](https://www.figma.com/proto/Oq2iDo2gYAb48uy7FDrsxX/%E8%BD%AF%E4%BB%B6%E5%B7%A5%E7%A8%8B%E5%AE%9E%E8%B7%B5?node-id=20-2&p=f&t=WLYGV7D1MSgvEdQj-1&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=20%3A2&show-proto-sidebar=1)
- 在线体验：完成 Flexus L 部署后补充
- 项目博客：发布后补充

## 主要功能

- 热门总览：展示论文总量、会议分布、年度分布、关键词 Top 10 和关键词关系图。
- 热度趋势：按会议、年份和指标筛选，查看年度热词排名及跨会议热度折线图。
- 论文库：支持组合筛选、分页、新增、编辑、查看详情和删除确认。
- 论文详情：展示标题、作者、摘要、关键词、来源、原文链接及相关论文推荐。
- 数据导入：支持单篇论文题目检索、完整 CSV 直接导入，以及根据 CSV 题目列表自动补全论文信息，返回成功数及逐行失败原因。
- 响应式页面：桌面端和移动端均可正常使用。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Vue Router、Element Plus、ECharts
- 后端：Node.js 24、TypeScript、Express 5、Node SQLite
- 工程：pnpm workspace、Vitest、Docker
- 部署：华为云 Flexus L，单容器同时提供前端静态资源与 `/api` 接口

## 项目结构

```text
.
├─ web/                 Vue 前端
├─ server/              Express API、SQLite、种子数据与测试
├─ shared/              前后端共享类型
├─ docs/                接口说明、博客草稿、设计与实现记录
├─ Dockerfile           生产镜像配置
└─ README.md
```

## 本地运行

需要 Node.js 24.15+ 和 pnpm 11.5.1。

```powershell
pnpm install
pnpm db:seed
pnpm dev
```

开发模式下，前端位于 `http://localhost:5173`，后端位于 `http://localhost:3000`。前端开发服务器会将 `/api` 请求转发到后端。

数据库默认位于 `server/data/hotwords.sqlite`。`pnpm db:seed` 会自动建表并导入 60 篇离线样本，重复执行不会重复写入。需要改变位置时可设置 `DATABASE_PATH` 环境变量。

常用质量检查：

```powershell
pnpm test
pnpm typecheck
pnpm build
```

## Docker 部署

构建镜像：

```bash
docker build -t vision-pulse:1.0.0 .
```

在 Flexus L 上创建持久化目录并启动：

```bash
sudo mkdir -p /opt/vision-pulse/data
docker run -d \
  --name vision-pulse \
  --restart unless-stopped \
  -p 80:3000 \
  -v /opt/vision-pulse/data:/data \
  vision-pulse:1.0.0
```

容器启动时会幂等初始化数据库。数据保存在宿主机 `/opt/vision-pulse/data`，重建容器不会丢失。部署后可访问 `/api/health` 检查服务状态。

## 数据来源与统计口径

种子快照位于 `server/seeds/official-sample.json`，于 2026-09-19 从 [CVF 官方开放论文库](https://openaccess.thecvf.com/) 和 [ECVA 官方论文列表](https://www.ecva.net/papers.php) 采集。数据覆盖 CVPR 2023/2024、ICCV 2023/2025、ECCV 2022/2024，每组均匀抽取 10 篇带摘要论文，共 60 篇。

该快照用于课程演示和离线复现，并不是会议完整录用论文集合，因此图表结果不应外推为会议整体趋势。`pnpm db:collect` 可重新采集，但需要访问外部站点。

论文检索优先查询本地数据库，未命中时尝试 OpenAlex，并在可用时通过 DBLP 校对书目信息。外部候选不会自动入库，必须由用户确认保存。若外部服务不可达，系统会返回明确提示，本地论文管理、统计和导入仍可使用。

关键词优先采用论文原始关键词；缺失时根据英文标题和摘要按固定规则提取。热度定义为：

```text
热度 = 包含该关键词的论文数 ÷ 当前筛选范围内论文总数
```

同一论文中的同一关键词只统计一次。CSV 字段、接口和错误格式详见 [后端接口说明](docs/backend-api.md)。

## 测试结果

本地生产模式验证结果：

- 后端自动化测试：16 个测试文件、46 项测试全部通过。
- TypeScript 类型检查：前端、后端和共享包全部通过。
- 生产构建：前端和后端均构建成功。
- 页面验收：35 项检查中 33 项通过；2 项为当前网络环境下 OpenAlex/DBLP 不可达，界面已正确显示友好错误提示。
- 生产路由：健康接口、首页及详情页刷新均通过，未知 API 正确返回 JSON 404。

Docker 镜像构建与公网访问将在 Flexus L 创建后进行最终复验，并将结果更新到本节。

## 已知限制

- 演示数据规模有限，趋势结果仅表示当前数据库中的样本。
- 外部检索依赖第三方服务和服务器网络环境，可能暂时不可用。
- 当前采用单机 SQLite，适合课程项目和轻量访问，不面向高并发生产场景。

## AI 使用说明

项目在需求梳理、方案讨论、测试设计、代码审查和文档整理过程中使用了 AI 辅助。功能范围、视觉设计、数据口径、测试判断和最终取舍均由本人确认，并通过自动化测试和人工验收核对结果。
