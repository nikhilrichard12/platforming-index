#!/usr/bin/env python3
"""Join the year's purchased quantity onto every row of the parts data.

The dashboard can regroup the 252 part numbers two ways: the matcher's own
groups and the groups an engineer confirmed. A price gap only means something
within a group, so recomputing it under a different grouping needs the volume
behind each part number, not just its price.

This reads data/voltara/voltara_spend_cube.csv and writes `qty` and `spend`
onto every purchase row in data/derived/voltara_parts.json.

Re-runnable: it overwrites both fields, it never duplicates rows.

    python3 engine/add_quantity.py
"""
import collections
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEND = ROOT / "data" / "voltara" / "voltara_spend_cube.csv"
PARTS = ROOT / "data" / "derived" / "voltara_parts.json"


def main() -> int:
    qty: collections.Counter = collections.Counter()
    spend: collections.Counter = collections.Counter()
    with SPEND.open(newline="") as f:
        for r in csv.DictReader(f):
            qty[r["part_number"]] += int(r["quantity"])
            spend[r["part_number"]] += float(r["extended_usd"])

    data = json.loads(PARTS.read_text())

    missing = set()
    rows = 0
    for part in data["parts"]:
        for row in part["rows"]:
            if row["pn"] not in qty:
                missing.add(row["pn"])
                continue
            row["qty"] = qty[row["pn"]]
            row["spend"] = round(spend[row["pn"]])
            rows += 1

    if missing:
        print("No purchase lines for: " + ", ".join(sorted(missing)), file=sys.stderr)
        return 1

    PARTS.write_text(json.dumps(data, indent=1) + "\n")
    print(f"qty and spend written to {rows} rows across {len(data['parts'])} parts")
    print(f"total purchased quantity {sum(qty.values()):,}")
    print(f"total spend ${round(sum(spend.values())):,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
