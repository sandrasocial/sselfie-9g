#!/usr/bin/env node

/**
 * SCRIPT 3: Cron Status Report (Weekly)
 * 
 * Compares:
 * 1. Crons defined in vercel.json
 * 2. Actual route implementations in app/api/cron/*
 * 3. Execution logs (if available in Vercel)
 * 
 * Usage: node 3-cron-status-report.mjs
 * Output: ~/stella/reports/codebase-health/cron-status-YYYY-MM-DD.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = '/Users/MD760HA/sselfie-9g';
const vercelPath = path.join(projectRoot, 'vercel.json');
const cronRoot = path.join(projectRoot, 'app/api/cron');
const reportDir = path.join(path.resolve(__dirname, '../..'), 'reports/codebase-health');
const reportFile = path.join(reportDir, `cron-status-${new Date().toISOString().split('T')[0]}.md`);

// Ensure report directory exists
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

function parseVercelCrons() {
  if (!fs.existsSync(vercelPath)) {
    return [];
  }
  const config = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  return (config.crons || []).map(c => ({
    path: c.path,
    schedule: c.schedule,
    source: 'vercel.json'
  }));
}

function getImplementedCrons() {
  if (!fs.existsSync(cronRoot)) {
    return [];
  }
  
  const crons = [];
  const files = fs.readdirSync(cronRoot);
  
  for (const file of files) {
    if (file.startsWith('.')) continue;
    
    const fullPath = path.join(cronRoot, file, 'route.ts');
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lastModified = new Date(fs.statSync(fullPath).mtime);
      
      // Parse for schedule info in code
      const scheduleMatch = content.match(/schedule['":\s]*["']([^"']+)["']/i);
      const hasErrorHandling = /try\s*\{|catch\s*\(|error|Error/i.test(content);
      const hasLogging = /console\.(log|error|warn)|logger/i.test(content);
      const hasDbOp = /query|INSERT|UPDATE|DELETE|execute/i.test(content);
      
      crons.push({
        path: `/api/cron/${file}`,
        schedule: scheduleMatch ? scheduleMatch[1] : 'unknown',
        file: fullPath,
        lastModified,
        errorHandling: hasErrorHandling,
        logging: hasLogging,
        dbOperation: hasDbOp,
        source: 'implementation'
      });
    }
  }
  
  return crons;
}

function humanizeSchedule(cron) {
  // Simple cron-to-English conversion
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;
  
  const [minute, hour, dayMonth, month, dayWeek] = parts;
  
  if (cron === '*/5 * * * *') return 'Every 5 minutes';
  if (cron === '*/15 * * * *') return 'Every 15 minutes';
  if (cron === '*/30 * * * *') return 'Every 30 minutes';
  if (cron === '0 5 * * *') return 'Daily at 05:00 UTC';
  if (cron === '0 10 * * *') return 'Daily at 10:00 UTC';
  if (cron === '0 * * * *') return 'Hourly';
  
  return cron;
}

async function main() {
  console.log('📋 Cron Status Report...\n');
  
  const vercelCrons = parseVercelCrons();
  const implementedCrons = getImplementedCrons();
  
  // Map paths to objects
  const vercelMap = new Map(vercelCrons.map(c => [c.path, c]));
  const implMap = new Map(implementedCrons.map(c => [c.path, c]));
  
  // Find mismatches
  const allPaths = new Set([...vercelMap.keys(), ...implMap.keys()]);
  const wellDefined = [];
  const missingImplementation = [];
  const orphanedImplementation = [];
  
  for (const path of allPaths) {
    const vercel = vercelMap.get(path);
    const impl = implMap.get(path);
    
    if (vercel && impl) {
      wellDefined.push({
        path,
        schedule: vercel.schedule,
        lastModified: impl.lastModified,
        errorHandling: impl.errorHandling,
        logging: impl.logging,
        dbOperation: impl.dbOperation
      });
    } else if (vercel && !impl) {
      missingImplementation.push({
        path,
        schedule: vercel.schedule,
        status: '❌ MISSING IMPLEMENTATION'
      });
    } else if (!vercel && impl) {
      orphanedImplementation.push({
        path,
        schedule: impl.schedule,
        status: '⚠️ NOT IN VERCEL.JSON'
      });
    }
  }
  
  // Generate report
  const report = `# Cron Status Report
**Generated:** ${new Date().toISOString()}

## Executive Summary
| Status | Count |
|--------|-------|
| Well-defined crons | ${wellDefined.length} |
| Missing implementation | ${missingImplementation.length} |
| Orphaned (no vercel.json) | ${orphanedImplementation.length} |
| **Total crons** | **${allPaths.size}** |

**Health:** ${missingImplementation.length === 0 && orphanedImplementation.length === 0 ? '✅ All crons properly configured' : '⚠️ Configuration issues detected'}

---

## ✅ Well-Defined & Active Crons
${wellDefined.length === 0 ? 'None.' : ''}
${wellDefined.map(c => `
### \`${c.path}\`
- **Schedule:** \`${c.schedule}\` (${humanizeSchedule(c.schedule)})
- **Error handling:** ${c.errorHandling ? '✅' : '❌'}
- **Logging:** ${c.logging ? '✅' : '❌'}
- **DB operations:** ${c.dbOperation ? 'Yes' : 'No'}
- **Last modified:** ${c.lastModified.toISOString().split('T')[0]}
`).join('\n')}

---

## ❌ Missing Implementation
${missingImplementation.length === 0 ? '✅ None' : ''}
${missingImplementation.map(c => `
### \`${c.path}\`
- **Schedule:** ${c.schedule}
- **Status:** ${c.status}
- **Action required:** Create \`app/api/cron/${c.path.split('/').pop()}/route.ts\`
`).join('\n')}

---

## ⚠️ Orphaned Implementations (Not in vercel.json)
${orphanedImplementation.length === 0 ? '✅ None' : ''}
${orphanedImplementation.map(c => `
### \`${c.path}\`
- **Schedule (from code):** ${c.schedule}
- **Status:** ${c.status}
- **Action required:** Either:
  1. Add to \`vercel.json\` if intentional
  2. Move to \`.removed-endpoints/\` if deprecated
`).join('\n')}

---

## 📋 Cron Implementation Checklist
- [ ] All crons in \`vercel.json\` have matching implementations
- [ ] No orphaned cron routes
- [ ] All active crons have error handling
- [ ] All active crons have logging
- [ ] Cron schedules are optimized (avoid overlaps)
- [ ] Database operations have transaction handling

## Cron Performance Notes
- Fast crons (data reconciliation): ${wellDefined.filter(c => c.dbOperation).length}
- Heavy crons (may need throttling): Review schedules to avoid resource spikes

---

**Next steps:**
1. Implement any missing crons (${missingImplementation.length})
2. Archive orphaned crons (${orphanedImplementation.length})
3. Add error handling to critical paths
4. Monitor execution logs in Vercel dashboard

**Vercel crons docs:** https://vercel.com/docs/crons
`;

  fs.writeFileSync(reportFile, report, 'utf-8');
  console.log(`✅ Report saved to ${reportFile}`);
  console.log(`\n📊 Summary:\n  Well-defined: ${wellDefined.length}\n  Missing impl: ${missingImplementation.length}\n  Orphaned: ${orphanedImplementation.length}`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
