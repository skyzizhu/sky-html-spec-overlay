#!/usr/bin/env python3
"""
Generate a starter annotation config from common HTML elements.

Examples:
  python3 init_annotation_config.py ./page.html --output ./annotation-config.json
"""

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path


TEXT_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "label", "span"}
CONTROL_TAGS = {"button", "input", "textarea", "select"}
DIVIDER_TAGS = {"hr"}
REGION_HINTS = ("card", "panel", "section", "region", "hero", "footer", "header")


class StarterParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.counts = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        selector = None
        if attrs.get("id"):
          selector = "#" + attrs["id"].strip()
        elif attrs.get("class"):
          classes = [c for c in attrs["class"].split() if c]
          if classes:
            selector = "." + classes[0]
        if not selector:
          return

        kind = None
        metrics = None
        if tag in TEXT_TAGS:
          kind = "text"
          metrics = ["font-size", "line-height", "font-weight", "color"]
        elif tag in CONTROL_TAGS:
          kind = "control"
          metrics = ["size", "font-size", "color", "border-radius"]
        elif tag in DIVIDER_TAGS:
          kind = "divider"
          metrics = ["divider", "color"]
        elif tag == "div" and any(hint in selector.lower() for hint in REGION_HINTS):
          kind = "region"
          metrics = ["size", "padding", "border-radius", "background-color"]

        if not kind:
          return

        key = (selector, kind)
        if key in self.counts:
          return
        self.counts[key] = 1

        label = "%s %s" % (kind.capitalize(), len(self.items) + 1)
        self.items.append({
          "id": "A-%03d" % (len(self.items) + 1),
          "selector": selector,
          "label": label,
          "kind": kind,
          "mode": "actual",
          "metrics": metrics,
        })


def parse_args():
    parser = argparse.ArgumentParser(description="Generate starter annotation config.")
    parser.add_argument("html", help="Input HTML file")
    parser.add_argument("--output", required=True, help="Output config JSON path")
    parser.add_argument("--page-label", default="HTML Spec Overlay", help="Page label")
    return parser.parse_args()


def main():
    args = parse_args()
    html_path = Path(args.html).resolve()
    output_path = Path(args.output).resolve()

    parser = StarterParser()
    parser.feed(html_path.read_text(encoding="utf-8"))

    config = {
      "version": 1,
      "pageLabel": args.page_label,
      "annotations": parser.items
    }
    output_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
      "output": str(output_path),
      "annotations": len(parser.items)
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
