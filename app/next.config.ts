import path from "path";
import type { NextConfig } from "next";

/**
 * The server reads JSON and CSV with fs at run time, so Next cannot see those
 * reads and will not trace the files on its own. Both are listed here.
 *
 * app/data is the copy scripts/sync-data.mjs writes before every build; it is
 * inside the project directory so it ships whether or not the deploy uploads
 * anything above app/. ../data is listed too, for a build run from the repo
 * root where that is the copy lib/dataPaths.ts picks.
 */
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

// Named one by one rather than globbed, so voltara_answer_key.csv cannot ride
// along. The key grades the matcher; the app is never allowed to read it.
const DATA = FILES.flatMap((f) => [`./data/${f}`, `../data/${f}`]);

// Tracing resolves the data directory as a whole, so the answer key has to be
// taken back out by name, in both the places a copy of the data can sit.
const KEY = [
  "../data/voltara/voltara_answer_key.csv",
  "data/voltara/voltara_answer_key.csv",
];

const nextConfig: NextConfig = {
  // The repo, not app/, so a traced path one level up stays inside the root.
  outputFileTracingRoot: process.env.VERCEL ? __dirname : path.join(__dirname, ".."),
  outputFileTracingIncludes: {
    "/**/*": DATA,
    "/api/**/*": DATA,
  },
  outputFileTracingExcludes: {
    "/**/*": KEY,
    "/api/**/*": KEY,
  },
};

export default nextConfig;
