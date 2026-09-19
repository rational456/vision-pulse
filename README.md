# 102400328

软件工程实践第二次作业——与AI结对编程（顶会热词统计）

## 当前进度

后端已提供论文搜索与管理、CSV 导入、官方论文样本初始化、关键词 Top 10、共现图谱和跨会议/年份趋势数据。前端正式页面等待专用原型工具完成设计后实现；仓库中现有页面仅为临时骨架，不是作业原型。

## 本地运行

要求 Node.js 24.15+ 和 pnpm 11.5.1。在仓库根目录执行：

```powershell
pnpm install
pnpm db:seed
pnpm --filter @hotwords/server dev
```

服务默认位于 `http://localhost:3000`，可先访问 `/api/health`。`pnpm db:seed` 会自动建立数据库，重复执行不会重复导入。数据库默认位于 `server/data/hotwords.sqlite`，已被 `.gitignore` 忽略。需要更改位置时设置 `DATABASE_PATH` 环境变量。

运行检查：

```powershell
pnpm test
pnpm typecheck
pnpm build
```

## 数据来源和限制

种子快照位于 `server/seeds/official-sample.json`，2026-09-19 从 [CVF 官方开放论文库](https://openaccess.thecvf.com/) 和 [ECVA 官方论文列表](https://www.ecva.net/papers.php) 采集。范围为 CVPR 2023/2024、ICCV 2023/2025、ECCV 2022/2024，每组从官方列表均匀抽取 10 篇带摘要的论文，共 60 篇。它是可离线复现的课程演示样本，**不是完整录用论文集合，不应将图表结论外推为会议整体趋势**。可运行 `pnpm db:collect` 重新抓取，但这需要访问官方站点且可能遇到临时网络故障；平时初始化无需联网。

单篇外部检索使用 [OpenAlex](https://help.openalex.org/data/works/) 提供摘要等元数据，DBLP 仅在可用时补充书目校对。外部候选不会自动入库，须由用户确认后通过论文新增接口保存。

关键词优先使用论文提供的关键词；没有时按固定规则从英文标题和摘要中提取。热度为“包含该关键词的论文数 ÷ 当前筛选范围论文总数”，同一篇论文同一关键词只计一次。详细接口与 CSV 模板见 [后端接口说明](docs/backend-api.md)。
