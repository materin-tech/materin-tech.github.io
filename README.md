# materin-tech.github.io

Materin Tech 组织站点 —— 发布地址 **https://materin-tech.github.io/**

GitHub Pages 的「组织站点」规则：仓库名必须是 `<组织名>.github.io`，内容直接发布在
域名根路径（`/`）下，因此该仓库同时充当本站的**静态资源托管根**。

## 结构

```
.
├── index.html                    首页：品牌（格物）+ 现在的内容，站内跳转优先
├── about/index.html              关于 Materin（品牌 / 格物 / 产品定位 / 结构约定 / 初始化记录）
├── design/index.html             Materin UI 规范（令牌表 + 可交互色块 + 实测差异清单）
├── projects/index.html           内容索引（JSON 驱动，带标签筛选）
├── projects/                     内容说明页（挂载自各项目仓库 README）
│   ├── materin-office/index.html
│   ├── materin-view/index.html
│   └── materin-ctx/index.html
├── 404.html                      自定义 404（Pages 自动使用）
├── data/projects.json            项目清单（唯一需要维护的数据文件）
├── assets/
│   ├── css/materin-ui.css        品牌 UI 令牌 —— 唯一改风格的地方，插件也用同一份
│   ├── css/style.css             站点皮肤（只引用令牌，不写死色值）
│   ├── css/site.css              扩展样式（中英切换规则 + 文档页 prose/表格）
│   ├── js/main.js                主题、语言切换、项目列表渲染与标签过滤
│   └── img/favicon.svg           站点图标
└── .nojekyll                     禁用 Jekyll 处理，避免下划线目录被忽略
```

## UI 令牌（产品定位：一套 UI）

Materin 的产品定位是**系列共用一套 UI**，落点就是 `assets/css/materin-ui.css`：

- 取值规则：优先取宿主变量（Obsidian 的 `--interactive-accent` / `--background-primary` / `--radius-s` …），
  取不到时才用品牌回落值 —— 用户换主题，插件与网页自动跟着变；
- 站点皮肤 `style.css` 的 `:root` 已改成只引用 `--materin-*`，**不要在页面样式里新写色值**；
- 新页面必须按 `materin-ui.css` → `style.css` → `site.css` 的顺序引入，否则样式取不到值；
- 插件侧不远程 `@import`（单文件打包 + 需离线可用），改为把令牌的 `:root` 段复制进插件 `styles.css`。

规范页 `/design/` 里同时记录了三个插件 `styles.css` 的实测差异（强调色语义、状态色三套写法、硬编码色值）。

## 站内优先原则（重要）

首页与内容索引承担「说清楚」的职责，外部站点只作为**出处**出现在最后一层：

- 卡片、导航、CTA **一律指向站内页面**（`/projects/...`、`/about/`），任何位置都不把访客直接送出站；
- GitHub 链接只出现在**内容说明页内部**，位于讲完内容之后，且按钮文字标注「（外部链接）」；
- 首页不出现工具性内容（资源托管地址、CDN 用法、构建方式等），这些留在 README 里给维护者看；
- 首页结构：品牌（格物）→ 现在的内容 → 关于，不堆砌条目。

## 多语言机制

不依赖任何框架，两种语言同时写在 HTML 里，用属性切换显示：

```html
<span class="lang-zh">项目</span><span class="lang-en">Projects</span>

<div class="lang-zh">整段中文内容…</div>
<div class="lang-en">Full English block…</div>
```

- 规则在 `assets/css/site.css`：`html[data-lang="en"]` 时隐藏 `.lang-zh`，否则隐藏 `.lang-en`。
- `data-lang` 在 `<head>` 内联脚本里按 `localStorage.lang` → `navigator.language` 的顺序设置，避免闪烁；
  右上角按钮手动切换并持久化。
- JS 渲染的内容（项目卡片）从 `data/projects.json` 取值，字段为 `{"zh": "...", "en": "..."}`。

## 维护项目清单

编辑 `data/projects.json`，追加一条：

```json
{
  "name": "Materin Office",
  "slug": "materin-office",
  "version": "0.1.3",
  "description": { "zh": "中文一句话", "en": "One-line English" },
  "url": "https://github.com/<owner>/<repo>",
  "page": "/projects/materin-office/",
  "homepage": null,
  "tags": ["obsidian", "plugin"],
  "language": "TypeScript",
  "visibility": "public",
  "updated": "2026-09"
}
```

- `page`：本站内的介绍页路径；有值时卡片标题与「介绍页」链接都指向它，否则指向 `url`。
- `homepage`：外部在线预览地址，为空则不显示。
- `tags`：自动生成筛选按钮。
- `version`：有值时显示为卡片上的版本徽标。

## 新增一个项目介绍页

1. 建目录 `projects/<repo>/index.html` —— 直接复制现有页面改内容最快；
2. 页面里用 `.lang-zh` / `.lang-en` 成对写两种语言；
3. 在 `data/projects.json` 里把 `page` 指向它；
4. 提交推送。

> 路径选择：介绍页放在 `/projects/<repo>/` 而不是 `/<repo>/`，因为后者是**项目级 Pages**的地址
> （`https://materin-tech.github.io/<repo>/`）。将来给某个项目单独开 Pages 时两者不会撞车。

## 托管静态资源

任何文件提交到仓库根目录或子目录，即可通过同路径访问：

```
https://materin-tech.github.io/assets/img/favicon.svg
```

Pages 默认缓存约 10 分钟；需要强缓存时对文件名做内容哈希。

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000/  （必须从这个目录启动，否则绝对路径 /assets/... 取不到）
```

## 发布

推送到 `main` 即自动发布（Deploy from a branch → `main` / `/`，无需构建，首次约 20 秒完成）。

```bash
git add -A && git commit -m "chore: update site" && git push
```

## 注意

- 免费组织计划下 Pages 仅支持 **public** 仓库。
- 组织站点同一域名下只能有一个 `materin-tech.github.io` 仓库；其他项目站点走项目级 Pages
  （`https://materin-tech.github.io/<repo>/`）。
- 组织主页简介（github.com/materin-tech 显示的那段）在另一个仓库 `materin-tech/.github`
  的 `profile/README.md`，与本文件内容不同，改的时候别搞混。
