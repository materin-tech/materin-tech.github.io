#!/usr/bin/env python3
"""
Materin 组件一致性检查（AI-native 命名契约的守门人）

检查项
  1. 契约  ：HTML / JS 里的类名必须是 materin-* 或 is-*（lang-zh / lang-en / lang-inline 除外）
  2. 存在性：HTML / JS 用到的每个 materin-* 类名都要在 CSS 里定义
  3. 注册  ：CSS 里定义的每个组件都要登记在 data/components.json
  4. 反向  ：registry 里每个名字都要真的存在于 CSS
  5. 令牌  ：组件层 CSS 不得出现裸色值（令牌层 :root / 浅色主题块例外）

用法：python3 tools/check-components.py    （退出码 0 = 全部通过）
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS_DIR = ROOT / "assets" / "css"
ALLOWED_NON_CONTRACT = {"lang-zh", "lang-en", "lang-inline"}
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")
RGB = re.compile(r"\brgba?\(")
COMMENT = re.compile(r"/\*.*?\*/", re.S)
TOKEN_BLOCK = re.compile(r"^\s*(:root|html\[data-theme|\.theme-light)")


def html_like_files():
    return (
        sorted(ROOT.glob("*.html"))
        + sorted(ROOT.glob("*/*.html"))
        + sorted(ROOT.glob("*/*/*.html"))
        + sorted(ROOT.glob("assets/js/*.js"))
    )


def strip_comments(text: str) -> str:
    return COMMENT.sub(lambda m: "\n" * m.group(0).count("\n"), text)


def classes_in_html_js():
    used = {}
    for f in html_like_files():
        for attr in re.findall(r'class="([^"]*)"', f.read_text(encoding="utf-8")):
            for tok in attr.split():
                used.setdefault(tok, set()).add(str(f.relative_to(ROOT)))
    return used


def classes_in_css():
    defined = {}
    for f in sorted(CSS_DIR.glob("*.css")):
        if f.name == "materin-ui.css":
            continue
        for name in re.findall(r"\.([a-zA-Z][\w-]*)", strip_comments(f.read_text(encoding="utf-8"))):
            if name.startswith("is-") or name in ALLOWED_NON_CONTRACT:
                continue
            defined.setdefault(name, set()).add(f.name)
    return defined


def raw_colors_outside_tokens():
    out = []
    for f in sorted(CSS_DIR.glob("*.css")):
        if f.name == "materin-ui.css":
            continue
        exempt = False
        for i, line in enumerate(strip_comments(f.read_text(encoding="utf-8")).splitlines(), 1):
            if TOKEN_BLOCK.match(line):
                exempt = True
            if not exempt and (HEX.search(line) or RGB.search(line)):
                out.append(f"{f.name}:{i} 出现裸色值，应改用 --materin-* 令牌 → {line.strip()[:70]}")
            if "}" in line:
                exempt = False
    return out


def main() -> int:
    problems = []
    registry = json.loads((ROOT / "data" / "components.json").read_text(encoding="utf-8"))
    registered, shorthand = set(), set()
    for c in registry["components"]:
        registered.add(c["name"])
        for part in c.get("parts", []):
            registered.add(part)
        for var in c.get("variants", []):
            shorthand.add(c["name"] + var)

    used = classes_in_html_js()
    defined = classes_in_css()
    known = registered | shorthand

    for name, files in sorted(used.items()):
        if not (name.startswith("materin-") or name.startswith("is-") or name in ALLOWED_NON_CONTRACT):
            problems.append(f"[契约] {name} 不符合命名契约（出现在 {', '.join(sorted(files))}）")
        elif name.startswith("materin-") and name not in defined:
            problems.append(f"[缺失] {name} 被 HTML/JS 使用但 CSS 里没有定义（{', '.join(sorted(files))}）")

    for name, files in sorted(defined.items()):
        if not name.startswith("materin-"):
            problems.append(f"[契约] CSS 里的 {name} 不符合命名契约（{', '.join(sorted(files))}）")
        elif name not in known:
            problems.append(f"[未注册] {name} 在 CSS 里有定义但未登记进 data/components.json")

    for name in sorted(known):
        if name not in defined:
            problems.append(f"[孤立] registry 里的 {name} 在 CSS 中不存在")

    problems += raw_colors_outside_tokens()

    print(f"组件 {len(registered)} 个 / 变体 {len(shorthand)} 个 / CSS 选择器 {len(defined)} 个 / HTML+JS 类名 {len(used)} 个")
    if problems:
        print(f"\n发现 {len(problems)} 个问题：")
        for p in problems:
            print("  -", p)
        return 1
    print("\n全部通过：契约一致、无缺失、无未注册、组件层无裸色值 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
