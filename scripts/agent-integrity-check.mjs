#!/usr/bin/env node
/**
 * Agent reference-integrity check (Phase 1 of AGENT_VERIFICATION_GUARDRAILS).
 * Verifies that key agent authority paths exist. Run from repo root.
 * Usage: node scripts/agent-integrity-check.mjs [--stella-home /path]
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const stellaHome = process.env.STELLA_HOME || path.join(process.env.HOME || '', 'stella');

const requiredRepo = [
  'CLAUDE.md',
  'AGENTS.md',
  'STATUS.md',
  'docs/CODEX_CONTEXT.md',
  'docs/_CANONICAL/CURSOR_CONSTITUTION.md',
  'docs/_CANONICAL/AGENT_TRUTH_MODEL.md',
  'memory/context/openclaw-protocol.md',
];

const requiredStella = [
  'NORTH_ACTIVE.md',
  'SHARED_MEMORY.md',
  'AGENTS.md',
  'BOOTSTRAP.md',
  'ACTIVE/tasks',
  'ACTIVE/reports',
];

const optionalRepo = [
  'docs/MAYA_RELIABILITY_PROGRAM_2026-03-11.md',
  'docs/codex-tasks/AGENT-V1-EXECUTION-SPEC-2026-02-28.md',
  'memory/context/business-context.md',
];

function check(dir, files, label) {
  const missing = [];
  for (const f of files) {
    const full = path.join(dir, f);
    if (!existsSync(full)) missing.push(f);
  }
  return { missing, label };
}

const repoCheck = check(repoRoot, requiredRepo, 'sselfie-9g');
const stellaCheck = check(stellaHome, requiredStella, '~/stella');
const optCheck = check(repoRoot, optionalRepo, 'sselfie-9g (optional)');

const repoMissing = repoCheck.missing.length;
const stellaMissing = stellaCheck.missing.length;
const optMissing = optionalRepo.filter((f) => !existsSync(path.join(repoRoot, f)));

let exitCode = 0;
if (repoMissing > 0) {
  console.error(`[FAIL] ${repoCheck.label} missing: ${repoCheck.missing.join(', ')}`);
  exitCode = 1;
} else {
  console.log(`[PASS] ${repoCheck.label} required paths exist`);
}

if (stellaMissing > 0) {
  console.error(`[FAIL] ${stellaCheck.label} missing: ${stellaCheck.missing.join(', ')}`);
  exitCode = 1;
} else {
  console.log(`[PASS] ${stellaCheck.label} required paths exist`);
}

if (optMissing.length > 0) {
  console.warn(`[WARN] Optional missing: ${optMissing.join(', ')}`);
}

process.exit(exitCode);
