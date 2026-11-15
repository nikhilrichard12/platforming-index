/**
 * Blind evaluation of the matcher.
 *
 * It runs lib/similarity.ts over every description in the parts list, then
 * grades the result against the hand labelled answer key. The key is read
 * here and nowhere else: the matcher never sees it, and nothing in this file
 * feeds back into the scoring.
 *
 *   npx tsc engine/evaluate_matcher.ts --outDir /tmp/eval --module es2022 \
 *     --target es2022 --moduleResolution bundler && node /tmp/eval/...
 */
import fs from "fs";
import path from "path";
import { groupParts, similarity } from "../app/lib/similarity";

const ROOT = path.join(process.cwd());
const VOLTARA = path.join(ROOT, "data", "voltara");
const OUT = path.join(ROOT, "data", "derived", "matcher_eval.json");

/** A CSV row, respecting quoted fields: "MACHINE SCREW, PAN HEAD, M4X10". */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += c;
  }
  cells.push(cell);
  return cells;
}

function readCsv(file: string): Record<string, string>[] {
  const lines = fs
    .readFileSync(path.join(VOLTARA, file), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  const head = splitRow(lines[0]);
  return lines
    .slice(1)
    .map((line) => Object.fromEntries(head.map((h, i) => [h, splitRow(line)[i] ?? ""])));
}

/* One description per part number, as the parts list carries it. */
const boms = readCsv("voltara_boms.csv");
const rows = new Map<string, string>();
for (const b of boms) if (!rows.has(b.part_number)) rows.set(b.part_number, b.description);
const list = [...rows.entries()].map(([pn, description]) => ({ pn, description }));

/* The truth, used only to grade. */
const key = readCsv("voltara_answer_key.csv");
const truth = new Map(key.map((k) => [k.part_number, k.canonical_part_id]));
const trueName = new Map(key.map((k) => [k.part_number, k.canonical_name]));

const result = groupParts(list);

/* Pairwise scoring over every pair of part numbers. */
const pns = list.map((r) => r.pn);
const groupOf = new Map<string, number>();
result.groups.forEach((g, i) => g.members.forEach((m) => groupOf.set(m, i)));

let tp = 0;
let fp = 0;
let fn = 0;
const wrongMerges: { a: string; b: string; score: number; da: string; db: string }[] = [];
const missedMerges: { a: string; b: string; score: number; da: string; db: string }[] = [];

for (let i = 0; i < pns.length; i++) {
  for (let j = i + 1; j < pns.length; j++) {
    const a = pns[i];
    const b = pns[j];
    const sameTruth = truth.get(a) === truth.get(b);
    const sameOurs = groupOf.get(a) === groupOf.get(b);
    if (sameOurs && sameTruth) tp += 1;
    else if (sameOurs && !sameTruth) {
      fp += 1;
      const s = similarity(rows.get(a) ?? "", rows.get(b) ?? "");
      wrongMerges.push({ a, b, score: s.score, da: rows.get(a) ?? "", db: rows.get(b) ?? "" });
    } else if (!sameOurs && sameTruth) {
      fn += 1;
      const s = similarity(rows.get(a) ?? "", rows.get(b) ?? "");
      missedMerges.push({ a, b, score: s.score, da: rows.get(a) ?? "", db: rows.get(b) ?? "" });
    }
  }
}

const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
const trueGroups = new Set([...truth.values()]).size;

/* The five that would embarrass us most: wrong merges first, then the near
   misses we failed to merge, worst score first. */
const worst = [
  ...wrongMerges.map((m) => ({ ...m, kind: "wrong merge" as const })),
  ...missedMerges
    .sort((x, y) => y.score - x.score)
    .map((m) => ({ ...m, kind: "missed merge" as const })),
].slice(0, 5);

const review = result.review.length;
const evaluation = {
  ranAt: new Date().toISOString(),
  partNumbers: list.length,
  trueParts: trueGroups,
  groupsFound: result.groups.length,
  pairwisePrecision: Math.round(precision * 1000) / 1000,
  pairwiseRecall: Math.round(recall * 1000) / 1000,
  truePairs: tp + fn,
  mergedPairs: tp + fp,
  correctMerges: tp,
  wrongMerges: fp,
  missedMerges: fn,
  sentToReview: review,
  unusableDescriptions: result.unusable.length,
  worst: worst.map((w) => ({
    kind: w.kind,
    score: w.score,
    a: `${w.a} ${w.da}`,
    b: `${w.b} ${w.db}`,
    truthA: trueName.get(w.a) ?? "",
    truthB: trueName.get(w.b) ?? "",
  })),
  note: "Graded blind against voltara_answer_key.csv. The matcher never reads the key.",
};

fs.writeFileSync(OUT, JSON.stringify(evaluation, null, 2) + "\n");

console.log(`part numbers        ${evaluation.partNumbers}`);
console.log(`true parts          ${evaluation.trueParts}`);
console.log(`groups found        ${evaluation.groupsFound}`);
console.log(`pairwise precision  ${evaluation.pairwisePrecision}`);
console.log(`pairwise recall     ${evaluation.pairwiseRecall}`);
console.log(`merged pairs        ${evaluation.mergedPairs} (${tp} right, ${fp} wrong)`);
console.log(`missed merges       ${evaluation.missedMerges} of ${evaluation.truePairs} true pairs`);
console.log(`sent to review      ${evaluation.sentToReview}`);
console.log(`unusable rows       ${evaluation.unusableDescriptions}`);
console.log("");
evaluation.worst.forEach((w) =>
  console.log(`  ${w.kind} ${w.score}  ${w.a}  ||  ${w.b}`)
);
