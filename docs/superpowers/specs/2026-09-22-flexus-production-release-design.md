# Flexus L 生产部署与 1.0.0 发布设计

## 1. 目标

将“视界脉冲”以可复现、可回滚的方式部署到华为云 Flexus 应用服务器 L 实例，并完成课程作业要求的最终工程收尾：

- 一个公网入口同时提供 Vue 页面和 Express API；
- SQLite 数据在容器重建或应用升级后仍然保留；
- 保留本地 Vite 开发体验；
- README 与实际功能、运行方式和数据范围一致；
- `dev` 验证通过后合并到 `main`；
- 创建 Release 1.0.0；
- 记录公网验收结果和最终提交历史。

## 2. 当前状态

- 前端使用 Vue 3、Vite、Vue Router、Element Plus 和 ECharts；
- 后端使用 Node.js 24、Express、TypeScript 和 `node:sqlite`；
- 开发环境由 Vite `5173` 端口代理 `/api` 到 Express `3000` 端口；
- `pnpm build` 已分别生成 `web/dist`、`server/dist` 和 `shared/dist`；
- Express 当前只提供 API，没有托管 `web/dist`；
- SQLite 默认位于 `server/data/hotwords.sqlite`，该目录已被 Git 忽略；
- `dev` 当前比远端领先，需要在发布前推送；
- 外部 OpenAlex/DBLP 可能受网络限制，系统已提供本地优先和友好错误提示。

## 3. 选择的部署方案

采用单台 Flexus L 实例和单个 Node.js 应用容器：

```text
浏览器
   │ HTTP :80
   ▼
Flexus L 公网 IP
   │ 端口映射 80 → 3000
   ▼
Node.js 24 / Express
   ├─ /api/*          → Express API
   ├─ /assets/*       → web/dist 静态资源
   ├─ 其他 GET 路径   → web/dist/index.html
   └─ /data/*.sqlite  → 持久化卷
```

### 3.1 选择理由

- 项目访问量低，单实例足以完成课程演示；
- 前后端同源，无需额外配置 CORS；
- Express 托管静态资源后只需维护一个应用进程；
- Node.js 24 可直接使用项目现有的 `node:sqlite`；
- Docker 镜像固定运行环境，避免云主机 Node/pnpm 版本差异；
- SQLite 放入宿主机挂载目录，升级镜像不会丢失数据。

### 3.2 暂不包含

- 多实例负载均衡；
- RDS 数据库迁移；
- Kubernetes/CCE；
- 自动弹性伸缩；
- 自动化 CodeArts Pipeline。

这些能力对当前课程项目没有必要，后续如需长期运行再扩展。

## 4. 应用改造

### 4.1 Express 静态资源托管

在所有 `/api` 路由和错误处理完成后，生产模式下启用静态资源：

1. 使用环境变量 `WEB_DIST_PATH` 指定前端构建目录；
2. 未指定时，从编译后的 `server/dist` 推导仓库内的 `web/dist`；
3. 目录存在时注册 `express.static`；
4. 非 `/api` 的 HTML GET 请求返回 `index.html`，支持 Vue Router 直接刷新；
5. API 404 不能被 SPA 回退吞掉；
6. 开发模式仍由 Vite 提供页面和代理，不改变现有开发命令。

静态资源行为需要接口级测试覆盖：

- `/` 返回前端 HTML；
- `/papers/1` 返回相同 HTML，交由 Vue Router 处理；
- `/assets/*` 返回真实文件；
- 未知 `/api/*` 仍返回 API 404，而不是 HTML；
- 未构建前端时，API 服务仍可单独启动。

### 4.2 Docker 镜像

新增根目录 `Dockerfile`，使用 Node.js 24 官方 Linux 镜像：

1. 复制 workspace 清单和锁文件；
2. 使用 Corepack/pnpm 安装冻结依赖；
3. 复制源码并执行 `pnpm build`；
4. 设置 `NODE_ENV=production`、`PORT=3000`；
5. 设置 `DATABASE_PATH=/data/hotwords.sqlite`；
6. 容器启动时先执行幂等的 `pnpm db:seed`，再启动编译后的 Express；
7. 暴露容器端口 3000。

同时新增 `.dockerignore`，排除：

- `.git`；
- `node_modules`；
- 各包 `dist`；
- 本地数据库；
- `.env*`（保留示例文件不进入镜像也不影响运行）；
- 日志和临时文件；
- 博客截图等与运行无关的大文件。

### 4.3 持久化与备份

宿主机创建固定目录，例如 `/opt/vision-pulse/data`，启动容器时挂载到 `/data`：

```text
/opt/vision-pulse/data:/data
```

部署前备份 SQLite：

```text
/opt/vision-pulse/backups/hotwords-YYYYMMDD-HHMMSS.sqlite
```

发布失败时，停止新容器、启动上一版本镜像；如数据库迁移导致问题，再恢复发布前备份。本项目迁移函数必须保持幂等。

## 5. Flexus L 配置

建议规格：

- 2 vCPU、2 GiB 内存；
- Ubuntu/Node.js 应用镜像，确保 Docker 可用；
- 固定弹性公网 IP；
- 安全组开放 80（HTTP）和必要的管理端口；
- SSH 端口尽量限制为个人公网 IP，不向全网开放；
- 不直接开放 3000 端口，由 Docker 映射到公网 80。

第一版使用公网 IP 访问。若后续绑定域名，再增加 443、证书和 HTTPS 跳转；没有域名时不阻塞课程验收。

## 6. 部署流程

### 6.1 发布前

1. 更新 README；
2. 运行 `pnpm test`；
3. 运行 `pnpm typecheck`；
4. 运行 `pnpm build`；
5. 本地以生产模式启动 Express，验证静态页面和 API；
6. 构建 Docker 镜像并进行容器级冒烟测试；
7. 提交生产部署改造；
8. 经用户许可后推送 `dev`。

### 6.2 云端首次部署

1. 购买并启动 Flexus L；
2. 配置安全组；
3. 登录服务器，创建应用数据和备份目录；
4. 将仓库或构建上下文安全传到服务器；
5. 构建带版本标签的镜像 `vision-pulse:1.0.0`；
6. 以 `/opt/vision-pulse/data:/data` 挂载启动容器；
7. 检查容器日志和健康接口；
8. 使用公网 IP 完成验收。

不把 CodeArts 密码、访问令牌或 SSH 私钥写进仓库、Dockerfile、README 或命令历史示例。

### 6.3 后续更新

每次构建新的不可变镜像标签，验证成功后替换容器。至少保留上一个可用镜像和发布前数据库备份，避免只能向前、不能回滚。

## 7. README 最终结构

README 更新为以下内容：

1. 作业链接、学号和项目名称；
2. 项目简介与核心功能；
3. 在线体验地址；
4. Figma 原型和博客地址；
5. 技术栈与项目结构；
6. 数据来源、样本范围和统计口径；
7. 本地开发步骤；
8. CSV 格式；
9. 测试、类型检查和构建命令；
10. 生产部署说明；
11. AI 工具与人工审查说明；
12. 已知限制，包括外部数据源可用性和样本代表性。

在线体验地址和博客地址在实际产生前使用明确占位，最终发布提交前必须全部替换，不能带占位发布 Release。

## 8. 分支、合并与 Release

### 8.1 分支策略

1. 所有生产改造和 README 更新先在 `dev` 完成；
2. 完整验证通过后推送 `dev`；
3. 从远端 `main` 建立本地跟踪分支；
4. 将 `dev` 合并到 `main`，保留清晰的合并记录；
5. 再次运行关键验证；
6. 推送 `main`。

任何合并和推送均需要用户明确许可。

### 8.2 Release 1.0.0

在 CodeArts 中基于最终 `main` 创建 `1.0.0` Release。发布说明包括：

- 六个前端页面；
- 论文 CRUD 与详情；
- 本地优先和外部候选检索；
- CSV 部分成功导入；
- Top 10、共现图谱和年度趋势动画；
- 官方样本数据范围；
- 测试结果；
- 公网体验地址；
- 已知限制。

Release 只在公网部署与验收完成后创建，避免发布说明指向不可用地址。

## 9. 验收标准

### 9.1 自动检查

- 后端 15 个测试文件、40 项测试全部通过；
- `pnpm typecheck` 通过；
- `pnpm build` 通过；
- 静态托管和 SPA 回退测试通过；
- Docker 镜像成功构建和启动；
- `/api/health` 返回成功。

### 9.2 公网功能验收

- 首页、趋势、论文库、数据导入、论文详情、关于页均可访问；
- 直接刷新 Vue 子路径不返回 404；
- 导航、筛选、分页和趋势动画正常；
- 论文新增、编辑、删除形成闭环；
- CSV 成功和失败明细正确；
- 移动端无横向溢出；
- 服务重启后数据仍存在；
- 外部数据源不可用时显示友好提示，不影响本地功能。

### 9.3 发布完成条件

- README 不含过时说明或待补占位；
- `dev` 与 `main` 已推送；
- CodeArts Release 1.0.0 可访问；
- 博客包含仓库、原型、部署和 Release 链接；
- 博客写入最终测试结果和部署截图；
- 最终提交记录与远端一致。

## 10. 风险与处理

| 风险 | 处理方式 |
| --- | --- |
| 外部论文源在云服务器仍不可用 | 保持本地优先；公网验收记录错误提示；不把上游故障描述成本地功能成功 |
| SQLite 随容器删除 | 强制挂载 `/data`，部署前后检查文件位置 |
| Vue 子路径刷新 404 | Express 增加 SPA 回退并自动测试 |
| 私有仓库凭据泄漏 | 不写入镜像和仓库；优先使用受控上传或临时凭据 |
| 80 端口无法访问 | 检查安全组、宿主机防火墙和容器映射 |
| 镜像升级失败 | 保留旧镜像标签和数据库备份，执行回滚 |
| 前端分包较大 | 当前作为非阻断警告记录；不在发布前引入高风险重构 |

