#!/usr/bin/env python3
"""
Build an annotated HTML output directory by copying a source HTML file or directory
and injecting annotation overlay assets.

Examples:
  python3 build_annotated_html.py ./mockup ./mockup-annotated --config ./annotation-config.json
  python3 build_annotated_html.py ./site ./site-annotated --html index.html --html pages/login.html
"""

import argparse
import json
import os
import shutil
from pathlib import Path


MARKER = "<!-- sky-html-spec-overlay -->"


def parse_args():
    parser = argparse.ArgumentParser(description="Build annotated HTML output.")
    parser.add_argument("source", help="Source HTML file or directory")
    parser.add_argument("output", help="Output directory")
    parser.add_argument("--config", help="Path to annotation config JSON")
    parser.add_argument(
        "--html",
        action="append",
        default=[],
        help="Relative HTML file path inside the output directory; repeatable",
    )
    return parser.parse_args()


def skill_root():
    return Path(__file__).resolve().parents[1]


def load_config(config_path):
    if not config_path:
        return {"version": 1, "pageLabel": "HTML Spec Overlay", "annotations": []}
    with Path(config_path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def copy_source(source: Path, output: Path):
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)

    if source.is_file():
        shutil.copy2(source, output / source.name)
        return [output / source.name]

    if source.is_dir():
        shutil.copytree(source, output, dirs_exist_ok=True)
        return sorted(output.rglob("*.html"))

    raise FileNotFoundError("Source does not exist: %s" % source)


def resolve_targets(source: Path, output: Path, requested):
    if source.is_file():
        return [output / source.name]

    if requested:
        targets = []
        for relative in requested:
            target = output / relative
            if not target.exists():
                raise FileNotFoundError("Requested HTML target not found: %s" % target)
            targets.append(target)
        return targets

    return sorted(output.rglob("*.html"))


def write_overlay_assets(output: Path, config: dict):
    overlay_dir = output / "__html_spec_overlay__"
    overlay_dir.mkdir(parents=True, exist_ok=True)

    assets_dir = skill_root() / "assets"
    for asset_name in ("annotation.css", "annotation.js"):
        shutil.copy2(assets_dir / asset_name, overlay_dir / asset_name)

    data_js = "window.__HTML_SPEC_OVERLAY__ = %s;\n" % json.dumps(
        config, ensure_ascii=False, indent=2
    )
    (overlay_dir / "annotation-data.js").write_text(data_js, encoding="utf-8")

    manifest = {
        "tool": "sky-html-spec-overlay",
        "version": 1,
        "overlay_dir": "__html_spec_overlay__",
        "annotations": len(config.get("annotations", [])),
    }
    (overlay_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def inject_assets(html_path: Path, output_root: Path):
    content = html_path.read_text(encoding="utf-8")
    if MARKER in content:
        return False

    relative_overlay = Path(
        os.path.relpath(output_root / "__html_spec_overlay__", html_path.parent)
    ).as_posix()
    head_injection = (
        f"{MARKER}\n"
        f'<link rel="stylesheet" href="{relative_overlay}/annotation.css">\n'
    )
    body_injection = (
        f'<script src="{relative_overlay}/annotation-data.js"></script>\n'
        f'<script src="{relative_overlay}/annotation.js"></script>\n'
    )

    if "</head>" in content:
        content = content.replace("</head>", head_injection + "</head>", 1)
    else:
        content = head_injection + content

    if "</body>" in content:
        content = content.replace("</body>", body_injection + "</body>", 1)
    else:
        content += "\n" + body_injection

    html_path.write_text(content, encoding="utf-8")
    return True


def main():
    args = parse_args()
    source = Path(args.source).resolve()
    output = Path(args.output).resolve()
    config = load_config(args.config)

    copy_source(source, output)
    targets = resolve_targets(source, output, args.html)
    write_overlay_assets(output, config)

    changed = []
    for target in targets:
        if inject_assets(target, output):
            changed.append(str(target))

    print(json.dumps({
        "output": str(output),
        "targets": changed,
        "annotations": len(config.get("annotations", [])),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
