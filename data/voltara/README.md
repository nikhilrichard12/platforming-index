# Voltara Power Systems sample data

Voltara is a fictional manufacturer. Every number here is generated sample data for a demo.

Six products in four families: two rack UPS units, one modular UPS, two solar inverters, one battery cabinet.

## Files

| File | Rows | What it holds |
|---|---|---|
| voltara_boms.csv | 262 | Parts list for each product. Each product team uses its own part numbers and its own naming style. |
| voltara_spend_cube.csv | 1,109 | Purchase orders from Nov 2025 to Oct 2026: part number, supplier, product line, quantity, unit price. Includes spare and warranty buys. |
| voltara_product_master.csv | 6 | Volume, list price, material cost, margin, lead time, sustaining engineering hours per product. |
| voltara_answer_key.csv | 252 | Maps every part number to the real part behind it. Use it to score matching accuracy. Do not feed it to the matcher. |

## What is planted

- 60 real parts hide behind 252 part numbers.
- 45 real parts appear in two or more products. 23 appear in five or six products (core candidates).
- Each product names parts differently: "Axial Fan 120mm 24VDC", "FAN, AXIAL, 120MM, 24VDC", "AXIAL_FAN_120MM_24VDC", "fan axial 120mm 24vdc", "120mm 24VDC Fan (Axial)", "FAN - SEE DWG".
- Hardware (screws, nuts, washers, standoffs, cable ties, thermal pads) carries two part numbers inside the same product, one per assembly.
- Existing real reuse: the two rack UPS units share 5 part numbers, and the two solar inverters share 5.
- Low-volume products pay more for the same part: up to about 30% more on the battery cabinet and 22% on the modular UPS.
- The DC link capacitor (470uF 450V) comes from three suppliers at three prices: about $3.95, $4.60, $5.35.
- If every production buy of a shared part paid the lowest price Voltara already pays, spend drops by about $1.13M a year (2.9% of $39.3M).
