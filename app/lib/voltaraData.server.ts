import fs from "fs";
import path from "path";
import { derivedDir } from "./dataPaths";
import { deriveVoltaraData, VoltaraData, VoltaraFile } from "./voltaraData";
import { SurveyFile } from "./survey";
import { MatcherEval } from "./similarity";
import { Grouping, ReviewPair, matcherGrouping, reviewQueue } from "./grouping";
import { InterfaceFile, PlatformInterface } from "./interfaces";

let cached: VoltaraData | null = null;
let cachedSurvey: SurveyFile | null = null;
let cachedEval: MatcherEval | null | undefined = undefined;
let cachedGrouping: Grouping | null = null;
let cachedQueue: ReviewPair[] | null = null;
let cachedInterfaces: PlatformInterface[] | null = null;

/**
 * Server-side loader. Reads data/derived/voltara_parts.json once per process.
 * The answer key is never read here; part groups already come from the engine
 * output, as recorded in that file's own note field.
 */
export function loadVoltaraData(): VoltaraData {
  if (cached) return cached;
  const file = path.join(derivedDir(), "voltara_parts.json");
  cached = deriveVoltaraData(JSON.parse(fs.readFileSync(file, "utf8")) as VoltaraFile);
  return cached;
}

/**
 * How the matcher scored when it was graded against the answer key. Written by
 * engine/evaluate_matcher.ts. The key itself is never read by the app.
 */
export function loadMatcherEval(): MatcherEval | null {
  if (cachedEval !== undefined) return cachedEval;
  const file = path.join(derivedDir(), "matcher_eval.json");
  cachedEval = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf8")) as MatcherEval)
    : null;
  return cachedEval;
}

/**
 * The grouping the matcher reaches on its own, and the pairs it left for a
 * person. Every pair of the 252 descriptions is scored, so this runs once per
 * process on the server and the result is handed to the client as data.
 */
export function loadMatcherGrouping(): Grouping {
  if (cachedGrouping) return cachedGrouping;
  cachedGrouping = matcherGrouping(loadVoltaraData());
  return cachedGrouping;
}

export function loadReviewQueue(): ReviewPair[] {
  if (cachedQueue) return cachedQueue;
  cachedQueue = reviewQueue(loadVoltaraData());
  return cachedQueue;
}

/**
 * The interfaces the company already has. Curated for the sample by
 * engine/build_interfaces.py; in a deployment they come from CAD and PLM.
 */
export function loadInterfaces(): PlatformInterface[] {
  if (cachedInterfaces) return cachedInterfaces;
  const file = path.join(derivedDir(), "voltara_interfaces.json");
  cachedInterfaces = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf8")) as InterfaceFile).interfaces
    : [];
  return cachedInterfaces;
}

/** Sample survey responses for the alignment view and the system prompt. */
export function loadSurvey(): SurveyFile {
  if (cachedSurvey) return cachedSurvey;
  const file = path.join(derivedDir(), "voltara_survey.json");
  cachedSurvey = JSON.parse(fs.readFileSync(file, "utf8")) as SurveyFile;
  return cachedSurvey;
}
