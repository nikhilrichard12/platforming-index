import { loadVoltaraData } from "../lib/voltaraData.server";
import { matchPart, tokenize } from "../lib/matcher";

const data = loadVoltaraData();
const cases: [string, string | null][] = [
  ["Fan, axial, 120 mm, 24 VDC", "Axial Fan 120mm 24VDC"],
  ["cap elec 470uF 450V", "Electrolytic DC Link Capacitor 470uF 450V"],
  ["M4 x 10 screw", "Pan Head Machine Screw M4x10"],
  ["titanium widget", null],
];
let fail = 0;
for (const [input, expected] of cases) {
  const m = matchPart(data, input, 1800);
  const got = m?.name ?? null;
  const ok = got === expected;
  if (!ok) fail++;
  console.log(
    `${ok ? "OK  " : "FAIL"} "${input}" -> ${got ?? "no match"}` +
      (m ? `  conf=${m.confidence} tokens=[${m.matchedTokens.join(",")}]` : "") +
      (ok ? "" : `  expected ${expected ?? "no match"}`)
  );
}
const fan = matchPart(data, "Fan, axial, 120 mm, 24 VDC", 1800)!;
console.log(`\nfan: ${fan.partNumberCount} part numbers, best ${fan.bestRow.pn} $${fan.bestRow.price} at ${fan.bestRow.supplier}, saving $${fan.yearlySavingVsHighest}`);
console.log("tokens:", tokenize("Fan, axial, 120 mm, 24 VDC").join(" | "));
process.exit(fail ? 1 : 0);
