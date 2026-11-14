#!/usr/bin/env python3
"""Join country of origin onto the parts data.

A compliance rule is about where a part comes from, so the check has to read
origin from data rather than guess it from a supplier name. This reads
data/voltara/voltara_suppliers.csv and writes `origin` onto every purchase row
in data/derived/voltara_parts.json, plus a `suppliers` list for the UI.

Re-runnable: it overwrites origin, it never duplicates rows.

    python3 engine/add_origin.py
"""
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPPLIERS = ROOT / "data" / "voltara" / "voltara_suppliers.csv"
PARTS = ROOT / "data" / "derived" / "voltara_parts.json"


def main() -> int:
    with SUPPLIERS.open(newline="") as f:
        origin = {r["supplier"]: r["country_of_origin"] for r in csv.DictReader(f)}

    data = json.loads(PARTS.read_text())

    missing = set()
    rows = 0
    for part in data["parts"]:
        for row in part["rows"]:
            country = origin.get(row["supplier"])
            if country is None:
                missing.add(row["supplier"])
                continue
            row["origin"] = country
            rows += 1

    if missing:
        print("No origin for: " + ", ".join(sorted(missing)), file=sys.stderr)
        return 1

    data["suppliers"] = [
        {"name": name, "origin": country} for name, country in sorted(origin.items())
    ]

    PARTS.write_text(json.dumps(data, indent=1) + "\n")
    print(f"origin written to {rows} rows across {len(data['parts'])} parts")
    print(
        "origins: "
        + ", ".join(
            f"{c} {sum(1 for v in origin.values() if v == c)}"
            for c in sorted(set(origin.values()))
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
