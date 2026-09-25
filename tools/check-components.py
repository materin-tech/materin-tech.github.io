#!/usr/bin/env python3
"""
Materin 组件一致性检查（命名契约的守门人）—— materin-ui 仓库正本

可校验任意一个 Materin 仓库（站点或插件）：

    python3 tools/check-components.py --repo /opt/data/workspace/materin-tech/materin-tech.github.io
    python3 tools/check-components.py --repo /opt/data/workspace/Materin-office   # 插件仓接入后

检查项
  1. 契约  ：HTML / JS / CSS 里的类名必须符合命名契约（materin-* / is-*，i18n 类除外）
  2. 存在性：HTML / JS 用到的每个 materin-* 类名都要在 CSS 里定义
  3. 注册  ：CSS 里定义的每个组件都要登记在组件清单里
  4. 反向  ：清单里每个名字都要真的存在于 CSS
  5. 令牌  ：组件层 CSS 不得出现裸色值（令牌层 :root / 浅色主题块例外）
  6. 令牌存在性：CSS 里引用的每个 var(--materin-*) 都必须在令牌文件里有定义

用法要点
  --repo     : 被校验的仓库根目录（默认：当前目录）
  --registry : 组件清单路径（默认：<repo>/data/components.json，回落 <repo>/registry/components.json）
  --tokens   : 令牌文件路径（默认：<repo>/assets/css/materin-ui.css）
  退出码 0 = 全部通过
"""
import argparse
import json
import pathlib
import re
import sys

ALLOWED_NON_CONTRACT = {"lang-zh", "lang-en", "lang-inline"}
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB = re.compile(r"\brgba?\(")
COMMENT = re.compile(r"/\*.*?\*/", re.S)
TOKEN_BLOCK = re.compile(r"^\s*(:root|html\[data-theme|\.theme-light)")
VAR_USE = re.compile(r"var\(\s*(--materin-[\w-]+)")
VAR_DEF = re.compile(r"^\s*(--materin-[\w-]+)\s*:")


def strip_comments(text: str) -> str:
    return COMMENT.sub(lambda m: "\n" * m.group(0).count("\n"), text)


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--repo", default=".")
    ap.add_argument("--registry", default=None)
    ap.add_argument("--tokens", default=None)
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    repo = pathlib.Path(args.repo).resolve()
    if not repo.is_dir():
        print(f"仓库目录不存在：{repo}")
        return 2
    registry_path = pathlib.Path(args.registry) if args.registry else None
    if registry_path is None:
        for cand in (repo / "data" / "components.json", repo / "registry" / "components.json"):
            if cand.exists():
                registry_path = cand
                break
    tokens_path = pathlib.Path(args.tokens) if args.tokens else repo / "assets" / "css" / "materin-ui.css"

    css_dir = repo / "assets" / "css"
    css_files = [f for f in sorted(css_dir.glob("*.css")) if f.name != "materin-ui.css"] if css_dir.is_dir() else []

    html_files = (
        sorted(repo.glob("*.html")) + sorted(repo.glob("*/*.html")) + sorted(repo.glob("*/*/*.html"))
    )
    js_files = sorted(repo.glob("assets/js/*.js")) + sorted(repo.glob("*.js"))

    problems = []

    # 组件清单（跨仓库：只对本仓库实现的条目做「必须存在」的反向检查）
    registered, shorthand, own = set(), set(), set()
    if registry_path and registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        for c in registry["components"]:
            registered.add(c["name"])
            for part in c.get("parts", []):
                registered.add(part)
            for var in c.get("variants", []):
                shorthand.add(c["name"] + var)
            if c.get("repo") in (None, repo.name):
                own.add(c["name"])
                own.update(c.get("parts", []))
                own.update(c["name"] + v for v in c.get("variants", []))
    else:
        problems.append(f"[清单] 找不到组件清单（{registry_path}）")
    known = registered | shorthand

    # 1+2. HTML / JS 里的类名
    used = {}
    for f in html_files + js_files:
        for attr in re.findall(r'class="([^"]*)"', f.read_text(encoding="utf-8", errors="ignore")):
            for tok in attr.split():
                used.setdefault(tok, set()).add(str(f.relative_to(repo)))

    # CSS 里定义的类名
    defined = {}
    for f in css_files:
        for name in re.findall(r"\.([a-zA-Z][\w-]*)", strip_comments(f.read_text(encoding="utf-8"))):
            if name.startswith("is-") or name in ALLOWED_NON_CONTRACT:
                continue
            defined.setdefault(name, set()).add(f.name)

    for name, files in sorted(used.items()):
        if not (name.startswith("materin-") or name.startswith("is-") or name in ALLOWED_NON_CONTRACT):
            problems.append(f"[契约] {name} 不符合命名契约（出现在 {', '.join(sorted(files))}）")
        elif name.startswith("materin-") and name not in defined:
            problems.append(f"[缺失] {name} 被 HTML/JS 使用但 CSS 里没有定义（{', '.join(sorted(files))}）")

    # 3+4. 注册与反向引用
    for name, files in sorted(defined.items()):
        if not name.startswith("materin-"):
            problems.append(f"[契约] CSS 里的 {name} 不符合命名契约（{', '.join(sorted(files))}）")
        elif name not in known:
            problems.append(f"[未注册] {name} 在 CSS 里有定义但未登记进组件清单")
    for name in sorted(own):
        if name not in defined:
            problems.append(f"[孤立] 清单里属于本仓库的 {name} 在 CSS 中不存在")

    # 5. 组件层裸色值
    for f in css_files:
        exempt = False
        for i, line in enumerate(strip_comments(f.read_text(encoding="utf-8")).splitlines(), 1):
            if TOKEN_BLOCK.match(line):
                exempt = True
            if not exempt and (HEX.search(line) or RGB.search(line)):
                problems.append(f"[令牌] {f.name}:{i} 出现裸色值，应改用 --materin-* 令牌 → {line.strip()[:70]}")
            if "}" in line:
                exempt = False

    # 6. 引用的令牌必须存在
    defined_tokens = set()
    if tokens_path.exists():
        for line in tokens_path.read_text(encoding="utf-8").splitlines():
            m = VAR_DEF.match(strip_comments(line))
            if m:
                defined_tokens.add(m.group(1))
    else:
        problems.append(f"[令牌] 找不到令牌文件（{tokens_path}）")
    bad_vars = {}
    for f in css_files + (html_files if html_files else []):
        text = strip_comments(f.read_text(encoding="utf-8", errors="ignore"))
        for var in set(VAR_USE.findall(text)):
            if var not in defined_tokens:
                bad_vars.setdefault(var, set()).add(f.name)
    for var, files in sorted(bad_vars.items()):
        problems.append(f"[令牌未定义] {var} 被引用但令牌文件里没有（{', '.join(sorted(files))}）")

    if not args.quiet:
        print(f"仓库：{repo.name}")
        print(f"组件 {len(registered)} 个 / 变体 {len(shorthand)} 个 / CSS 选择器 {len(defined)} 个 / HTML+JS 类名 {len(used)} 个")
        print(f"令牌定义 {len(defined_tokens)} 个 · 清单 {registry_path.name if registry_path else '—'} · 令牌文件 {tokens_path.name}")
    if problems:
        print(f"\n发现 {len(problems)} 个问题：")
        for p in problems:
            print("  -", p)
        return 1
    if not args.quiet:
        print("\n全部通过：契约一致、无缺失、无未注册、无裸色值、无未定义令牌 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
