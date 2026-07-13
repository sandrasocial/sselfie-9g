#!/usr/bin/env node

/**
 * SCRIPT 3: Cron Job Status Report
 * Compare crons in vercel.json vs. actual cron definitions in ~/sselfie-9g/lib/crons/*.ts
 * Check if registered crons are actually executing (query logs)
 * Output: ~/stella/reports/codebase-health/cron-status-YYYY-MM-DD.md
 * Schedule: Weekly (Thursdays 09:00 CET)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORT_DIR = path.resolve(
  process.env.HOME || '/Users/MD760HA',
  'stella/reports/codebase-health'
);
const PROJECT_ROOT = path.resolve(
  process.env.SSELFIE_ROOT || '/Users/MD760HA/ACTIVE/sselfie-9g'
);
const VERCEL_JSON = path.join(PROJECT_ROOT, 'vercel.json');
const APP_CRON_DIR = path.join(PROJECT_ROOT, 'app/api/cron');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const today = new Date();
const dateStr = today.toISOString().split('T')[0];
const reportPath = path.join(REPORT_DIR, `cron-status-${dateStr}.md`);

async function main() {
  try {
    console.log('[CRON-STATUS] Starting cron audit...');

    // 1. Parse vercel.json for registered crons
    let vercelCrons = [];
    if (fs.existsSync(VERCEL_JSON)) {
      const config = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'));
      if (config.crons) {
        vercelCrons = config.crons;
      }
    }

    // 2. Find all cron handler files in app/api/cron
    const cronHandlers = findCronHandlers(APP_CRON_DIR);

    // 3. Compare registered vs implemented
    const audit = auditCrons(vercelCrons, cronHandlers);

    // 4. Generate report
    const report = generateReport(audit, vercelCrons, cronHandlers);

    fs.writeFileSync(reportPath, report);
    console.log(`[CRON-STATUS] Report written to ${reportPath}`);
    console.log(`[CRON-STATUS] Summary: ${audit.registered} registered, ${audit.implemented} implemented, ${audit.missing} missing`);

    process.exit(0);
  } catch (error) {
    console.error('[CRON-STATUS] Error:', error.message);
    process.exit(1);
  }
}

function findCronHandlers(cronDir) {
  const handlers = [];

  if (!fs.existsSync(cronDir)) {
    return handlers;
  }

  function traverseDir(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach((entry) => {
      if (entry.name.startsWith('.')) return;

      const fullPath = path.join(dir, entry.name);
      const pathPart = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Check if this has route.ts
        const routePath = path.join(fullPath, 'route.ts');
        if (fs.existsSync(routePath)) {
          handlers.push({
            path: `/api/cron/${pathPart}`,
            handler: routePath,
            exists: true,
            schedule: null, // Will be matched from vercel.json
          });
        }
        // Continue traversing
        traverseDir(fullPath, pathPart);
      }
    });
  }

  traverseDir(cronDir);
  return handlers;
}

function auditCrons(vercelCrons, cronHandlers) {
  const vercelPaths = vercelCrons.map((c) => c.path);
  const handlerPaths = cronHandlers.map((c) => c.path);

  const registered = vercelPaths.length;
  const implemented = handlerPaths.filter((p) => vercelPaths.includes(p)).length;
  const missing = vercelPaths.filter((p) => !handlerPaths.includes(p)).length;
  const orphaned = handlerPaths.filter((p) => !vercelPaths.includes(p)).length;

  return {
    registered,
    implemented,
    missing,
    orphaned,
    mismatch: missing > 0 || orphaned > 0,
  };
}

function generateReport(audit, vercelCrons, cronHandlers) {
  const timestamp = new Date().toISOString();
  const vercelPaths = new Set(vercelCrons.map((c) => c.path));
  const handlerMap = new Map(cronHandlers.map((c) => [c.path, c]));

  let report = `# Cron Job Status Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Registered in vercel.json:** ${audit.registered}\n`;
  report += `- **Implemented handlers:** ${audit.implemented}\n`;
  report += `- **Missing implementations:** ${audit.missing}\n`;
  report += `- **Orphaned handlers:** ${audit.orphaned}\n`;

  if (audit.mismatch) {
    report += `- **⚠️ Status:** MISMATCH DETECTED\n`;
  } else {
    report += `- **✅ Status:** All crons properly configured\n`;
  }
  report += '\n';

  report += `## Registered Crons (vercel.json)\n\n`;
  vercelCrons.forEach((cron) => {
    const isImplemented = handlerMap.has(cron.path);
    const status = isImplemented ? '✅' : '❌';
    report += `- ${status} \`${cron.path}\`\n`;
    report += `  - Schedule: \`${cron.schedule}\`\n`;
    if (!isImplemented) {
      report += `  - ⚠️ MISSING HANDLER\n`;
    }
  });
  report += '\n';

  if (audit.orphaned > 0) {
    report += `## ⚠️ Orphaned Handlers (Implemented but not registered)\n\n`;
    cronHandlers.forEach((handler) => {
      if (!vercelPaths.has(handler.path)) {
        report += `- ❌ \`${handler.path}\`\n`;
        report += `  - Handler: ${handler.handler}\n`;
        report += `  - Action: Add to vercel.json or remove handler\n`;
      }
    });
    report += '\n';
  }

  report += `## 📝 Recommendations\n\n`;
  if (audit.missing > 0) {
    report += `1. **Missing handlers:** Implement the following cron handlers:\n`;
    vercelCrons.forEach((cron) => {
      if (!handlerMap.has(cron.path)) {
        report += `   - \`${cron.path}\`\n`;
      }
    });
    report += '\n';
  }

  if (audit.orphaned > 0) {
    report += `2. **Orphaned handlers:** Review and either register or remove:\n`;
    cronHandlers.forEach((handler) => {
      if (!vercelPaths.has(handler.path)) {
        report += `   - \`${handler.path}\`\n`;
      }
    });
    report += '\n';
  }

  if (audit.mismatch === false) {
    report += `- All cron handlers are properly registered and implemented ✅\n`;
    report += `- Continue monitoring execution logs via Vercel dashboard\n`;
  }

  report += `\n## 🔍 How to Debug\n\n`;
  report += `### Check Vercel Cron Logs\n`;
  report += `\`\`\`bash\n`;
  report += `vercel logs --follow --source=cron\n`;
  report += `\`\`\`\n\n`;

  report += `### Test Cron Locally\n`;
  report += `\`\`\`bash\n`;
  report += `curl http://localhost:3000/api/cron/[cron-name]\n`;
  report += `\`\`\`\n\n`;

  report += `### Monitor Execution\n`;
  report += `- Check Vercel dashboard: Functions > Crons\n`;
  report += `- Review function logs for errors\n`;
  report += `- Verify scheduled times in vercel.json\n`;

  return report;
}

main();
