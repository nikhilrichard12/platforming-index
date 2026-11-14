import fs from "fs";
import path from "path";
import { deriveVoltaraData, VoltaraData, VoltaraFile } from "./voltaraData";

let cached: VoltaraData | null = null;

/**
 * Server-side loader. Reads data/derived/voltara_parts.json once per process.
 * The answer key is never read here; part groups already come from the engine
 * output, as recorded in that file's own note field.
 */
export function loadVoltaraData(): VoltaraData {
  if (cached) return cached;
  const file = path.join(process.cwd(), "..", "data", "derived", "voltara_parts.json");
  cached = deriveVoltaraData(JSON.parse(fs.readFileSync(file, "utf8")) as VoltaraFile);
  return cached;
}
