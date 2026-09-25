#!/usr/bin/env python3
"""
Materin 组件一致性检查（命名契约的守门人）—— materin-ui 仓库正本

可校验任意一个 Materin 仓库（站点、Vue 组件库、Obsidian 插件）：

    python3 tools/check-components.py --repo /opt/data/workspace/materin-ui
    python3 tools/check-components.py --repo /opt/data/workspace/materin-tech/materin-tech.github.io

检查项
  1. 契约      ：类名必须符合 materin-<scope>-<component>[__part][--variant]（is-* 与 i18n 类除外）
  2. 存在性    ：用到的每个 materin-* 类名都要在样式里有定义（含 SCSS 嵌套 &--variant 的解析）
  3. 注册      ：样式里定义的每个组件都要登记在组件清单里
  4. 反向      ：清单里属于本仓库的名字都要真的存在
  5. 裸色值    ：组件层不得出现 #hex / rgba()（令牌层与注释除外）
  6. 令牌存在性：引用的 var(--materin-*) 必须在令牌文件里有定义
  7. 令牌归属  ：组件层不得引用非 --materin-* 的变量（吃到别的设计系统的令牌会静默失效）
  8. SCSS 镜像 ：tokens.scss 里每个 $materin-x 必须镜像 --materin-x，且该令牌在 CSS 正本里有定义

用法要点
  --repo / --registry / --tokens / --quiet ；退出码 0 = 全部通过
"""
import argparse
import json
import pathlib
import re
import sys

ALLOWED_NON_CONTRACT = {"lang-zh", "lang-en", "lang-inline"}
SKIP_DIRS = {"node_modules", "dist", "docs-dist", ".git", ".venv", "coverage", ".debug-vault"}
CODE_EXT = {".html", ".js", ".mjs", ".ts", ".vue"}
STYLE_EXT = {".css", ".scss", ".sass"}
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB = re.compile(r"\brgba?\(")
COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"//[^\n]*")
TOKEN_BLOCK = re.compile(r"^\s*(:root|html\[data-theme|\.theme-light)")
VAR_USE = re.compile(r"var\(\s*(--[\w-]+)")
VAR_DEF = re.compile(r"^\s*(--[\w-]+)\s*:")
SCSS_DEF = re.compile(r"^\s*\$([\w-]+)\s*:\s*(.+?);", re.M)
SCSS_USE = re.compile(r"\$([\w-]+)")
NESTED = re.compile(r"^\s*&(__|--)([\w-]+)")
CLASS_DEF = re.compile(r"\.(materin-[\w-]+)")
CLASS_ATTR = re.compile(r'(?<![-\w:])class="([^"]*)"')
CLASS_SHAPE = re.compile(r"^[a-zA-Z][\w-]*$")
CLASS_LITERAL = re.compile(r"['\"`]([^'\"`\n]*materin-[\w-][^'\"`\n]*)['\"`]")
CLASS_TOKEN = re.compile(r"^(materin-[\w-]*|is-[\w-]+)$")


def walk_style_and_code(repo: pathlib.Path, exts: set) -> list:
    out = []
    for p in repo.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in exts:
            continue
        if any(part in SKIP_DIRS for part in p.relative_to(repo).parts):
            continue
        out.append(p)
    return sorted(out)


def is_token_file(p: pathlib.Path) -> bool:
    return p.name == "materin-ui.css" or p.name == "tokens.scss"


def strip(text: str) -> str:
    return LINE_COMMENT.sub("", COMMENT.sub(lambda m: "\n" * m.group(0).count("\n"), text))


def style_body(f: pathlib.Path) -> str:
    """取样式文本：.vue 只取 <style> 块；.scss/.css 取全文。"""
    text = f.read_text(encoding="utf-8", errors="ignore")
    if f.suffix.lower() == ".vue":
        return "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", text, re.S))
    return text


def code_body(f: pathlib.Path) -> str:
    """代码文本：
    - .vue 去掉 <style> 块（样式由 style_body 处理）；
    - .html 去掉 <pre>/<code> 内的示例（文档正文会成段引用宿主变量名与示例标记，
      那是说明，不是真的引用）。"""
    text = f.read_text(encoding="utf-8", errors="ignore")
    if f.suffix.lower() == ".vue":
        return re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.S)
    if f.suffix.lower() == ".html":
        text = re.sub(r"<pre[^>]*>.*?</pre>", "\n", text, flags=re.S)
        text = re.sub(r"<code[^>]*>.*?</code>", " ", text, flags=re.S)
    return text


def classes_in_code(files) -> dict:
    """从 HTML / JS / TS / Vue 取类名：只认「整串都是类名」的字面量，模板占位 ${...} 先剥掉。"""
    used: dict = {}
    for f in files:
        text = code_body(f)
        found = set()
        for attr in CLASS_ATTR.findall(text):
            found.update(t for t in attr.split() if CLASS_SHAPE.match(t))
        for lit in CLASS_LITERAL.findall(text):
            for tok in re.sub(r"\$\{[^}]*\}", "", lit).split():
                clean = tok.rstrip("-")
                if CLASS_TOKEN.match(clean):
                    found.add(clean)
        for name in found:
            used.setdefault(name, set()).add(str(f))
    return used


def classes_in_styles(files) -> dict:
    """样式里定义的组件名；解析 SCSS 嵌套 &__part / &--variant。"""
    defined: dict = {}
    for f in files:
        if is_token_file(f):
            continue
        body = strip(style_body(f))
        stack = []  # [(depth, 最近一层显式 .materin-ui-X)]
        depth = 0
        for raw in body.splitlines():
            line = raw.strip()
            nested = NESTED.match(line)
            if nested and stack and stack[-1][1]:
                defined.setdefault(f"{stack[-1][1]}{nested.group(1)}{nested.group(2)}", set()).add(f.name)
            for name in CLASS_DEF.findall(line):
                defined.setdefault(name, set()).add(f.name)
            if "{" in line:
                parent = stack[-1][1] if stack else None
                m = CLASS_DEF.search(line)
                cur = m.group(1) if m else (parent if line.startswith("&") else None)
                depth += line.count("{")
                stack.append((depth, cur))
            if "}" in line:
                for _ in range(line.count("}")):
                    depth -= 1
                    while stack and stack[-1][0] > depth:
                        stack.pop()
    return defined


def main() -> int:
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--repo", default=".")
    ap.add_argument("--registry", default=None)
    ap.add_argument("--tokens", default=None, help="CSS 令牌正本（默认 <repo>/tokens/materin-ui.css 或 <repo>/assets/css/materin-ui.css）")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    repo = pathlib.Path(args.repo).resolve()
    if not repo.is_dir():
        print(f"仓库目录不存在：{repo}")
        return 2

    registry_path = pathlib.Path(args.registry) if args.registry else None
    if registry_path is None:
        for cand in (repo / "registry" / "components.json", repo / "data" / "components.json"):
            if cand.exists():
                registry_path = cand
                break
    tokens_path = pathlib.Path(args.tokens) if args.tokens else None
    if tokens_path is None:
        for cand in (repo / "tokens" / "materin-ui.css", repo / "assets" / "css" / "materin-ui.css"):
            if cand.exists():
                tokens_path = cand
                break

    code_files = walk_style_and_code(repo, CODE_EXT)
    style_files = walk_style_and_code(repo, STYLE_EXT | {".vue"})
    scss_mirror = [f for f in style_files if f.name == "tokens.scss"]

    problems = []

    registered, shorthand, own = set(), set(), set()
    if registry_path and registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
        for c in registry["components"]:
            registered.add(c["name"])
            registered.update(c.get("parts", []))
            shorthand.update(c["name"] + v for v in c.get("variants", []))
            if c.get("repo") in (None, repo.name):
                own.add(c["name"])
                own.update(c.get("parts", []))
                own.update(c["name"] + v for v in c.get("variants", []))
    else:
        problems.append("找不到组件清单")
    known = registered | shorthand | own

    used = classes_in_code(code_files)
    defined = classes_in_styles(style_files)

    # 1 + 2
    for name, files in sorted(used.items()):
        if not (name.startswith("materin-") or name.startswith("is-") or name in ALLOWED_NON_CONTRACT):
            problems.append(f"[契约] {name} 不符合命名契约（{', '.join(sorted(files))}）")
        elif name.startswith("materin-") and name not in defined:
            problems.append(f"[缺失] {name} 被代码使用但样式里没有定义（{', '.join(sorted(files))}）")

    # 3
    for name, files in sorted(defined.items()):
        if not name.startswith("materin-"):
            problems.append(f"[契约] 样式里的 {name} 不符合命名契约（{', '.join(sorted(files))}）")
        elif name not in known:
            problems.append(f"[未注册] {name} 在样式里有定义但未登记进组件清单")

    # 4
    for name in sorted(own):
        if name not in defined:
            problems.append(f"[孤立] 清单里属于本仓库的 {name} 在样式里不存在")

    # 5
    for f in style_files:
        if is_token_file(f):
            continue
        for i, line in enumerate(strip(style_body(f)).splitlines(), 1):
            if TOKEN_BLOCK.match(line):
                continue
            if HEX.search(line) or RGB.search(line):
                problems.append(f"[裸色值] {f.relative_to(repo)}:{i} → {line.strip()[:70]}")

    # 6 + 7
    defined_tokens = set()
    if tokens_path and tokens_path.exists():
        for line in tokens_path.read_text(encoding="utf-8").splitlines():
            m = VAR_DEF.match(strip(line))
            if m:
                defined_tokens.add(m.group(1))
    else:
        problems.append("找不到 CSS 令牌文件")
    # 本仓库自己定义的局部自定义属性（--x: …）：站点/文档层允许局部别名，不算越界
    local_defs = set()
    for f in style_files + code_files:
        text = strip(style_body(f) if f.suffix.lower() in STYLE_EXT else code_body(f))
        for line in text.splitlines():
            m = VAR_DEF.match(line)
            if m:
                local_defs.add(m.group(1))

    for f in style_files + code_files:
        if is_token_file(f):
            continue
        body = strip(style_body(f) if f.suffix.lower() in STYLE_EXT else code_body(f))
        for var in sorted(set(VAR_USE.findall(body))):
            if var.startswith("--materin-"):
                if var not in defined_tokens:
                    problems.append(f"[令牌未定义] {f.relative_to(repo)} 引用了 {var}，但令牌文件里没有")
                continue
            if var in local_defs:
                continue
            problems.append(
                f"[令牌归属] {f.relative_to(repo)} 引用了非品牌变量 {var}"
                "（组件层只允许 --materin-*，或本仓库自定义的属性）"
            )

    # 8
    scss_vars = {}
    for f in scss_mirror:
        for name, value in SCSS_DEF.findall(strip(f.read_text(encoding="utf-8"))):
            if name.startswith("materin-"):
                scss_vars[name] = value
    for name, value in sorted(scss_vars.items()):
        if f"--{name}" not in defined_tokens:
            problems.append(f"[镜像缺失] ${name} 在 tokens.scss 里有，但 CSS 正本没定义")
        inner = VAR_USE.search(value)
        if inner and inner.group(1) != f"--{name}":
            problems.append(f"[镜像不一致] ${name} 取的是 {inner.group(1)}，应取 --{name}")
    for f in [x for x in style_files if not is_token_file(x)]:
        body = strip(style_body(f))
        for name in sorted(set(SCSS_USE.findall(body))):
            if name.startswith("materin-") and name not in scss_vars and name not in defined_tokens:
                problems.append(f"[SCSS 未定义] {f.relative_to(repo)} 用了 ${name}，但 tokens.scss 里没有")

    if not args.quiet:
        print(f"仓库：{repo.name}")
        print(f"代码文件 {len(code_files)} · 样式文件 {len(style_files)}")
        print(f"组件 {len(registered)} 个 / 变体 {len(shorthand)} 个 / 样式里定义的名字 {len(defined)} 个 / 代码里用到的类名 {len(used)} 个")
        print(f"CSS 令牌 {len(defined_tokens)} 个 · SCSS 镜像 {len(scss_vars)} 个 · 清单 {registry_path.name if registry_path else '—'}")
    if problems:
        print(f"\n发现 {len(problems)} 个问题：")
        for p in problems:
            print("  -", p)
        return 1
    if not args.quiet:
        print("\n全部通过：契约一致、无缺失、无未注册、无裸色值、无越界令牌、镜像完整 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
