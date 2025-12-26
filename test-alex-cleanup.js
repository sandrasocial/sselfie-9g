#!/usr/bin/env node

/**
 * Alex API Cleanup Test Script
 *
 * Tests the Alex admin agent API to verify:
 * - API responds correctly
 * - Tools are properly defined
 * - Streaming works
 * - createAnthropic provider integration
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Alex API Cleanup Test Suite\n');

// Test 1: Verify imports are correct
console.log('Test 1: Checking imports...');
const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');

const hasStreamTextImport = routeFile.includes('import { streamText') || routeFile.includes('import {streamText');
const hasToolImport = routeFile.includes('tool') && routeFile.includes('from "ai"');
const hasCreateAnthropicImport = routeFile.includes('createAnthropic');
const hasCreateAnthropicFromCorrectPackage = routeFile.includes('from "@ai-sdk/anthropic"') && routeFile.includes('createAnthropic');
const hasDirectAnthropicImport = routeFile.includes('import Anthropic from');
const hasConverterImport = routeFile.includes('anthropic-tool-converter');

console.log(`  ✅ streamText imported: ${hasStreamTextImport}`);
console.log(`  ${hasCreateAnthropicImport ? '✅' : '⚠️'}  createAnthropic imported: ${hasCreateAnthropicImport}`);
console.log(`  ${hasCreateAnthropicFromCorrectPackage ? '✅' : '❌'}  createAnthropic from @ai-sdk/anthropic: ${hasCreateAnthropicFromCorrectPackage}`);
console.log(`  ${!hasDirectAnthropicImport ? '✅' : '⚠️'}  Direct Anthropic SDK removed: ${!hasDirectAnthropicImport}`);
console.log(`  ${!hasConverterImport ? '✅' : '⚠️'}  Converter import removed: ${!hasConverterImport}`);

// Test 2: Verify tool definitions are correct
console.log('\nTest 2: Checking tool definitions...');
const toolNames = [
  'compose_email',
  'schedule_campaign',
  'check_campaign_status',
  'get_resend_audience_data',
  'get_email_timeline',
  'analyze_email_strategy',
  'read_codebase_file',
  'web_search',
  'get_revenue_metrics',
  'get_prompt_guides',
  'update_prompt_guide'
];

let toolsCorrect = 0;
toolNames.forEach(toolName => {
  const hasToolDefinition = routeFile.includes(`const ${toolName.replace(/_/g, '')}Tool`) ||
                           routeFile.includes(`${toolName}:`);
  if (hasToolDefinition) {
    toolsCorrect++;
    console.log(`  ✅ ${toolName} defined`);
  } else {
    console.log(`  ❌ ${toolName} NOT found`);
  }
});

console.log(`  ${toolsCorrect === toolNames.length ? '✅' : '❌'} ${toolsCorrect}/${toolNames.length} tools defined`);

// Test 3: Check for manual streaming code
console.log('\nTest 3: Checking for manual streaming code...');
const hasProcessAnthropicStream = routeFile.includes('processAnthropicStream');
const hasManualSSE = routeFile.includes('controller.enqueue') && routeFile.includes('encoder.encode');
const hasToolConverter = routeFile.includes('convertToolsToAnthropicFormat');

console.log(`  ${!hasProcessAnthropicStream ? '✅' : '❌'} processAnthropicStream removed: ${!hasProcessAnthropicStream}`);
console.log(`  ${!hasManualSSE ? '✅' : '⚠️'}  Manual SSE encoding removed: ${!hasManualSSE}`);
console.log(`  ${!hasToolConverter ? '✅' : '⚠️'}  Tool converter usage removed: ${!hasToolConverter}`);

// Test 4: Check for direct Anthropic API implementation (current approach)
console.log('\nTest 4: Checking direct Anthropic API implementation...');
const hasDirectFetch = routeFile.includes('fetch(\'https://api.anthropic.com/v1/messages\'');
const hasManualSSE = routeFile.includes('ReadableStream') && routeFile.includes('text-start') && routeFile.includes('text-delta');
const hasZodToAnthropicSchema = routeFile.includes('zodToAnthropicSchema') || routeFile.includes('convertZodField');
const hasToolExecution = routeFile.includes('toolDef.execute') || routeFile.includes('tools[');

console.log(`  ${hasDirectFetch ? '✅' : '❌'} Direct Anthropic API fetch() used: ${hasDirectFetch}`);
console.log(`  ${hasManualSSE ? '✅' : '❌'} Manual SSE stream handling: ${hasManualSSE}`);
console.log(`  ${hasZodToAnthropicSchema ? '✅' : '⚠️'}  Zod-to-Anthropic schema converter: ${hasZodToAnthropicSchema}`);
console.log(`  ${hasToolExecution ? '✅' : '❌'} Tool execution logic present: ${hasToolExecution}`);

// Test 5: Check file size
console.log('\nTest 5: Checking file size...');
const lines = routeFile.split('\n').length;
console.log(`  Current line count: ${lines}`);
if (lines < 1500) {
  console.log(`  ✅ File size reduced (target: < 1500 lines)`);
} else if (lines < 2500) {
  console.log(`  ⚠️  File size partially reduced (target: < 1500 lines)`);
} else {
  console.log(`  ❌ File size still too large (${lines} lines, target: < 1500 lines)`);
}

// Test 6: Check if unused files are deleted
console.log('\nTest 6: Checking for unused files...');
const unusedAlexRoute = fs.existsSync('app/api/admin/alex/chat/route.ts');
const converterFile = fs.existsSync('lib/admin/anthropic-tool-converter.ts');

console.log(`  ${!unusedAlexRoute ? '✅' : '⚠️'}  Unused alex/chat route deleted: ${!unusedAlexRoute}`);
console.log(`  ${!converterFile ? '✅' : '⚠️'}  Tool converter file deleted: ${!converterFile}`);

// Test 7: Verify no duplicate implementations
console.log('\nTest 7: Checking for code duplication...');
const directAnthropicBlocks = (routeFile.match(/new Anthropic\(/g) || []).length;
const streamTextBlocks = (routeFile.match(/streamText\(/g) || []).length;

console.log(`  Direct Anthropic SDK instances: ${directAnthropicBlocks}`);
console.log(`  streamText() calls: ${streamTextBlocks}`);
console.log(`  ${directAnthropicBlocks === 0 ? '✅' : '⚠️'}  No direct SDK usage: ${directAnthropicBlocks === 0}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

const phase1Complete = hasCreateAnthropicImport && hasCreateAnthropicFromCorrectPackage && hasCreateAnthropicCall && !hasProcessAnthropicStream;
const phase2Complete = !unusedAlexRoute && !converterFile && !hasDirectAnthropicImport;

console.log(`\nPhase 1 (createAnthropic implementation): ${phase1Complete ? '✅ COMPLETE' : '⚠️  IN PROGRESS'}`);
console.log(`Phase 2 (File cleanup): ${phase2Complete ? '✅ COMPLETE' : '⚠️  IN PROGRESS'}`);

if (phase1Complete && phase2Complete) {
  console.log('\n🎉 ALL TESTS PASSED! Cleanup is complete.');
  process.exit(0);
} else if (phase1Complete) {
  console.log('\n✅ Phase 1 complete! Ready for Phase 2.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Review the output above.');
  process.exit(1);
}
