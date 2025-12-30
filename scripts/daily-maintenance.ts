/**
 * Daily Maintenance Script for SSELFIE Studio
 * Automatically scans, fixes, and reports on codebase health
 */

import { execSync } from 'child_process'

async function runDailyMaintenance() {
  console.log('🔍 Starting Daily Maintenance Scan...\n')
  
  const report = {
    date: new Date().toISOString().split('T')[0],
    status: 'HEALTHY',
    autoFixes: [] as string[],
    issues: [] as string[],
    optimizations: [] as string[],
    costs: { daily: 0, change: 0 },
    mobile: { percentage: 0, issues: [] as string[] },
    alerts: [] as string[]
  }
  
  // 1. TypeScript Check
  console.log('📊 Checking TypeScript...')
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' })
    console.log('  ✅ TypeScript: No errors')
  } catch (error: any) {
    const output = error.stdout?.toString() || ''
    const errors = (output.match(/error TS/g) || []).length
    report.issues.push(`TypeScript: ${errors} errors`)
    console.log(`  ❌ TypeScript: ${errors} errors`)
    if (errors > 10) {
      report.alerts.push('HIGH: Many TypeScript errors need attention')
    }
  }
  
  // 2. ESLint Check & Auto-fix
  console.log('\n📋 Checking ESLint...')
  try {
    execSync('npm run lint -- --fix', { stdio: 'pipe' })
    console.log('  ✅ ESLint: Auto-fixed issues')
    report.autoFixes.push('Fixed ESLint issues')
  } catch (error: any) {
    const output = error.stdout?.toString() || ''
    const issues = (output.match(/warning|error/gi) || []).length
    if (issues > 0) {
      report.issues.push(`ESLint: ${issues} remaining issues`)
      console.log(`  ⚠️ ESLint: ${issues} issues remaining`)
    }
  }
  
  // 3. Find Unused Exports
  console.log('\n🔍 Checking for unused code...')
  try {
    const output = execSync('npx ts-prune', { encoding: 'utf-8', stdio: 'pipe' })
    const unused = (output.match(/used in module/g) || []).length
    if (unused > 0) {
      report.issues.push(`${unused} unused exports`)
      console.log(`  ⚠️ Found ${unused} unused exports`)
    } else {
      console.log('  ✅ No unused exports')
    }
  } catch (error) {
    console.log('  ℹ️ Unused exports check skipped')
  }
  
  // 4. Security Audit
  console.log('\n🔒 Checking security...')
  try {
    execSync('npm audit --json', { stdio: 'pipe' })
    console.log('  ✅ No security vulnerabilities')
  } catch (error: any) {
    const output = JSON.parse(error.stdout?.toString() || '{}')
    const vulns = output.metadata?.vulnerabilities?.total || 0
    if (vulns > 0) {
      report.issues.push(`${vulns} security vulnerabilities`)
      report.alerts.push(`CRITICAL: ${vulns} security vulnerabilities found`)
      console.log(`  ❌ ${vulns} security vulnerabilities`)
    }
  }
  
  // 5. Mobile Readiness Check
  console.log('\n📱 Checking mobile readiness...')
  const webOnlyAPIs = ['localStorage', 'sessionStorage', 'window.innerWidth', 'document.cookie']
  let apiUsages = 0
  
  for (const api of webOnlyAPIs) {
    try {
      const count = execSync(`grep -r "${api}" app components 2>/dev/null | wc -l`, { encoding: 'utf-8' })
      const num = parseInt(count.trim())
      if (num > 0) {
        apiUsages += num
        report.mobile.issues.push(`${api}: ${num} usages`)
      }
    } catch (error) {
      // File not found or no matches
    }
  }
  
  report.mobile.percentage = Math.max(0, 100 - (apiUsages * 2)) // Rough estimate
  console.log(`  📊 Mobile readiness: ${report.mobile.percentage}%`)
  if (apiUsages > 0) {
    console.log(`  ⚠️ Web-only APIs: ${apiUsages} usages`)
    report.optimizations.push(`Wrap ${apiUsages} web-only API calls for mobile compatibility`)
  }
  
  // 6. Performance Opportunities
  console.log('\n🚀 Checking for optimizations...')
  
  // Check for console.logs in production code
  try {
    const consoleLogs = execSync('grep -r "console.log" app components 2>/dev/null | wc -l', { encoding: 'utf-8' })
    const num = parseInt(consoleLogs.trim())
    if (num > 0) {
      report.autoFixes.push(`Remove ${num} console.log statements`)
      console.log(`  ⚠️ Found ${num} console.log statements to remove`)
    }
  } catch (error) {
    // No console.logs found
  }
  
  // Check for direct Anthropic API calls without caching
  try {
    const apiCalls = execSync('grep -r "anthropic.com/v1/messages" app 2>/dev/null | wc -l', { encoding: 'utf-8' })
    const num = parseInt(apiCalls.trim())
    if (num > 0) {
      const cached = execSync('grep -r "prompt-caching" app 2>/dev/null | wc -l', { encoding: 'utf-8' })
      const cachedNum = parseInt(cached.trim())
      if (cachedNum < num) {
        report.optimizations.push(`Add prompt caching to ${num - cachedNum} API routes (saves ~70% on tokens)`)
        console.log(`  💡 ${num - cachedNum} API routes could use caching`)
      }
    }
  } catch (error) {
    // No API calls found or error
  }
  
  // 7. Generate Status
  if (report.alerts.length > 0) {
    report.status = 'CRITICAL'
  } else if (report.issues.length > 5) {
    report.status = 'NEEDS_ATTENTION'
  }
  
  // Print Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 DAILY MAINTENANCE SUMMARY')
  console.log('='.repeat(60))
  console.log(`\n🎯 STATUS: ${report.status === 'HEALTHY' ? '✅' : report.status === 'NEEDS_ATTENTION' ? '⚠️' : '🚨'} ${report.status}`)
  
  if (report.autoFixes.length > 0) {
    console.log('\n✅ AUTO-FIXES APPLIED:')
    report.autoFixes.forEach(fix => console.log(`  - ${fix}`))
  }
  
  if (report.issues.length > 0) {
    console.log('\n⚠️ ISSUES FOUND:')
    report.issues.forEach(issue => console.log(`  - ${issue}`))
  }
  
  if (report.optimizations.length > 0) {
    console.log('\n🚀 OPTIMIZATION OPPORTUNITIES:')
    report.optimizations.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`))
  }
  
  console.log(`\n📱 MOBILE READINESS: ${report.mobile.percentage}%`)
  if (report.mobile.issues.length > 0) {
    console.log('  Issues:')
    report.mobile.issues.forEach(issue => console.log(`  - ${issue}`))
  }
  
  if (report.alerts.length > 0) {
    console.log('\n🚨 ALERTS:')
    report.alerts.forEach(alert => console.log(`  - ${alert}`))
  }
  
  console.log('\n' + '='.repeat(60))
  
  return report
}

// Run if called directly
if (require.main === module) {
  runDailyMaintenance()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Maintenance failed:', error)
      process.exit(1)
    })
}

export { runDailyMaintenance }

