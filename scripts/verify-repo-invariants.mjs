#!/usr/bin/env node
/**
 * Mechanical identity check for sselfie-9g (mothership).
 * Run: node scripts/verify-repo-invariants.mjs
 * This repo does not share lib/maya/ with any other SSELFIE repository.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

let failed = false;

console.log("verify-repo-invariants: sselfie-9g");

const pkg = JSON.parse(read("package.json"));
if (pkg.name !== "my-v0-project") {
  console.warn("WARN: package.json name is not my-v0-project; update AS-BUILT if intentional.");
}

if (!fs.existsSync(path.join(root, "lib", "maya"))) {
  console.error("FAIL: expected lib/maya to exist");
  failed = true;
}

const requiredPaths = [
  "AGENTS.md",
  "AS-BUILT.md",
  "docs/brand/SSELFIE_BRAND_CONSTITUTION.md",
  "docs/brand/SANDRA_VOICE_OS_2026-07-16.md",
  "docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md",
];

for (const requiredPath of requiredPaths) {
  if (!fs.existsSync(path.join(root, requiredPath))) {
    console.error(`FAIL: expected ${requiredPath} to exist`);
    failed = true;
  }
}

const forbiddenRepoSystems = [
  ".agents",
  ".claude",
  ".codex",
  ".serena",
  "skills",
  "tasks",
  "CLAUDE.md",
  "SYNC.md",
];

for (const forbiddenPath of forbiddenRepoSystems) {
  if (fs.existsSync(path.join(root, forbiddenPath))) {
    console.error(`FAIL: repo-hosted AI orchestration is forbidden: ${forbiddenPath}`);
    failed = true;
  }
}

const repositoryInstructions = read("AGENTS.md");
for (const requiredInstruction of [
  "Do not create repo task files",
  "Do not open pull requests",
  "docs/brand/SANDRA_VOICE_OS_2026-07-16.md",
]) {
  if (!repositoryInstructions.includes(requiredInstruction)) {
    console.error(`FAIL: AGENTS.md is missing: ${requiredInstruction}`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
