#!/usr/bin/env node

/**
 * SCRIPT 2: Critical-Path Check (Daily)
 * 
 * HTTP smoke test of business-critical routes.
 * Tests: /checkout/membership, /checkout/blueprint, /api/auth, /api/maya-generate
 * 
 * Usage: node 2-critical-path-check.mjs [BASE_URL]
 * Output: ~/stella/reports/codebase-health/critical-path-YYYY-MM-DD.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(path.resolve(__dirname, '../..'), 'reports/codebase-health');
const reportFile = path.join(reportDir, `critical-path-${new Date().toISOString().split('T')[0]}.txt`);
const baseUrl = process.argv[2] || process.env.VERCEL_URL || 'https://www.sselfie.ai';

// Ensure report directory exists
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

const CRITICAL_ROUTES = [
  { path: '/api/auth', method: 'POST', description: 'Authentication endpoint' },
  { path: '/api/studio/generate', method: 'POST', description: 'Image generation (Maya)' },
  { path: '/api/checkout/membership', method: 'POST', description: 'Membership checkout' },
  { path: '/api/checkout/blueprint', method: 'POST', description: 'Blueprint product checkout' },
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    const url = new URL(route.path, baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    const req = protocol.request(url, { method: route.method }, (res) => {
      const duration = Date.now() - startTime;
      
      // 2xx = OK, 4xx/5xx = exists but may need auth, anything else = down
      const status = res.statusCode;
      const isHealthy = status >= 200 && status < 600; // endpoint exists
      const isGood = status >= 200 && status < 400;
      
      resolve({
        route: route.path,
        description: route.description,
        method: route.method,
        status,
        duration,
        healthy: isHealthy,
        good: isGood,
        error: null
      });
    });
    
    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        route: route.path,
        description: route.description,
        method: route.method,
        status: 0,
        duration,
        healthy: false,
        good: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const duration = Date.now() - startTime;
      resolve({
        route: route.path,
        description: route.description,
        method: route.method,
        status: 0,
        duration,
        healthy: false,
        good: false,
        error: 'Timeout (>5s)'
      });
    });
    
    req.setTimeout(5000);
    req.end();
  });
}

async function main() {
  console.log(`🧪 Critical Path Health Check\nTarget: ${baseUrl}\n`);
  
  const results = [];
  
  for (const route of CRITICAL_ROUTES) {
    process.stdout.write(`  Testing ${route.path}...`);
    const result = await checkRoute(route);
    results.push(result);
    
    const status = result.healthy ? (result.good ? '✅' : '⚠️') : '❌';
    console.log(` ${status} ${result.status || 'TIMEOUT'} (${result.duration}ms)`);
  }
  
  // Generate report
  const timestamp = new Date().toISOString();
  const healthyCount = results.filter(r => r.healthy).length;
  const goodCount = results.filter(r => r.good).length;
  const allGood = goodCount === results.length;
  
  const report = `CRITICAL PATH HEALTH CHECK
Time: ${timestamp}
Target: ${baseUrl}
Status: ${allGood ? '✅ ALL HEALTHY' : `⚠️ ISSUES DETECTED (${results.length - goodCount} failures)`}

========================================

RESULTS SUMMARY
${results.map(r => {
  const icon = r.good ? '✅' : (r.healthy ? '⚠️' : '❌');
  return `${icon} ${r.method} ${r.path}
   Status: ${r.status || 'NO RESPONSE'}
   Response time: ${r.duration}ms
   Description: ${r.description}
   ${r.error ? `Error: ${r.error}` : ''}`;
}).join('\n\n')}

========================================

HEALTH SUMMARY
- Healthy endpoints: ${healthyCount}/${results.length}
- Good (2xx-3xx) endpoints: ${goodCount}/${results.length}
- Overall: ${allGood ? '✅ PASS' : '❌ FAIL'}

REMEDIATION
${results.filter(r => !r.good).map(r => 
  `- ${r.path}: ${r.error || `Status ${r.status}`}`
).join('\n')}

Timestamp: ${timestamp}
`;

  fs.writeFileSync(reportFile, report, 'utf-8');
  console.log(`\n✅ Report saved to ${reportFile}`);
  
  if (!allGood) {
    console.log('\n⚠️ WARNING: Some critical routes are not responding correctly');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
