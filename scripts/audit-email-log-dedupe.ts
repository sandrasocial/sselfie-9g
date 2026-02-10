import fs from 'node:fs'
import path from 'node:path'

// Simple static check: ensure cron SQL joins against email_logs include a status gate.
// This prevents "queued" rows from permanently blocking sends.
//
// This is intentionally conservative: it flags potential issues for human review.

const ROOT = path.join(process.cwd(), 'app', 'api', 'cron')

function walk(dir: string, out: string[] = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (ent.isFile() && p.endsWith('.ts') && !p.endsWith('.disabled')) out.push(p)
  }
  return out
}

const files = walk(ROOT)

type Finding = { file: string; line: number; snippet: string }
const findings: Finding[] = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Look for joins selecting email_logs with an alias (el, el_day0, el_email3, etc)
    if (!/\b(LEFT|INNER)\s+JOIN\s+email_logs\b/.test(line)) continue

    const window = lines.slice(i, Math.min(i + 10, lines.length)).join('\n')

    // If the join window includes a status filter, assume it's safe.
    if (/\bstatus\s+IN\s*\(\s*'sent'\s*,\s*'delivered'\s*\)/.test(window)) continue
    if (/\bstatus\s*=\s*'sent'\b/.test(window)) continue

    // If the join is followed by "el.id IS NULL" but no status gate, it's likely wrong.
    if (/\b\.id\s+IS\s+NULL\b/.test(window)) {
      findings.push({
        file,
        line: i + 1,
        snippet: line.trim(),
      })
    }
  }
}

if (findings.length === 0) {
  console.log('OK: No obvious email_logs dedupe joins missing status gates in app/api/cron/*.ts')
  process.exit(0)
}

console.log(`POTENTIAL ISSUES: ${findings.length} email_logs join(s) may be missing status gates`) 
for (const f of findings) {
  const rel = path.relative(process.cwd(), f.file)
  console.log(`- ${rel}:${f.line}: ${f.snippet}`)
}
process.exit(2)
