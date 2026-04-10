#!/usr/bin/env node
/**
 * Sync .env.local into Vercel project env.
 * - Non-sensitive / public: production, preview, development
 * - Sensitive (credentials): production, preview only — Vercel forbids --sensitive on "development"
 *
 * Skips Vercel system/injected VERCEL_* and ephemeral OIDC.
 *
 * Usage: node scripts/sync-env-to-vercel.mjs
 */

import { readFileSync } from "node:fs"
import { spawnSync, execSync } from "node:child_process"
import { parse } from "dotenv"

const ROOT = new URL("..", import.meta.url).pathname
const ENV_PATH = `${ROOT}/.env.local`
const VERCEL_SCOPE = "sselfie-studio"
const ENVS_ALL = ["production", "preview", "development"]
const ENVS_PROD_PREVIEW = ["production", "preview"]

/** Do not push — Vercel injects these at build/runtime, or they are ephemeral/local */
function shouldSkipKey(key) {
  if (!key || /^\s*$/.test(key)) return true
  if (key === "NX_DAEMON") return true
  if (key === "VERCEL" || key === "VERCEL_OIDC_TOKEN") return true
  if (key.startsWith("VERCEL_")) return true
  return false
}

/**
 * Only mark true credentials as --sensitive. Vercel allows sensitive on production + preview only.
 * Feature flags (MAYA_*, TURBO_*, NEON_PROJECT_ID, etc.) stay non-sensitive so Development can use them.
 */
function isSensitive(key) {
  if (key.startsWith("NEXT_PUBLIC_")) return false
  const k = key
  if (
    /SECRET|PASSWORD|API_KEY|WEBHOOK_SECRET|SERVICE_ROLE|BLOB_READ_WRITE|OPENAI_|ANTHROPIC_|STRIPE_SECRET|STRIPE_MCP|REPLICATE_API|RESEND_API|SUPABASE_SERVICE|SENTRY_AUTH|CRON_SECRET|GUMLOOP_API|GUMLOOP_WEBHOOK|INSTAGRAM_APP_SECRET|LOOPS_API|UPSTASH_|STACK_SECRET|STELLA_BRIDGE|AUTO_CONFIRM|GPT_ACTIONS|SUPABASE_JWT|LIVE_TEST|AI_GATEWAY|BRAVE_SEARCH|OPENROUTER|DATABASE_URL|DSN|PGPASSWORD|SUPABASE_ANON_KEY|SUPABASE_POSTGRES_PASSWORD|STRIPE_WEBHOOK_SECRET|RESEND_WEBHOOK_SECRET|SENTRY_DSN/.test(
      k,
    )
  ) {
    return true
  }
  if (/^POSTGRES_(URL|PASSWORD|PRISMA)|^PGPASSWORD|^SUPABASE_SERVICE|^UPSTASH_(SEARCH|KV)_REST_(TOKEN|READONLY)|^STACK_SECRET|^STRIPE_SECRET_KEY|^GUMLOOP_/.test(k)) {
    return true
  }
  return false
}

function environmentsFor(key) {
  return isSensitive(key) ? ENVS_PROD_PREVIEW : ENVS_ALL
}

function addToVercel(key, value, environment) {
  const args = ["env", "add", key, environment, "--scope", VERCEL_SCOPE, "--force"]
  if (isSensitive(key)) args.push("--sensitive")

  const r = spawnSync("vercel", args, {
    cwd: ROOT,
    input: value ?? "",
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  })

  if (r.status !== 0) {
    console.error(`FAILED ${key} [${environment}] exit=${r.status}`)
    if (r.stderr) console.error(r.stderr)
    if (r.stdout) console.error(r.stdout)
    return false
  }
  return true
}

const raw = readFileSync(ENV_PATH, "utf-8")
const parsed = parse(raw)
const entries = Object.entries(parsed).filter(([k]) => !shouldSkipKey(k))

console.log(`Found ${entries.length} keys. Sensitive keys use production+preview only; others use all envs.`)

let ok = 0
let fail = 0

for (const [key, value] of entries) {
  const str = value === undefined ? "" : String(value)
  const envs = environmentsFor(key)
  const sens = isSensitive(key) ? " [sensitive]" : ""
  for (const env of envs) {
    process.stdout.write(`  ${key} → ${env}${sens} ... `)
    if (addToVercel(key, str, env)) {
      console.log("ok")
      ok += 1
    } else {
      console.log("FAIL")
      fail += 1
    }
    try {
      execSync("sleep 0.06", { stdio: "ignore" })
    } catch {
      /* ignore */
    }
  }
}

console.log(`\nDone. ok=${ok} fail=${fail}`)
process.exit(fail > 0 ? 1 : 0)
