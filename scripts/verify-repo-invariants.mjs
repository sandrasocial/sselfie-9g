#!/usr/bin/env node
/**
 * Mechanical identity check for sselfie-9g (mothership).
 * Run: node scripts/verify-repo-invariants.mjs
 * This repo does not share lib/maya/ with agents or v2.
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

const voiceOsPath = "docs/brand/SANDRA_VOICE_OS_2026-07-16.md";
const voiceSkillPath = ".agents/skills/sandra-writing-style/SKILL.md";

for (const requiredPath of [voiceOsPath, voiceSkillPath]) {
  if (!fs.existsSync(path.join(root, requiredPath))) {
    console.error(`FAIL: expected ${requiredPath} to exist`);
    failed = true;
  }
}

for (const authorityPath of ["AGENTS.md", "CLAUDE.md"]) {
  if (!read(authorityPath).includes("SANDRA_VOICE_OS_2026-07-16.md")) {
    console.error(`FAIL: expected ${authorityPath} to load the Sandra Voice OS`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
