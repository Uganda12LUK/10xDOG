#!/usr/bin/env node
// Stop: sweep everything THIS TURN changed before the agent finishes, then one retry.
// Net for edits a per-edit hook never saw (files rewritten through a shell command).
// Lints every changed/new covered file, then a whole-project typecheck (astro check,
// which self-syncs the generated astro:* types tsc would choke on).
// Reaches the agent only via exit code 2 + stderr.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
const astroBin = path.join(root, "node_modules", "astro", "bin", "astro.mjs");
const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };
const LINT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".astro"]);

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  payload = {};
}

// Already sent back once by this hook: let the agent finish (commit gate catches the rest).
// stop_hook_active = Claude Code; loop_count = Cursor, which imports this hook.
if (payload?.stop_hook_active === true || (payload?.loop_count ?? 0) !== 0) process.exit(0);

function git(args) {
  const r = spawnSync("git", args, { cwd: root, env, encoding: "utf8" });
  return r.status === 0 ? r.stdout || "" : "";
}

// Changed (vs HEAD) + untracked. Nothing changed (a pure Q&A turn) → nothing to check.
const changed = new Set();
for (const l of git(["diff", "--name-only", "HEAD"]).split(/\r?\n/)) if (l.trim()) changed.add(l.trim());
for (const l of git(["ls-files", "-o", "--exclude-standard"]).split(/\r?\n/)) if (l.trim()) changed.add(l.trim());
if (changed.size === 0) process.exit(0);

const files = [...changed].filter(
  (f) => LINT_EXT.has(path.extname(f).toLowerCase()) && existsSync(path.join(root, f)),
);

let report = "";

if (files.length > 0) {
  const r = spawnSync(process.execPath, [eslintBin, "--quiet", ...files], { cwd: root, env, encoding: "utf8" });
  if (r.status !== 0) report += `\nESLint errors in changed files:\n${(r.stdout || "") + (r.stderr || "")}\n`;
}

// Whole-project typecheck. astro check exits non-zero only on errors (hints/warnings pass).
const tc = spawnSync(process.execPath, [astroBin, "check"], { cwd: root, env, encoding: "utf8" });
if (tc.status !== 0) report += `\nTypecheck (astro check) fails:\n${(tc.stdout || "") + (tc.stderr || "")}\n`;

if (report) {
  process.stderr.write(`Fix these before you finish:${report}`);
  process.exit(2);
}
process.exit(0);
