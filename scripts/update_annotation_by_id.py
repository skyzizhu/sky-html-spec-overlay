#!/usr/bin/env python3
"""
List, inspect, update, or delete annotation items by id.

Examples:
  python3 update_annotation_by_id.py list ./annotation-config.json
  python3 update_annotation_by_id.py show ./annotation-config.json --id A-015
  python3 update_annotation_by_id.py update ./annotation-config.json --id A-015 --label "主按钮圆角" --metrics border-radius
  python3 update_annotation_by_id.py delete ./annotation-config.json --id A-012
"""

import argparse
import json
from pathlib import Path


def load_config(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_config(path, config):
    Path(path).write_text(
        json.dumps(config, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def ensure_ids(config):
    annotations = config.setdefault("annotations", [])
    used = set()
    counter = 1
    for item in annotations:
        item_id = item.get("id")
        if item_id and item_id not in used:
            used.add(item_id)
            match = str(item_id).rsplit("-", 1)
            if len(match) == 2 and match[1].isdigit():
                counter = max(counter, int(match[1]) + 1)
            continue

        generated = "A-%03d" % counter
        while generated in used:
            counter += 1
            generated = "A-%03d" % counter
        item["id"] = generated
        used.add(generated)
        counter += 1


def find_annotation(config, annotation_id):
    for index, item in enumerate(config.get("annotations", [])):
        if item.get("id") == annotation_id:
            return index, item
    raise SystemExit("Annotation id not found: %s" % annotation_id)


def parse_metrics(value):
    if value is None:
        return None
    return [part.strip() for part in value.split(",") if part.strip()]


def parse_compare(value):
    parts = [part.strip() for part in value.split("|")]
    if len(parts) < 2:
        raise SystemExit("compareTo must use selector|axis|label format")
    selector = parts[0]
    axis = parts[1]
    label = parts[2] if len(parts) > 2 and parts[2] else "间距"
    if axis not in {"vertical", "horizontal"}:
        raise SystemExit("compareTo axis must be vertical or horizontal")
    return {
        "selector": selector,
        "axis": axis,
        "label": label,
    }


def save_if_needed(output_path, config):
    write_config(output_path, config)
    print(json.dumps({
        "output": str(Path(output_path).resolve()),
        "annotations": len(config.get("annotations", [])),
    }, ensure_ascii=False, indent=2))


def command_list(args):
    config = load_config(args.config)
    ensure_ids(config)
    rows = []
    for item in config.get("annotations", []):
        rows.append({
            "id": item.get("id"),
            "label": item.get("label"),
            "selector": item.get("selector"),
            "metrics": item.get("metrics", []),
        })
    print(json.dumps(rows, ensure_ascii=False, indent=2))


def command_show(args):
    config = load_config(args.config)
    ensure_ids(config)
    _, item = find_annotation(config, args.id)
    print(json.dumps(item, ensure_ascii=False, indent=2))


def command_update(args):
    config = load_config(args.config)
    ensure_ids(config)
    index, item = find_annotation(config, args.id)

    if args.new_id:
        item["id"] = args.new_id
    if args.label is not None:
        item["label"] = args.label
    if args.selector is not None:
        item["selector"] = args.selector
    if args.kind is not None:
        item["kind"] = args.kind
    if args.mode is not None:
        item["mode"] = args.mode

    metrics = parse_metrics(args.metrics)
    if metrics is not None:
        item["metrics"] = metrics

    if args.overrides_json is not None:
        item["overrides"] = json.loads(args.overrides_json)
    if args.clear_overrides:
        item.pop("overrides", None)

    if args.clear_compare:
        item.pop("compareTo", None)
    if args.compare_to:
        item["compareTo"] = [parse_compare(value) for value in args.compare_to]

    config["annotations"][index] = item
    save_if_needed(args.output or args.config, config)


def command_delete(args):
    config = load_config(args.config)
    ensure_ids(config)
    index, item = find_annotation(config, args.id)
    del config["annotations"][index]
    save_if_needed(args.output or args.config, config)
    print(json.dumps({
        "deleted": item.get("id"),
    }, ensure_ascii=False, indent=2))


def build_parser():
    parser = argparse.ArgumentParser(description="Edit annotation config items by id.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    parser_list = subparsers.add_parser("list", help="List annotation ids")
    parser_list.add_argument("config", help="Annotation config JSON path")
    parser_list.set_defaults(func=command_list)

    parser_show = subparsers.add_parser("show", help="Show one annotation item")
    parser_show.add_argument("config", help="Annotation config JSON path")
    parser_show.add_argument("--id", required=True, help="Annotation id, for example A-015")
    parser_show.set_defaults(func=command_show)

    parser_update = subparsers.add_parser("update", help="Update one annotation item")
    parser_update.add_argument("config", help="Annotation config JSON path")
    parser_update.add_argument("--id", required=True, help="Annotation id, for example A-015")
    parser_update.add_argument("--output", help="Optional output JSON path")
    parser_update.add_argument("--new-id", help="Replace the current annotation id")
    parser_update.add_argument("--label", help="New label text")
    parser_update.add_argument("--selector", help="New selector")
    parser_update.add_argument("--kind", choices=["control", "text", "region", "divider", "spacing"], help="New kind")
    parser_update.add_argument("--mode", choices=["actual", "override"], help="New mode")
    parser_update.add_argument("--metrics", help="Comma-separated metrics, for example background-color,border-radius")
    parser_update.add_argument("--overrides-json", help="Overrides JSON string")
    parser_update.add_argument("--clear-overrides", action="store_true", help="Remove overrides")
    parser_update.add_argument("--compare-to", action="append", help="Repeatable selector|axis|label value")
    parser_update.add_argument("--clear-compare", action="store_true", help="Remove compareTo")
    parser_update.set_defaults(func=command_update)

    parser_delete = subparsers.add_parser("delete", help="Delete one annotation item")
    parser_delete.add_argument("config", help="Annotation config JSON path")
    parser_delete.add_argument("--id", required=True, help="Annotation id, for example A-015")
    parser_delete.add_argument("--output", help="Optional output JSON path")
    parser_delete.set_defaults(func=command_delete)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
