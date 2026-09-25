# materin-tech.github.io

Materin Tech 组织站点 —— 发布地址 **https://materin-tech.github.io/**

GitHub Pages 的「组织站点」规则：仓库名必须是 `<组织名>.github.io`，内容直接发布在
域名根路径（`/`）下，因此该仓库同时充当本站的**静态资源托管根**。

## 结构

```
.
├── index.html                    首页：插件系列 + 全部项目 + 资源托管 + 关于
├── about/index.html              组织说明（创立初衷 / 结构约定 / 初始化记录），中英双语
├── projects/                     项目介绍页（挂载自各项目仓库 README）
│   ├── materin-office/index.html
│   ├── materin-view/index.html
│   └── materin-ctx/index.html
├── 404.html                      自定义 404（Pages 自动使用）
├── data/projects.json            项目清单（唯一需要维护的数据文件）
├── assets/
│   ├── css/style.css             基础样式（CSS 变量 + 明暗双主题 + 卡片/网格）
│   ├── css/site.css              扩展样式（中英切换规则 + 文档页 prose/表格）
│   ├── js/main.js                主题、语言切换、项目列表渲染与标签过滤
│   └── img/favicon.svg           站点图标
└── .nojekyll                     禁用 Jekyll 处理，避免下划线目录被忽略
```

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
