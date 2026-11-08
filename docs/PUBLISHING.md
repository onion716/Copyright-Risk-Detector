# DeepSeek Harness 插件「上架规范」与本项目对照

本文说明 DeepSeek Harness（dsh）插件的上架/收录规则，并逐条对照本仓库
`dsh-virtual-product-risk`（虚拟商品违规风险检测工作台）现在的状态，列出还需要你调整的地方。

> 依据：`awesome-dsh-plugin` 精选列表的贡献指南、`dsh-market` 的插件市场说明、以及本机 dsh 0.2.2-rc.1 的插件清单/槽位实测。

---

## 一、先说结论

- 本项目现在**已经是一个可安装的 dsh 插件**：本机已用 Harness 插件管理器安装并激活（Host 行 `virtual-product-risk` fiberPhase=active，浏览器端已注册侧栏入口和主页面板）。
- 距离「正式上架到插件市场」还差的是**发布与收录动作**（发 npm、提 PR 到 awesome 列表、加仓库 topic、补截图），以及下面第五节列的若干**调整项**。

---

## 二、什么才算「一个可安装的 dsh 插件」

一个插件包就是在 `package.json` 里声明 `dsh.bundle` 的 npm 包：

```jsonc
{
  "name": "your-package-name",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },  // ← 必需：能被 `dsh plugin add` 安装
    "client": { "platform": "web" }               // 仅当带浏览器 UI 时需要
  }
}
```

并在包根放一个 `cordis.patch.yml`：

```yaml
- insert:
    - id: your-plugin-id
      name: your-package-name
```

**最常见的被拒原因：只声明了 `dsh.client`，没有 `dsh.bundle`。** 只声明 `dsh.client` 的包无法安装。

带 Web UI 的插件还需要：

- 导出 `./client`（本项目的 `client.js`，`window.__ModuleLoader__.load({ id, factory })` 形态，id 必须等于包名）；
- `dsh.client.platform: "web"`，必要时 `dsh.client.inject` 声明依赖的客户端包用于加载排序；
- 浏览器端通过**主题 token**（`--dsw-alias-*`）和 **locale 服务**融入宿主 UI，不能替换 app 根节点、不能读别的插件 DOM。

本项目：✅ 已满足（`dsh.bundle` + `dsh.client` 都在 `package.json`，`cordis.patch.yml` 存在，`client.js` 为 ModuleLoader 形态且 id = 包名）。

---

## 三、上架到「插件市场」的通道

dsh 的插件市场（Discover）读取的是**索引文件（format 1）**。社区主索引是：

```
https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json
```

（GitHub Pages 镜像：`https://awesome-dsh-plugin.com/index.json`、`https://dshmarket.com/index.json`。）

这个索引由精选列表仓库 [`awesome-dsh-plugin/awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 生成。**收录 = 去那个仓库提 PR**，不是在 dsh-market 应用仓库提。

一个 PR 只加**一个文件**：`data/plugins/<owner>__<repo>.yml`，例如：

```yaml
url: https://github.com/onion716/Copyright-Risk-Detector
name: onion716/Copyright-Risk-Detector
category: tools
description:
  en: A workbench that checks virtual-product listings for copyright, slang and banned-word risk using a local lexicon plus a DeepSeek review.
  zh: 虚拟商品违规风险检测工作台：用本地版权/暗语/违禁词词库加 DeepSeek 复核，检查虚拟商品的上架风险。
# 可选：GitHub 托管的位图作为市场卡片图标
# icon: https://raw.githubusercontent.com/onion716/Copyright-Risk-Detector/main/assets/icon-180.png
# 可选：预构建 tarball（不发 npm 时）
# tarball: https://github.com/onion716/Copyright-Risk-Detector/releases/latest/download/dsh-virtual-product-risk.tgz
```

合并后站点和市场通常一天内自动收录。

**另有一条路**：只把索引源加到 dsh「插件 → 发现 → 索引源」也可以搜索到已发布到 npm 的插件；但要进社区精选列表仍需上面的 PR。

---

## 四、收录硬性要求（逐条对照）

| 要求 | 本项目状态 |
|---|---|
| `package.json` 声明 `dsh.bundle` | ✅ |
| 有 `cordis.patch.yml` | ✅ |
| 真实可用代码（非占位/纯 README） | ✅ 规则引擎 + 大模型复核 + 工作台 UI |
| 仓库创建满 1 天 | ⚠️ 需确认（本仓库由你创建，请确认已满 1 天） |
| 持续维护（不归档、不停更） | ⚠️ 取决于后续维护 |
| 仓库加 `dsh-plugin` topic | ⚠️ 待加（可用 `gh repo edit --add-topic dsh-plugin`） |
| 一个 PR 最多 3 条 | ✅ 只提 1 条 |
| 只改自己的条目 | ✅ |
| 描述准确、不带营销词、不提不存在的命令/API/数量 | ⚠️ 见第五节第 6 条 |
| 分类贴合实际 | 建议 `tools`（也可 `workflow`） |
| 依赖指向原作者/上游 | ✅ 无第三方运行时依赖，词库已注明出处 |
| 官方 `@deepseek-ai/*` 用 `peerDependencies` 而非 `dependencies` | ✅ 未声明官方依赖 |
| 推荐：发布 npm（预构建安装免 build 授权） | ⚠️ 见第五节第 1 条 |

---

## 五、需要你调整 / 确认的事项

1. **发布到 npm（推荐，也最省事）。** 为了让市场「一键装」且不弹 build 审批：
   - 当前包名是无 scope 的 `dsh-virtual-product-risk`，请先在 npm 查名；若已被占用，改成 `@onion716/dsh-virtual-product-risk` 之类带 scope 的名字，并同步改 `package.json` 的 `name`、`cordis.patch.yml` 里的 `name`、`client.js` 里的 `id`（三处必须一致）。
   - 本项目已把 `private` 设为 `false`；执行 `npm publish --access public` 即可。
   - 不发 npm 的话，需要在 GitHub Release 附一个**文件名不带版本号**的 `.tgz`，并在 YAML 里写 `tarball:`。

2. **加仓库 topic 与描述。** `gh repo edit onion716/Copyright-Risk-Detector --add-topic dsh-plugin --description "虚拟商品违规风险检测工作台（DeepSeek Harness 插件）"`。

3. **补截图。** 精选列表和市场卡片会从 README 自动抽取截图，作者自荐截图效果最好。建议在 README 放 2–3 张浅色工作台的实际截图（表单、检测结果、处置建议各一张）。这一步需要你在浏览器里点开工作台截图，我这边无法代替（见第七节）。

4. **补一个 `Config` schema（建议）。** 目前 Host 行 `config: {}`、插件未导出 `Config`，所以「插件配置」页里不会出现可填写的表单，`/virtual-product-risk/api/meta` 里也无法展示可调项。建议导出 schemastery 的 `Config`，暴露 `provider` / `model` / `maxImages` / `temperature` 等，用 `ctx.config` 读取。这样用户不写 YAML 也能在设置页改模型。

5. **补一个 Agent 工具（建议）。** 按 Harness 的「一个操作、两个调用方」实践，工作台的分析能力也应开放成工具（例如 `virtual_product_risk_check`），让 agent 在对话里直接调用同一套 Host 逻辑（同一 `analyze()`）。这会让插件对「对话式使用」也友好，描述里也可以如实写「提供 X 个工具」。

6. **确认描述用词。** 收录评审会拿描述逐条对代码核对。当前插件实际提供：1 个侧栏工作台页面（内含「检测」与「资料库」两个视图）、3 个 HTTP 接口（`meta` / `library` / `analyze`）、0 个 agent 工具。请在 YAML 描述里只写这些，不要写「提供 N 个工具」之类目前不存在的说法。

7. **数据与许可（重要）。** 本项目**只在产品思路与信息组织方式上参考** [`yhslgg-arch/xianyu-blacklist`](https://github.com/yhslgg-arch/xianyu-blacklist)；`assets/` 下的词库与规则数据由本项目自行整理，**版权不归该仓库作者**，数据来源为公开资料与知识星球文章。公开发布含 4474 条真实名单的 `risk-names.json` 时，仍建议你自行确认再分发边界。可选：把真实名单放 `local-data/`（`.gitignore` 排除）、只发布工具与虚构示例，用户通过配置加载真实数据；或保留词库并在 README 与包内注明来源与免责声明（当前做法）。

8. **确认 `client.js` 的 CSS 注入方式。** 当前用 `document.createElement('style')` 注入并随插件卸载移除（与 `dsh-context` 等社区插件一致）。这符合「不替换 app 根节点、不读别的插件 DOM」。若你之后改用 TSX + Tailwind（更接近 shadcn 官方组件），需要引入构建步骤（`tsdown` 产出 `lib/client.js`）并更新 `files`。

---

## 六、验证记录与限制

- ✅ 宿主端：`index.js` 与 `client.js` 通过 Node 语法检查；`package.json`/`locale` 通过 JSON 校验；`icon.svg` 为合法 SVG（843 字节，远小于 256 KiB 上限）。
- ✅ 规则引擎：以真实样例跑通 `analyze`（「粉bi课堂 公考课程 / 国家级名师 100%押题 / 克劳德代充」→ 红灯，命中版权候选、极限词与破解/账号类禁售词，并生成处置卡）。
- ✅ 客户端渲染：用伪 React 渲染空状态与「带结果」两种界面均无异常，红灯、命中明细、DeepSeek 复核、改写建议、处置建议、合规四查都能渲染。
- ✅ 已安装：`plugin_manager` 安装返回 `application: applied`；`list_plugins` 显示 `include:virtual-product-risk` 为 `active`；客户端 `Slots` 显示 `sidebar.panellist` 与 `main` 都有 `virtual-product-risk` 占用者且 `active: true`。
- ⚠️ 未验证：受宿主的浏览器 Cookie 鉴权限制，我**无法**从命令行直接调用 `/virtual-product-risk/api/*`（返回 403 是预期的安全拦截），也**无法**在 Electron 窗口里点开工作台截图。真实的大模型调用与最终视觉效果需要你在 GUI 里点一次「开始检测」确认。
- ⚠️ 大模型：客户端默认用宿主当前模型（本机为 `magpie / workbuddy/deepseek-v4.1-flash`，具备图像输入）；若探活失败会自动降级为「仅本地词库结果」，不会中断。

---

## 七、建议的下一步

1. 在 GUI 左侧点「违规检测」→ 填一条真实商品试跑，确认大模型复核与配图识别正常。
2. 把模型能力做成 `Config`，并在设置页露出（第五节第 4 条）。
3. 把分析能力注册成 agent 工具（第五节第 5 条）。
4. 截图、写 README 安装段落、加 `dsh-plugin` topic。
5. `npm publish`，再向 `awesome-dsh-plugin` 提 PR（`data/plugins/onion716__Copyright-Risk-Detector.yml`，category `tools`）。
