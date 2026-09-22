# 后端接口说明

基址：`http://localhost:3000`。成功响应统一为 `{ "success": true, "data": ..., "message": ... }`；失败响应统一为 `{ "success": false, "error": { "code": ..., "message": ..., "details": null } }`。

## 论文和外部检索

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/health` | 服务健康检查 |
| GET | `/api/search?title=...` | 题目精确查本地；未命中才查 OpenAlex/DBLP |
| GET | `/api/search/external?title=...` | 直接查询外部候选，不自动保存 |
| GET | `/api/papers` | 论文列表与筛选 |
| GET | `/api/papers/:id` | 论文详情 |
| GET | `/api/papers/:id/related?limit=5` | 根据共有关键词推荐相关论文 |
| POST | `/api/papers` | 创建论文；可保存已确认的外部候选 |
| PATCH | `/api/papers/:id` | 修改论文 |
| DELETE | `/api/papers/:id` | 删除论文 |

`GET /api/papers` 可组合 `id`（编号模糊）、`title`（题目精确）、`q`（题目模糊）、`keyword`（关键词模糊）、`conference`、`year`、`page`、`pageSize`。`keyword` 与图谱使用同一归一化/提取规则，因此未提供原始关键词的论文也能被图谱跳转筛出。`pageSize` 最大为 100。

创建论文最少需要 `title`、`paperUrl`、`source`；建议同时提交 `conference`、`year`、`abstract`、`authors`、`keywords`、`externalId`。`source` 允许 `manual`、`csv`、`seed`、`openalex`、`dblp`、`dblp+openalex`。`paperUrl` 仅接受 HTTP(S)。重复外部编号或重复标题+会议+年份返回 409。

## CSV 批量导入

`POST /api/imports/csv`：请求头 `Content-Type: text/csv`，请求体直接放 CSV 文本，可选 `X-File-Name`。前端选择文件后读取文本并发送即可；当前接口不使用 `multipart/form-data`。上限 1 MB、500 条数据行，采用部分成功策略。响应含 `id`、总数、成功数、失败数及每个失败行的行号和原因；`GET /api/imports/:id` 可再次读取结果。

表头最低只要求 `title`，可选 `conference,year,paperUrl,externalId,abstract,keywords,authors,venue,doi`。提供 `paperUrl` 时直接导入完整数据；缺少 `paperUrl` 时，服务按题目查询 OpenAlex/DBLP，仅在标题完全匹配且候选唯一时自动补全摘要、关键词、作者和原文链接。`conference`、`year` 可用于消除同名候选歧义；无精确候选、候选仍不唯一或外部服务失败时，该行进入失败明细，不影响其他合法行。外部查询最多并发 3 条，避免批量请求对第三方服务造成过大压力。

仅包含题目、由系统自动补全的示例：

```csv
title,conference,year
"Segment Anything",ICCV,2023
```

直接导入完整数据时，`keywords` 和 `authors` 的多个值用竖线 `|` 分隔；含逗号、引号或换行的单元格遵循标准 CSV 引号规则。例如：

```csv
title,conference,year,paperUrl,keywords,abstract
"Example Vision Paper",CVPR,2024,https://example.org/paper,"object detection|vision transformer","A short abstract."
```

## 分析接口

四个接口均支持 `conference`、`yearFrom`、`yearTo` 组合筛选。

| 方法 | 路径 | 返回内容 |
|---|---|---|
| GET | `/api/analysis/overview` | 总论文数、三个会议各自数量、年份 |
| GET | `/api/analysis/top-keywords?limit=10` | 热词及论文数、热度占比 |
| GET | `/api/analysis/graph?nodeLimit=30&minCooccurrence=1` | 关键词节点与共现边 |
| GET | `/api/analysis/trends?keywordLimit=10` | 关键词跨会议/年份折线点 `points`，以及每组年度排名动画帧 `frames` |

统计实时读取本地数据库；增删改和导入后无需手动刷新统计缓存。`heat` 是 0 到 1 的比例，前端若显示百分比需乘以 100。图谱节点 `keyword` 可作为 `/api/papers?keyword=...` 的筛选参数。趋势 `points` 包含全局 Top N 关键词在各会议/年份的数量（包括 0），适合折线对比；`frames` 含每个会议/年份自己的 Top N，适合播放排名变化。

当前快照只有每个会议年份 10 篇，图表用于功能演示，不能代表会议总体研究趋势。没有原始关键词时，系统从标题和摘要以固定词表、停用词和短语规则提取；不是大模型分类或人工主题标注。
