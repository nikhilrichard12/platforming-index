import fs from "fs";
import path from "path";

/**
 * Where the sample data lives when the server is running.
 *
 * On this machine the app runs from app/ inside the repo, so the data is one
 * level up at ../data. A deploy whose project root is app/ has no level up:
 * scripts/sync-data.mjs copies the files to app/data before the build and
 * next.config.ts traces that copy into the deployed functions.
 *
 * The repo copy is tried first, so nothing about localhost changes.
 */
const CANDIDATES = [
  // dirname() rather than a literal "..", so build tracing does not resolve
  // this to the whole repo data directory and pull in the answer key.
  path.join(path.dirname(process.cwd()), "data"),
  path.join(process.cwd(), "data"),
];

/** A directory only counts if the file every page needs is actually in it. */
const MARKER = path.join("derived", "voltara_parts.json");

let root: string | null = null;

export function dataRoot(): string {
  if (root) return root;
  root =
    CANDIDATES.find((dir) => fs.existsSync(path.join(dir, MARKER))) ??
    CANDIDATES[0];
  return root;
}

export function derivedDir(): string {
  return path.join(dataRoot(), "derived");
}

export function voltaraDir(): string {
  return path.join(dataRoot(), "voltara");
}
