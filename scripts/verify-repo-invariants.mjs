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

process.exit(failed ? 1 : 0);
