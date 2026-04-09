#!/usr/bin/env node
/**
 * Re-sets NEXT_PUBLIC_SUPABASE_* from .env.local on Vercel (all targets).
 * NEXT_PUBLIC_* must be present at build time for the browser bundle — redeploy after running.
 *
 * Usage: node scripts/push-supabase-next-public-to-vercel.mjs
 */

import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { parse } from "dotenv"

const ROOT = new URL("..", import.meta.url).pathname
const VERCEL_SCOPE = "sselfie-studio"
const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
const ENVS = ["production", "preview", "development"]

const parsed = parse(readFileSync(`${ROOT}/.env.local`, "utf-8"))

for (const key of KEYS) {
  const val = (parsed[key] ?? "").trim()
  if (!val) {
    console.error(`Missing ${key} in .env.local`)
    process.exit(1)
  }
  for (const env of ENVS) {
    process.stdout.write(`${key} → ${env} ... `)
    const r = spawnSync(
      "vercel",
      ["env", "add", key, env, "--scope", VERCEL_SCOPE, "--force"],
      { cwd: ROOT, input: val, encoding: "utf-8", maxBuffer: 1024 * 1024 },
    )
    if (r.status !== 0) {
      console.error("FAIL")
      if (r.stderr) console.error(r.stderr)
      if (r.stdout) console.error(r.stdout)
      process.exit(1)
    }
    console.log("ok")
  }
}

console.log("\nDone. Trigger a new Production deployment (Vercel dashboard → Redeploy, or: vercel deploy --prod).")
