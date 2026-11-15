#!/usr/bin/env python3
"""Write the curated interface list.

Platforming is not only part reuse. What carries across a product generation
is the interface: a frame size, a pin-out, a bolt pattern, a bus voltage, and
everything that hangs off it — brackets, harness, firmware, test fixtures.

The ten interfaces below are curated by hand from data/derived/voltara_parts.json.
Each one names the roles it defines and the real part ids that implement them;
this script resolves the products that carry every role and the year the first
of those products launched, so no figure in the file is typed by hand.

In a deployment these come out of CAD and PLM. For the sample they are curated.

    python3 engine/build_interfaces.py
"""
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PARTS = ROOT / "data" / "derived" / "voltara_parts.json"
PRODUCTS = ROOT / "data" / "voltara" / "voltara_product_master.csv"
OUT = ROOT / "data" / "derived" / "voltara_interfaces.json"

# id, name, subsystem, spec, roles (name -> part ids, any of which satisfies
# the role), what a new product inherits by designing to it.
CURATED = [
    {
        "id": "IF-COOL-120",
        "name": "120 mm forced air module",
        "subsystem": "Cooling",
        "spec": "120 mm fan frame, M4 bolt pattern, 24 VDC",
        "roles": [
            {"role": "Fan", "parts": ["C005"]},
            {"role": "Guard", "parts": ["C043"]},
            {"role": "Fasteners", "parts": ["C034", "C037"]},
        ],
        "inherits": [
            "Wire guard and its bolt pattern",
            "24 V fan harness and tach wiring",
            "Airflow and acoustic test fixture",
        ],
    },
    {
        "id": "IF-COOL-TIM",
        "name": "Conduction path, 200 mm heatsink",
        "subsystem": "Cooling",
        "spec": "200 mm extruded heatsink profile, 40 x 40 mm thermal pad",
        "roles": [
            {"role": "Heatsink", "parts": ["C004"]},
            {"role": "Interface pad", "parts": ["C040"]},
        ],
        "inherits": [
            "Extrusion die already paid for",
            "Pad die-cut and placement drawing",
            "Thermal soak test and its limits",
        ],
    },
    {
        "id": "IF-PWR-HB",
        "name": "Half bridge power block",
        "subsystem": "Power stage",
        "spec": "Half bridge module footprint, isolated 6 channel gate drive, 24 VDC",
        "roles": [
            {"role": "Switch", "parts": ["C013", "C014"]},
            {"role": "Gate drive", "parts": ["C002"]},
        ],
        "inherits": [
            "Gate driver board and its isolation barrier",
            "Busbar drill pattern and creepage layout",
            "Dead time settings and the short circuit test",
        ],
    },
    {
        "id": "IF-PWR-DCLINK",
        "name": "450 V DC link",
        "subsystem": "Power stage",
        "spec": "450 V DC link, 470 uF can, 10k bleeder",
        "roles": [
            {"role": "Link capacitor", "parts": ["C011", "C012"]},
            {"role": "Bleeder", "parts": ["C033"]},
        ],
        "inherits": [
            "Capacitor clamp and terminal pitch",
            "Bleeder network and the discharge time proof",
            "Pre-charge sequence in firmware",
        ],
    },
    {
        "id": "IF-CTRL-DSP",
        "name": "DSP control spine",
        "subsystem": "Control",
        "spec": "DSP control board, 20 pin ribbon, 24 V 60 W auxiliary supply",
        "roles": [
            {"role": "Controller", "parts": ["C001"]},
            {"role": "Backbone", "parts": ["C025"]},
            {"role": "Logic supply", "parts": ["C003"]},
        ],
        "inherits": [
            "Firmware image and bootloader",
            "20 pin pin-out to the power stage",
            "Board test jig and production script",
        ],
    },
    {
        "id": "IF-CTRL-SENSE",
        "name": "Sensing loop",
        "subsystem": "Control",
        "spec": "100 A hall sensor, NTC 10k thermistor, 8 pin signal connector",
        "roles": [
            {"role": "Current sense", "parts": ["C009", "C032"]},
            {"role": "Temperature sense", "parts": ["C010"]},
            {"role": "Signal path", "parts": ["C027"]},
        ],
        "inherits": [
            "Calibration table and scaling constants",
            "8 pin signal harness",
            "Over-current and over-temperature trip logic",
        ],
    },
    {
        "id": "IF-IO-PANEL",
        "name": "Front panel and comms",
        "subsystem": "I/O",
        "spec": "4.3 in display, RS485 Modbus card, 8 pin signal connector",
        "roles": [
            {"role": "Display", "parts": ["C008"]},
            {"role": "Fieldbus", "parts": ["C007", "C028"]},
            {"role": "Signal path", "parts": ["C027"]},
        ],
        "inherits": [
            "Modbus register map",
            "Screen layout and translations",
            "Cut-out and bezel drawing",
        ],
    },
    {
        "id": "IF-IO-FIELD",
        "name": "Field wiring entry",
        "subsystem": "I/O",
        "spec": "M20 cable gland, 6 pole 30 A terminal block, 35 mm2 grounding lug",
        "roles": [
            {"role": "Entry", "parts": ["C041", "C044"]},
            {"role": "Termination", "parts": ["C006"]},
            {"role": "Earth", "parts": ["C042"]},
        ],
        "inherits": [
            "Entry plate cut-out pattern",
            "Torque specification and wiring label",
            "Installer instructions already written",
        ],
    },
    {
        "id": "IF-ENC-OUTDOOR",
        "name": "Outdoor sealed envelope",
        "subsystem": "Enclosure",
        "spec": "IP65 outdoor envelope, 10 mm EPDM strip gasket, M20 gland entries",
        "roles": [
            {"role": "Envelope", "parts": ["U008", "U010", "U012"]},
            {"role": "Seal", "parts": ["C045"]},
            {"role": "Penetrations", "parts": ["C041"]},
        ],
        "inherits": [
            "Gasket groove profile",
            "Gland pattern and drip path",
            "IP65 spray test report",
        ],
    },
    {
        "id": "IF-ESS-MOD",
        "name": "5 kWh module bay",
        "subsystem": "Energy storage",
        "spec": "5 kWh LFP module bay, 150 A DC contactor, 200 A copper busbar",
        "roles": [
            {"role": "Module", "parts": ["U014"]},
            {"role": "Disconnect", "parts": ["C018"]},
            {"role": "Collection", "parts": ["C031"]},
        ],
        "inherits": [
            "Bay pitch and module rails",
            "Contactor pre-charge and interlock",
            "Busbar torque and insulation scheme",
        ],
    },
]


def main() -> int:
    data = json.loads(PARTS.read_text())
    by_id = {p["id"]: p for p in data["parts"]}
    launch = {
        r["product_id"]: int(r["launch_year"])
        for r in csv.DictReader(PRODUCTS.open(newline=""))
    }

    def products_of(part_id: str) -> set:
        part = by_id.get(part_id)
        if part is None:
            raise KeyError(part_id)
        return {p for row in part["rows"] for p in row["products"]}

    out = []
    for iface in CURATED:
        flat = []
        carriers = None
        for role in iface["roles"]:
            covered = set()
            for pid in role["parts"]:
                if pid not in by_id:
                    print(f"{iface['id']}: no part {pid}", file=sys.stderr)
                    return 1
                covered |= products_of(pid)
                if pid not in flat:
                    flat.append(pid)
            # A product is on the interface only when it carries every role.
            carriers = covered if carriers is None else carriers & covered

        products = sorted(carriers or set())
        out.append(
            {
                "id": iface["id"],
                "name": iface["name"],
                "subsystem": iface["subsystem"],
                "spec": iface["spec"],
                "parts": flat,
                "partNames": [by_id[p]["name"] for p in flat],
                "roles": [
                    {
                        "role": r["role"],
                        "parts": r["parts"],
                        "partNames": [by_id[p]["name"] for p in r["parts"]],
                    }
                    for r in iface["roles"]
                ],
                "products": products,
                "since": min((launch[p] for p in products), default=None),
                "inherits": iface["inherits"],
            }
        )

    OUT.write_text(
        json.dumps(
            {
                "company": data["company"],
                "note": (
                    "Curated by hand from data/derived/voltara_parts.json by "
                    "engine/build_interfaces.py. In a deployment these come from "
                    "CAD and PLM. For this sample they are curated, and the "
                    "products and years are resolved from the parts data."
                ),
                "source": "curated",
                "interfaces": out,
            },
            indent=1,
        )
        + "\n"
    )

    print(f"{len(out)} interfaces written to {OUT.relative_to(ROOT)}")
    for i in out:
        print(
            f"  {i['id']:<16} {i['subsystem']:<14} {len(i['parts'])} parts  "
            f"{len(i['products'])} products  since {i['since']}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
