# 代码规范（codestyle.md）

> **规范来源（2026-09-19 查阅）**
>
> - [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)：TypeScript 文件组织、命名、导入导出、类型与可读性规则。
> - [Vue 官方风格指南：必要规则（Priority A）](https://vuejs.org/style-guide/rules-essential.html)与[强烈推荐规则（Priority B）](https://vuejs.org/style-guide/rules-strongly-recommended.html)：Vue 单文件组件规则。
> - [TypeScript 官方文档：`strict` 选项](https://www.typescriptlang.org/tsconfig/strict.html)：严格类型检查依据。
> - [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)：提交信息格式依据。
>
> 本文按上述公开规范整理，并针对本项目的 TypeScript、Vue、Express 和 SQLite 技术栈作了取舍。标有“项目约定”的条目是团队补充规则，不表示原规范逐字要求。若上游规范与本文冲突，先遵守本文，并在代码审查中讨论是否修订。

## 1. 适用范围与优先级

本规范适用于 `server/`、`web/`、`shared/` 中手写的 TypeScript、Vue 和测试代码。代码首先应正确、易读、可测试；保持与同一模块现有代码一致。新增规则不要求为纯格式差异大规模改写旧文件。

## 2. TypeScript 基础规则

以下规则主要参考 Google TypeScript Style Guide；另行注明的为项目约定。

- 文件使用 UTF-8 编码。变量、函数和方法使用 `lowerCamelCase`；类、接口、类型别名使用 `UpperCamelCase`；常量使用表达其含义的名称，不使用无意义缩写或 `I` 前缀接口名。
- 优先使用 `const`；确需重新赋值时使用 `let`，不使用 `var`。只导出模块调用方确实需要的符号，优先使用具名导出。
- 导入常用符号时优先使用具名导入；仅用于类型的符号使用 `import type`，类型再导出使用 `export type`。避免无必要的副作用导入和循环依赖。
- 保持函数职责单一；复杂分支拆成有意义的辅助函数。注释解释“为什么”或业务约束，不重复代码已经说明的“做了什么”。
- 不使用 `eval`，不修改语言内置对象；不要用未经筛选的 `for...in` 遍历对象属性。
- **项目约定：**沿用现有代码的两个空格缩进、单引号和语句末尾分号；文件名使用小写 `kebab-case`，测试文件以 `.test.ts` 结尾。不要仅为格式统一而改动无关代码。

## 3. 类型与数据边界

类型安全以 TypeScript 官方 `strict` 选项为依据；以下操作细则为项目约定。

- 保持仓库已有的 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等检查开启。新增代码须通过 `pnpm typecheck`。
- 优先用明确的输入、输出类型和联合类型表达状态；避免 `any`。来自 HTTP、CSV、数据库迁移或第三方接口的数据先视为 `unknown`，验证后再使用。
- 不以类型断言代替运行时校验。确实需要断言时，应能说明其前提；不要用 `@ts-ignore` 长期掩盖错误。
- 明确区分缺失值、`null` 和空字符串；对数组索引、可选字段和外部响应处理空值情况。

## 4. Vue 页面与组件

以下规则参考 Vue 官方风格指南；文件布局等细节为项目约定。前端目前只有骨架，后续页面开发时执行。

- 组件名称使用多个单词，根组件 `App.vue` 例外；组件文件名统一使用 `PascalCase.vue`。
- `props` 声明具体类型；`v-for` 必须提供稳定且唯一的 `:key`；不要在同一元素上同时使用 `v-if` 和 `v-for`。
- 组件样式避免无意影响其他页面，优先使用作用域样式或明确的命名空间。
- **项目约定：**页面组件负责展示与交互，数据请求封装在独立模块；不要在模板中放复杂计算或直接拼接后端请求地址。异步操作应呈现加载、空数据和错误状态。

## 5. 后端、数据库与外部服务（项目约定）

- 按现有结构区分路由、业务服务、数据仓库和外部接口客户端。路由处理参数与响应，业务规则放在服务层，SQL 放在仓库层。
- 对请求参数和导入数据做运行时校验；返回符合 `shared/` 中公共类型的结构，并使用恰当的 HTTP 状态码。不要把堆栈、密钥或内部 SQL 错误直接返回给用户。
- SQL 中的用户输入使用参数绑定，不拼接成语句。批量导入需要明确重复数据和部分失败的处理方式。
- 访问 OpenAlex、DBLP 等外部服务时设置超时，区分网络故障、无结果与格式错误；测试时使用可控的模拟响应，不依赖实时网络。
- 密钥、个人凭据和本地数据库不得写入源码或提交到仓库；配置使用环境变量，并提供不含真实密钥的示例。

## 6. 测试与提交（项目约定）

- 修改业务逻辑时补充或更新测试，覆盖正常路径及相关边界条件，例如空输入、非法数据、重复论文和外部接口失败。测试应可重复运行，不依赖执行顺序。
- 提交前运行 `pnpm typecheck`、`pnpm test` 和 `pnpm build`；仅修改文档时至少检查 Markdown 内容和 `git diff --check`。
- 提交信息参照 Conventional Commits，格式为 `类型(可选范围): 简短说明`，例如 `feat(server): add paper import`、`fix(web): handle empty trends`、`docs: add code style guide`。每次提交聚焦一项变更。
- 保持 `.gitignore` 有效，不提交 `node_modules/`、`dist/`、构建产物、本地数据库、日志或真实环境配置。作业要求的原型应由专用原型设计工具制作，但不能直接使用原型工具生成项目代码。

## 7. 当前执行状态

仓库已启用 TypeScript 严格检查，并提供 `typecheck`、`test`、`build` 脚本。本文件是团队的书面规范；目前尚未配置 ESLint 或 Prettier 自动检查，因此不能将这些条目视为已由工具强制执行。日后引入自动检查时，应让配置与本文一致，并在变更说明中标明。
