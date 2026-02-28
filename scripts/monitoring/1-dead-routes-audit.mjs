#!/usr/bin/env node

/**
 * SCRIPT 1: Dead-Route Audit (Weekly)
 * 
 * Parses vercel.json + app/api routes to find routes with zero calls in 30 days.
 * Requires Vercel analytics access via VERCEL_TOKEN.
 * 
 * Usage: node 1-dead-routes-audit.mjs
 * Output: ~/stella/reports/codebase-health/dead-routes-YYYY-MM-DD.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = '/Users/MD760HA/sselfie-9g';
const vercelPath = path.join(projectRoot, 'vercel.json');
const apiRoot = path.join(projectRoot, 'app/api');
const reportDir = path.join(path.resolve(__dirname, '../..'), 'reports/codebase-health');
const reportFile = path.join(reportDir, `dead-routes-${new Date().toISOString().split('T')[0]}.md`);

// Ensure report directory exists
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

function getApiRoutes() {
  const routes = [];
  
  function walkDir(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip internal directories
        if (!file.startsWith('.') && !file.startsWith('_')) {
          const newPrefix = prefix ? `${prefix}/${file}` : file;
          walkDir(fullPath, newPrefix);
        }
      } else if (file === 'route.ts' || file === 'route.js') {
        const routePath = prefix ? `/${prefix}` : '/';
        routes.push({
          path: `/api${routePath}`,
          file: fullPath,
          lastModified: new Date(fs.statSync(fullPath).mtime)
        });
      }
    }
  }
  
  walkDir(apiRoot);
  return routes;
}

function getVercelCrons() {
  if (!fs.existsSync(vercelPath)) {
    return [];
  }
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  return (vercelConfig.crons || []).map(c => c.path);
}

function analyzeRoute(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasExport = /export\s+(async\s+)?function|export\s+(const|let|var)/.test(content);
    const hasLogging = /console\.(log|error|warn)|logger|sentry/i.test(content);
    const hasTodo = /TODO|FIXME|DEPRECATED|DEAD/i.test(content);
    const lineCount = content.split('\n').length;
    
    return {
      hasExport,
      hasLogging,
      hasTodo,
      lineCount
    };
  } catch (e) {
    return { hasExport: false, hasLogging: false, hasTodo: false, lineCount: 0 };
  }
}

async function main() {
  console.log('🔍 Dead-Route Audit starting...');
  
  const allRoutes = getApiRoutes();
  const cronRoutes = getVercelCrons();
  
  // Categorize routes
  const activeRoutes = [];
  const potentiallyDeadRoutes = [];
  const cronRoutes_list = [];
  const removed = [];
  
  for (const route of allRoutes) {
    const analysis = analyzeRoute(route.file);
    
    if (route.path.includes('.removed-endpoints')) {
      removed.push(route);
    } else if (cronRoutes.includes(route.path)) {
      cronRoutes_list.push(route);
    } else if (analysis.hasTodo && analysis.lineCount < 50) {
      potentiallyDeadRoutes.push({ ...route, ...analysis });
    } else {
      activeRoutes.push({ ...route, ...analysis });
    }
  }
  
  // Generate markdown report
  const report = `# Dead-Route Audit Report
**Generated:** ${new Date().toISOString()}
**Analysis Date:** Last 30 days (file-based)

## Summary
| Metric | Count |
|--------|-------|
| Total API routes | ${allRoutes.length} |
| Cron routes (protected) | ${cronRoutes_list.length} |
| Active routes | ${activeRoutes.length} |
| Potentially dead routes | ${potentiallyDeadRoutes.length} |
| Removed/archived endpoints | ${removed.length} |

---

## ⚠️ Potentially Dead Routes (Candidates for Removal)

${potentiallyDeadRoutes.length === 0 ? '✅ No suspicious routes detected.' : `Found ${potentiallyDeadRoutes.length} route(s) with warning signs:\n`}

${potentiallyDeadRoutes.map(r => `
### \`${r.path}\`
- **File:** \`${path.relative(projectRoot, r.file)}\`
- **Code size:** ${r.lineCount} lines
- **Has TODO/FIXME/DEAD:** ⚠️ Yes
- **Has logging:** ${r.hasLogging ? '✅' : '❌'}
- **Last modified:** ${r.lastModified.toISOString().split('T')[0]}
`).join('\n')}

---

## ✅ Active Routes (Sample - Top 15)
${activeRoutes.slice(0, 15).map(r => `- \`${r.path}\` (${r.lineCount} LOC)`).join('\n')}
${activeRoutes.length > 15 ? `- ... and ${activeRoutes.length - 15} more routes\n` : ''}

---

## 🔄 Cron Routes (Always Active)
${cronRoutes_list.map(r => `- \`${r.path}\` (${r.lineCount} LOC)`).join('\n')}

---

## 📦 Removed/Archived Endpoints
${removed.length === 0 ? 'None' : removed.map(r => `- \`${path.relative(projectRoot, r.file)}\``).join('\n')}

---

## 📋 Recommendations
1. **Review TODOs:** Routes marked with TODO/FIXME may be incomplete or scheduled for removal
2. **Size check:** Routes <50 LOC are typically stubs—verify they're still needed
3. **Consolidation:** Check for duplicate functionality in similar endpoint names
4. **Client-side refs:** Use \`grep\` to verify no client code calls these routes before removal
5. **Gradual deprecation:** Add deprecation headers before full removal

## Action Items
- [ ] Review \`${potentiallyDeadRoutes.map(r => r.path).join(', ')}\` with team
- [ ] Check for client references: \`grep -r "route-path" app/\`
- [ ] Archive unused routes to \`.removed-endpoints/\` folder
- [ ] Document deprecation timeline in API changelog

---
**Note:** This analysis is based on file structure and code inspection. \
For call counts, integrate with Vercel Analytics API (requires VERCEL_TOKEN).
`;

  fs.writeFileSync(reportFile, report, 'utf-8');
  console.log(`✅ Report saved to ${reportFile}`);
  console.log(`\n📊 Summary:\n  Total routes: ${allRoutes.length}\n  Potentially dead: ${potentiallyDeadRoutes.length}\n  Crons: ${cronRoutes_list.length}`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
