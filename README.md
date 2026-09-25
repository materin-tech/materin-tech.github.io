# materin-tech.github.io

Materin Tech 组织站点 —— 发布地址 **https://materin-tech.github.io/**

GitHub Pages 的「组织站点」规则：仓库名必须是 `<组织名>.github.io`，内容直接发布在
域名根路径（`/`）下，因此该仓库同时充当本站的**静态资源托管根**。

## 结构

```
.
├── index.html              首页（项目展示 + 资源托管说明）
├── 404.html                自定义 404
├── data/projects.json      项目清单（唯一需要维护的数据文件）
├── assets/
│   ├── css/style.css       全站样式（CSS 变量 + 明暗双主题）
│   ├── js/main.js          项目列表渲染 / 标签过滤 / 主题切换
│   └── img/favicon.svg     站点图标
└── .nojekyll               禁用 Jekyll 处理，避免下划线目录被忽略
```

## 加项目

编辑 `data/projects.json`，追加一条：

```json
{
  "name": "项目名",
  "description": "一句话说明",
  "url": "https://github.com/materin-tech/<repo>",
  "homepage": "https://materin-tech.github.io/<repo>/",
  "tags": ["web"],
  "language": "TypeScript",
  "visibility": "public",
  "updated": "2026-09"
}
```

`tags` 会自动生成筛选按钮；`homepage` 为空则不显示「在线预览」。

## 托管静态资源

任何文件提交到仓库根目录或子目录，即可通过同路径访问：

```
https://materin-tech.github.io/assets/img/logo.svg
```

Pages 默认缓存约 10 分钟；需要强缓存时对文件名做内容哈希。

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000/
```

## 发布

推送到 `main` 即自动发布（Deploy from a branch → `main` / `/`，无需构建）。

```bash
git add -A && git commit -m "chore: update site" && git push
```

## 注意

- 免费组织计划下 Pages 仅支持 **public** 仓库。
- 组织站点同一域名下只能有一个 `materin-tech.github.io` 仓库；其他项目站点走项目级 Pages
  （`https://materin-tech.github.io/<repo>/`）。
