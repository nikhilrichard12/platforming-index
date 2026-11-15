import fs from "fs";
import path from "path";
import { deriveVoltaraData, VoltaraData, VoltaraFile } from "./voltaraData";
import { SurveyFile } from "./survey";
import { MatcherEval } from "./similarity";

const DERIVED = path.join(process.cwd(), "..", "data", "derived");

let cached: VoltaraData | null = null;
let cachedSurvey: SurveyFile | null = null;
let cachedEval: MatcherEval | null | undefined = undefined;

/**
 * Server-side loader. Reads data/derived/voltara_parts.json once per process.
 * The answer key is never read here; part groups already come from the engine
 * output, as recorded in that file's own note field.
 */
export function loadVoltaraData(): VoltaraData {
  if (cached) return cached;
  const file = path.join(DERIVED, "voltara_parts.json");
  cached = deriveVoltaraData(JSON.parse(fs.readFileSync(file, "utf8")) as VoltaraFile);
  return cached;
}

/**
 * How the matcher scored when it was graded against the answer key. Written by
 * engine/evaluate_matcher.ts. The key itself is never read by the app.
 */
export function loadMatcherEval(): MatcherEval | null {
  if (cachedEval !== undefined) return cachedEval;
  const file = path.join(DERIVED, "matcher_eval.json");
  cachedEval = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf8")) as MatcherEval)
    : null;
  return cachedEval;
}

/** Sample survey responses for the alignment view and the system prompt. */
export function loadSurvey(): SurveyFile {
  if (cachedSurvey) return cachedSurvey;
  const file = path.join(DERIVED, "voltara_survey.json");
  cachedSurvey = JSON.parse(fs.readFileSync(file, "utf8")) as SurveyFile;
  return cachedSurvey;
}
