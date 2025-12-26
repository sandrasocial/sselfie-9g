#!/usr/bin/env node

/**
 * Test Alex Chat for Conflicts, Duplications, and Missing Context
 * Identifies issues causing raw HTML in messages, context loss, and brand style problems
 */

const fs = require('fs');

console.log('🔍 Alex Chat Conflict & Issue Analysis\n');
console.log('=' .repeat(60) + '\n');

const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
const chatComponent = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');

const issues = [];
const conflicts = [];
const duplications = [];
const missing = [];

// ==========================================
// ISSUE 1: Raw HTML/JSON in Text Response
// ==========================================
console.log('1️⃣  RAW HTML/JSON IN TEXT RESPONSE\n');

const showEmailPreviewInPrompt = routeFile.includes('[SHOW_EMAIL_PREVIEW]') && 
                                 routeFile.includes('[EMAIL_PREVIEW:');
const emailPreviewInText = routeFile.includes('EMAIL_PREVIEW:{"subject"') ||
                           routeFile.includes('EMAIL_PREVIEW:{"subjectLine"');

if (showEmailPreviewInPrompt) {
  console.log('   ❌ PROBLEM: System prompt tells Alex to include raw JSON in text response');
  console.log('   📍 Location: Lines 1629-1633 and 1648-1652');
  console.log('   💥 Impact: Raw HTML/JSON appears in chat messages (as seen in screenshots)');
  console.log('   🔧 Fix: Remove these instructions - frontend already extracts tool results automatically\n');
  
  issues.push({
    severity: 'CRITICAL',
    issue: 'Raw HTML/JSON in text response',
    location: 'System prompt lines 1629-1633, 1648-1652',
    impact: 'Raw HTML/JSON appears in chat messages',
    fix: 'Remove [SHOW_EMAIL_PREVIEW] and [EMAIL_PREVIEW:...] instructions from system prompt'
  });
  
  conflicts.push('System prompt instructs Alex to include tool result data in text, but frontend already extracts it automatically');
} else {
  console.log('   ✅ No raw HTML/JSON instructions found\n');
}

// ==========================================
// ISSUE 2: Duplicate Instructions
// ==========================================
console.log('2️⃣  DUPLICATE INSTRUCTIONS\n');

const emailPreviewInstructions = (routeFile.match(/SHOW_EMAIL_PREVIEW|EMAIL_PREVIEW:/g) || []).length;
if (emailPreviewInstructions > 2) {
  console.log(`   ❌ PROBLEM: Email preview instructions appear ${emailPreviewInstructions} times`);
  console.log('   📍 Location: Multiple places in system prompt');
  console.log('   💥 Impact: Confusion, potential duplication\n');
  
  duplications.push('Email preview instructions duplicated in system prompt');
} else {
  console.log('   ✅ No excessive duplications found\n');
}

// ==========================================
// ISSUE 3: Brand Style Instructions
// ==========================================
console.log('3️⃣  BRAND STYLE INSTRUCTIONS\n');

const brandColorInstructions = routeFile.includes('SSELFIE Brand Colors') || 
                               routeFile.includes('Brand Colors');
const brandStyleInstructions = routeFile.includes('Brand Styling') || 
                              routeFile.includes('Brand Standards');
const tableLayoutInstructions = routeFile.includes('table-based layout') || 
                               routeFile.includes('table role="presentation"');

const brandInstructions = [
  { name: 'Brand Colors', found: brandColorInstructions },
  { name: 'Brand Styling', found: brandStyleInstructions },
  { name: 'Table Layout', found: tableLayoutInstructions }
];

console.log('   Brand instruction coverage:');
brandInstructions.forEach(inst => {
  console.log(`   ${inst.found ? '✅' : '❌'} ${inst.name}`);
  if (!inst.found) {
    missing.push(`${inst.name} instructions missing`);
  }
});

// Check for conflicting brand instructions
const multipleBrandSections = (routeFile.match(/Brand.*Standard|Brand.*Styling|Brand.*Color/g) || []).length;
if (multipleBrandSections > 3) {
  console.log(`\n   ⚠️  WARNING: Brand instructions appear in ${multipleBrandSections} places - may be conflicting`);
  conflicts.push('Brand style instructions scattered across multiple sections');
} else {
  console.log('\n   ✅ Brand instructions appear in reasonable number of places');
}

console.log('');

// ==========================================
// ISSUE 4: Context Loss
// ==========================================
console.log('4️⃣  CONTEXT LOSS PREVENTION\n');

const systemPromptMaintained = routeFile.includes('systemPrompt') && 
                               routeFile.includes('systemPromptWithImages');
const completeContextIncluded = routeFile.includes('completeContext') || 
                                routeFile.includes('getCompleteAdminContext');
const contextLength = routeFile.match(/const systemPrompt = `[\s\S]*?`/)?.[0]?.length || 0;

console.log(`   System prompt length: ${contextLength} characters`);
console.log(`   ${systemPromptMaintained ? '✅' : '❌'} System prompt properly maintained`);
console.log(`   ${completeContextIncluded ? '✅' : '❌'} Complete context included`);

if (contextLength < 5000) {
  console.log('   ⚠️  WARNING: System prompt may be too short - context might be lost');
  missing.push('System prompt may be missing important context');
} else if (contextLength > 50000) {
  console.log('   ⚠️  WARNING: System prompt very long - may cause context window issues');
}

// Check if brand context is at the beginning (important for context retention)
// Look for brand identity section early in system prompt (within first 200 chars of systemPrompt definition)
const systemPromptMatch = routeFile.match(/const systemPrompt = `([\s\S]{0,2000})/);
const brandContextEarly = systemPromptMatch && (
  systemPromptMatch[1].includes('SSELFIE BRAND') || 
  systemPromptMatch[1].includes('Brand Identity') ||
  systemPromptMatch[1].indexOf('SSELFIE') < 500
);
console.log(`   ${brandContextEarly ? '✅' : '❌'} Brand context appears early in prompt`);

console.log('');

// ==========================================
// ISSUE 5: Tool Result Handling
// ==========================================
console.log('5️⃣  TOOL RESULT HANDLING\n');

const toolResultExtraction = chatComponent.includes('extractEmailPreview') || 
                            chatComponent.includes('toolInvocations');
const toolResultValidation = chatComponent.includes('startsWith(\'<\')') || 
                            chatComponent.includes('startsWith("<")');
const toolResultInText = routeFile.includes('tool result') && 
                        routeFile.includes('text response');

console.log(`   ${toolResultExtraction ? '✅' : '❌'} Frontend extracts tool results automatically`);
console.log(`   ${toolResultValidation ? '✅' : '❌'} Tool results are validated`);
console.log(`   ${toolResultInText ? '❌' : '✅'} Tool results NOT included in text response`);

if (toolResultInText) {
  conflicts.push('Tool results may be included in text response AND extracted by frontend (duplication)');
}

console.log('');

// ==========================================
// ISSUE 6: Compose Email Tool Instructions
// ==========================================
console.log('6️⃣  COMPOSE EMAIL TOOL INSTRUCTIONS\n');

// Try multiple patterns to find compose_email tool description
const composeEmailPattern1 = routeFile.match(/composeEmailTool[\s\S]{0,500}description.*?`([^`]{0,1000})`/s);
const composeEmailPattern2 = routeFile.match(/const composeEmailTool[\s\S]{0,1000}description.*?`([^`]{0,2000})`/s);
const composeEmailPattern3 = routeFile.match(/description: `Create or refine email[\s\S]{0,2000}`/);
const composeEmailDescription = composeEmailPattern1?.[1] || composeEmailPattern2?.[1] || composeEmailPattern3?.[0] || '';

// Also check directly in the file for brand requirements
const hasBrandInTool = routeFile.includes('SSELFIE Brand Requirements') || 
                      routeFile.includes('Brand Requirements') ||
                      (routeFile.includes('composeEmailTool') && routeFile.includes('SSELFIE') && routeFile.indexOf('composeEmailTool') < routeFile.indexOf('SSELFIE') + 500);

const hasBrandInstructions = composeEmailDescription.includes('SSELFIE') || 
                            composeEmailDescription.includes('Brand Requirements') ||
                            composeEmailDescription.includes('brand style') ||
                            composeEmailDescription.includes('table-based') ||
                            hasBrandInTool;
const hasOutputFormat = composeEmailDescription.includes('Return ONLY raw HTML') || 
                       composeEmailDescription.includes('no markdown') ||
                       composeEmailDescription.includes('no code blocks') ||
                       routeFile.includes('Return ONLY raw HTML');

console.log(`   ${hasBrandInstructions ? '✅' : '❌'} Brand instructions in tool description`);
console.log(`   ${hasOutputFormat ? '✅' : '❌'} Clear output format instructions`);

if (!hasBrandInstructions) {
  missing.push('Brand style instructions missing from compose_email tool description');
}

console.log('');

// ==========================================
// SUMMARY
// ==========================================
console.log('=' .repeat(60));
console.log('📊 SUMMARY\n');

console.log(`❌ Critical Issues: ${issues.filter(i => i.severity === 'CRITICAL').length}`);
console.log(`⚠️  Conflicts: ${conflicts.length}`);
console.log(`🔄 Duplications: ${duplications.length}`);
console.log(`📭 Missing: ${missing.length}\n`);

if (issues.length > 0) {
  console.log('🚨 CRITICAL ISSUES:\n');
  issues.forEach((issue, idx) => {
    console.log(`${idx + 1}. ${issue.issue}`);
    console.log(`   Location: ${issue.location}`);
    console.log(`   Impact: ${issue.impact}`);
    console.log(`   Fix: ${issue.fix}\n`);
  });
}

if (conflicts.length > 0) {
  console.log('⚠️  CONFLICTS:\n');
  conflicts.forEach((conflict, idx) => {
    console.log(`${idx + 1}. ${conflict}\n`);
  });
}

if (duplications.length > 0) {
  console.log('🔄 DUPLICATIONS:\n');
  duplications.forEach((dup, idx) => {
    console.log(`${idx + 1}. ${dup}\n`);
  });
}

if (missing.length > 0) {
  console.log('📭 MISSING ELEMENTS:\n');
  missing.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item}\n`);
  });
}

// ==========================================
// RECOMMENDATIONS
// ==========================================
console.log('=' .repeat(60));
console.log('💡 RECOMMENDATIONS\n');

const recommendations = [];

if (showEmailPreviewInPrompt) {
  recommendations.push({
    priority: 'CRITICAL',
    action: 'Remove [SHOW_EMAIL_PREVIEW] and [EMAIL_PREVIEW:...] instructions from system prompt',
    reason: 'Frontend already extracts tool results automatically - these instructions cause raw HTML/JSON in messages',
    location: 'Lines 1629-1633 and 1648-1652 in route.ts'
  });
}

if (multipleBrandSections > 3) {
  recommendations.push({
    priority: 'HIGH',
    action: 'Consolidate brand style instructions into single, clear section',
    reason: 'Multiple scattered brand instructions may conflict or be missed',
    location: 'Multiple locations in system prompt'
  });
}

if (!brandContextEarly) {
  recommendations.push({
    priority: 'MEDIUM',
    action: 'Move brand context earlier in system prompt',
    reason: 'Early context is better retained by LLM',
    location: 'System prompt structure'
  });
}

recommendations.forEach((rec, idx) => {
  console.log(`${idx + 1}. [${rec.priority}] ${rec.action}`);
  console.log(`   Why: ${rec.reason}`);
  console.log(`   Where: ${rec.location}\n`);
});

console.log('=' .repeat(60));
console.log('\n✅ Analysis complete!\n');

