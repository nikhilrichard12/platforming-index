/**
 * Copies the sample data the server reads into app/data.
 *
 * A Vercel project whose root directory is app/ only uploads app/, so ../data
 * is not there at build time or at run time. This runs as prebuild, and the
 * copy it writes is committed, so a deploy ships the same files the laptop
 * reads. lib/dataPaths.ts still prefers ../data when it exists, which keeps
 * localhost on the live repo copy.
 *
 * The answer key is never copied. It grades the matcher and the app must not
 * be able to read it. decisions.json is not copied either: that file is
 * written at run time and a deploy starts with an empty store.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(here, "..");
const SOURCE = path.join(APP, "..", "data");
const TARGET = path.join(APP, "data");

/** Everything the running server opens, and nothing else. */
const FILES = [
  "derived/voltara_parts.json",
  "derived/voltara_interfaces.json",
  "derived/voltara_survey.json",
  "derived/matcher_eval.json",
  "derived/sources.json",
  "voltara/voltara_boms.csv",
  "voltara/voltara_spend_cube.csv",
  "voltara/voltara_product_master.csv",
  "voltara/voltara_suppliers.csv",
];

if (!fs.existsSync(SOURCE)) {
  console.log("sync-data: no ../data here, using the committed copy in app/data");
  process.exit(0);
}

let copied = 0;
for (const rel of FILES) {
  const from = path.join(SOURCE, rel);
  const to = path.join(TARGET, rel);
  if (!fs.existsSync(from)) {
    console.warn(`sync-data: missing ${rel}`);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  copied += 1;
}
console.log(`sync-data: ${copied} file${copied === 1 ? "" : "s"} in app/data`);
