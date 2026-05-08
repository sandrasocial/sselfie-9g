import { spawn } from "node:child_process"

const requiredChecks = [
  ["Repo invariants", ["pnpm", "verify:repo"]],
  ["Route inventory", ["pnpm", "routes:inventory"]],
  ["Route classification", ["pnpm", "routes:classify"]],
  ["Integration health", ["pnpm", "audit:integration-health"]],
  ["User journey smoke", ["pnpm", "automation:journey-smoke"]],
  ["Maya quality", ["pnpm", "audit:maya-quality"]],
]

const advisoryChecks = [
  ["Brand consistency", ["pnpm", "audit:brand-consistency"]],
  ["Token hardcoding warning", ["pnpm", "lint:tokens"]],
]

function runCheck(label, command) {
  return new Promise((resolve) => {
    const [bin, ...args] = command
    console.log(`\n[diagnostics:core] ${label}`)
    console.log(`[diagnostics:core] $ ${command.join(" ")}`)

    const child = spawn(bin, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: false,
    })

    child.on("close", (code) => {
      resolve({ label, code: code ?? 1 })
    })

    child.on("error", (error) => {
      console.error(`[diagnostics:core] ${label} failed to start:`, error)
      resolve({ label, code: 1 })
    })
  })
}

const requiredResults = []
for (const [label, command] of requiredChecks) {
  requiredResults.push(await runCheck(label, command))
}

const advisoryResults = []
for (const [label, command] of advisoryChecks) {
  advisoryResults.push(await runCheck(label, command))
}

const requiredFailures = requiredResults.filter((result) => result.code !== 0)
const advisoryFailures = advisoryResults.filter((result) => result.code !== 0)

console.log("\n[diagnostics:core] Summary")
for (const result of requiredResults) {
  console.log(`- ${result.code === 0 ? "PASS" : "FAIL"} ${result.label}`)
}
for (const result of advisoryResults) {
  console.log(`- ${result.code === 0 ? "PASS" : "ADVISORY"} ${result.label}`)
}

if (advisoryFailures.length > 0) {
  console.warn(
    `[diagnostics:core] Advisory checks reported issues: ${advisoryFailures
      .map((result) => result.label)
      .join(", ")}`,
  )
}

if (requiredFailures.length > 0) {
  console.error(
    `[diagnostics:core] Required checks failed: ${requiredFailures.map((result) => result.label).join(", ")}`,
  )
  process.exit(1)
}

process.exit(0)
