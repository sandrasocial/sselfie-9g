#!/usr/bin/env node

/**
 * SCRIPT 1: Weekly Dead-Route Audit
 * Compares routes in vercel.json + codebase against actual API usage
 * Identifies routes not called in 30 days
 * Output: ~/stella/reports/codebase-health/dead-routes-YYYY-MM-DD.md
 * Schedule: Weekly (Mondays 07:00 CET)
 */

const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.resolve(
  process.env.HOME || '/Users/MD760HA',
  'stella/reports/codebase-health'
);
const PROJECT_ROOT = path.resolve(
  process.env.SSELFIE_ROOT || '/Users/MD760HA/ACTIVE/sselfie-9g'
);
const VERCEL_JSON = path.join(PROJECT_ROOT, 'vercel.json');
const APP_DIR = path.join(PROJECT_ROOT, 'app');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const today = new Date();
const dateStr = today.toISOString().split('T')[0];
const reportPath = path.join(REPORT_DIR, `dead-routes-${dateStr}.md`);

async function main() {
  try {
    console.log('[DEAD-ROUTES-AUDIT] Starting...');

    // 1. Parse vercel.json for cron routes
    let vercelCrons = [];
    if (fs.existsSync(VERCEL_JSON)) {
      const config = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'));
      if (config.crons) {
        vercelCrons = config.crons.map((c) => c.path);
      }
    }

    // 2. Find all API routes in app/api
    const apiRoutes = findAllRoutes(APP_DIR);

    // 3. Find all checkout routes
    const checkoutRoutes = findCheckoutRoutes(APP_DIR);

    // 4. Combine and deduplicate
    const allRoutes = [...new Set([...vercelCrons, ...apiRoutes, ...checkoutRoutes])];

    // 5. Check route health (placeholder for real analytics integration)
    const routeHealth = checkRouteHealth(allRoutes);

    // 6. Identify dead routes (not called in 30 days)
    const deadRoutes = routeHealth.filter((r) => !r.recentlyUsed);
    const healthyRoutes = routeHealth.filter((r) => r.recentlyUsed);

    // 7. Generate markdown report
    const report = generateReport(
      deadRoutes,
      healthyRoutes,
      vercelCrons,
      apiRoutes,
      checkoutRoutes
    );

    fs.writeFileSync(reportPath, report);
    console.log(`[DEAD-ROUTES-AUDIT] Report written to ${reportPath}`);
    console.log(
      `[DEAD-ROUTES-AUDIT] Found ${deadRoutes.length} potentially dead routes out of ${allRoutes.length} total`
    );

    process.exit(0);
  } catch (error) {
    console.error('[DEAD-ROUTES-AUDIT] Error:', error.message);
    process.exit(1);
  }
}

function findAllRoutes(appDir) {
  const routes = [];

  function traverseDir(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (entry.name.startsWith('.')) return;
      if (entry.name === 'node_modules') return;

      const fullPath = path.join(dir, entry.name);
      const pathPart = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (fs.existsSync(path.join(fullPath, 'route.ts')) || 
            fs.existsSync(path.join(fullPath, 'route.js'))) {
          routes.push(`/api/${pathPart}`);
        }
        traverseDir(fullPath, pathPart);
      }
    });
  }

  const apiDir = path.join(appDir, 'api');
  if (fs.existsSync(apiDir)) {
    traverseDir(apiDir);
  }

  return routes;
}

function findCheckoutRoutes(appDir) {
  const routes = [];
  const checkoutDir = path.join(appDir, 'checkout');

  if (!fs.existsSync(checkoutDir)) return routes;

  function traverseCheckout(dir, prefix = '/checkout') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') return;

      const fullPath = path.join(dir, entry.name);
      const routePath = `${prefix}/${entry.name}`;

      if (entry.isDirectory()) {
        if (fs.existsSync(path.join(fullPath, 'page.tsx')) ||
            fs.existsSync(path.join(fullPath, 'layout.tsx')) ||
            fs.existsSync(path.join(fullPath, 'route.ts'))) {
          routes.push(routePath);
        }
        traverseCheckout(fullPath, routePath);
      }
    });
  }

  traverseCheckout(checkoutDir);
  return routes;
}

function checkRouteHealth(routes) {
  return routes.map((route) => ({
    route,
    recentlyUsed: true,
    lastUsed: new Date(),
    callCount: 0,
    notes: 'Requires Vercel Analytics API integration',
  }));
}

function generateReport(deadRoutes, healthyRoutes, vercelCrons, apiRoutes, checkoutRoutes) {
  const timestamp = new Date().toISOString();

  let report = `# Dead Routes Audit Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;

  report += `## Summary\n\n`;
  report += `- **Total Routes:** ${deadRoutes.length + healthyRoutes.length}\n`;
  report += `- **Potentially Dead (30+ days):** ${deadRoutes.length}\n`;
  report += `- **Recently Used:** ${healthyRoutes.length}\n`;
  report += `- **Registered Crons in vercel.json:** ${vercelCrons.length}\n`;
  report += `- **API Routes Found:** ${apiRoutes.length}\n`;
  report += `- **Checkout Routes Found:** ${checkoutRoutes.length}\n\n`;

  if (deadRoutes.length > 0) {
    report += `## ⚠️ Potentially Dead Routes\n\n`;
    deadRoutes.forEach((route) => {
      report += `- \`${route.route}\` - Last used: ${route.lastUsed || 'Never'}\n`;
    });
    report += '\n';
  }

  report += `## ✅ Registered Crons (vercel.json)\n\n`;
  if (vercelCrons.length > 0) {
    vercelCrons.forEach((cron) => {
      report += `- \`${cron}\`\n`;
    });
  } else {
    report += 'No crons registered.\n';
  }
  report += '\n';

  report += `## 📡 API Routes Found\n\n`;
  report += `Found ${apiRoutes.length} API route(s).\n\n`;
  if (apiRoutes.length > 0 && apiRoutes.length <= 50) {
    apiRoutes.slice(0, 20).forEach((route) => {
      report += `- \`${route}\`\n`;
    });
    if (apiRoutes.length > 20) {
      report += `- ... and ${apiRoutes.length - 20} more\n`;
    }
  }
  report += '\n';

  report += `## 🛒 Checkout Routes Found\n\n`;
  report += `Found ${checkoutRoutes.length} checkout route(s).\n\n`;
  if (checkoutRoutes.length > 0) {
    checkoutRoutes.forEach((route) => {
      report += `- \`${route}\`\n`;
    });
  }
  report += '\n';

  report += `## 📝 Notes\n\n`;
  report += `- This audit requires integration with Vercel Analytics API for real usage data\n`;
  report += `- Currently reports all routes as "healthy" pending API integration\n`;
  report += `- Next step: Connect to Vercel Analytics to identify truly unused endpoints\n`;

  return report;
}

main();
