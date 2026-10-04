#!/usr/bin/env node
// PostToolUse (Write|Edit): lint ONLY the file the agent just edited.
// Claude Code reaches the agent only via exit code 2 + stderr; everything else is silent.
// Node (not bash+jq) so it runs the same under Git Bash or PowerShell on Windows.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };

// Extensions the ESLint flat config covers (eslint.config.js: ts/tsx/js/jsx + astro).
const LINT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".astro"]);

// Payloads are untrusted shapes: a missing path means "nothing to check", never an error.
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const file = payload?.tool_input?.file_path;
if (!file || typeof file !== "string") process.exit(0);
if (!LINT_EXT.has(path.extname(file).toLowerCase())) process.exit(0);
if (!existsSync(file)) process.exit(0);

// --quiet: report only errors (warnings like no-console do not block mid-work).
const res = spawnSync(process.execPath, [eslintBin, "--quiet", file], { cwd: root, env, encoding: "utf8" });
if (res.status !== 0) {
  process.stderr.write(`ESLint reported errors in ${file}:\n`);
  process.stderr.write((res.stdout || "") + (res.stderr || ""));
  process.exit(2);
}
process.exit(0);
