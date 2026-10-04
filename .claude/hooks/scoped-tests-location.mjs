#!/usr/bin/env node
// PostToolUse (Write|Edit): when a file in the location/map module (risk #6) is
// edited, run ONLY the fast unit tests related to it. Uses a unit-only vitest
// config (no dev server / Supabase), so it stays a seconds-scale per-edit gate.
// Integration + e2e for #6 stay in CI / `npm test`, never here.
// Reaches the agent only via exit code 2 + stderr; everything else is silent.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const vitestBin = path.join(root, "node_modules", "vitest", "vitest.mjs");
const unitConfig = path.join(root, ".claude", "hooks", "vitest.unit.config.mjs");
const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" };

// The risk-#6 module: the data seam + everything that renders the pins.
// A prefix match on the repo-relative, forward-slashed path.
const MODULE_PREFIXES = ["src/lib/services/profile.ts", "src/components/map/", "src/pages/owners/"];

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const file = payload?.tool_input?.file_path;
if (!file || typeof file !== "string") process.exit(0);
if (!existsSync(file)) process.exit(0);

const rel = path.relative(root, file).split(path.sep).join("/");
if (!MODULE_PREFIXES.some((p) => rel === p || rel.startsWith(p))) process.exit(0);

// `related` only runs test files that import the edited file; with the
// unit-only config that is the fast #6 unit test (or nothing → passWithNoTests).
const res = spawnSync(process.execPath, [vitestBin, "related", file, "--run", "--config", unitConfig], {
  cwd: root,
  env,
  encoding: "utf8",
});

if (res.status !== 0) {
  process.stderr.write(`Related unit tests fail for ${rel} (risk #6 — location/PII):\n`);
  process.stderr.write((res.stdout || "") + (res.stderr || ""));
  process.exit(2);
}
process.exit(0);
