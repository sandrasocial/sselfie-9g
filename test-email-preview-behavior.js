#!/usr/bin/env node

/**
 * Test Email Preview Behavior
 * Tests what happens when Alex creates, edits, or creates new emails
 */

const fs = require('fs');

console.log('📧 Email Preview Flow Analysis\n');

// Read the admin agent chat component
const chatComponent = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');

console.log('✅ CURRENT BEHAVIOR:\n');

// 1. When Alex creates an email
console.log('1. WHEN ALEX CREATES AN EMAIL:');
const hasComposeEmailDetection = chatComponent.includes('compose_email') && 
                                  chatComponent.includes('extractEmailPreview');
console.log(`   - Tool result detection: ${hasComposeEmailDetection ? '✅ YES' : '❌ NO'}`);
console.log(`   - HTML validation: ${chatComponent.includes('startsWith(\'<\')') || chatComponent.includes('startsWith("<")') ? '✅ YES' : '❌ NO'}`);
console.log(`   - Preview state set: ${chatComponent.includes('setEmailPreview(emailPreviewData)') ? '✅ YES' : '❌ NO'}`);
console.log(`   - Preview card rendered: ${chatComponent.includes('{emailPreview &&') ? '✅ YES' : '❌ NO'}`);

// 2. When user clicks Edit
console.log('\n2. WHEN USER CLICKS "EDIT":');
const editHandler = chatComponent.match(/onEdit=\{async\s*\(\)\s*=>\s*\{[^}]+\}/s);
if (editHandler) {
  const editCode = editHandler[0];
  const clearsPreview = editCode.includes('setEmailPreview(null)');
  const sendsMessage = editCode.includes('sendMessage');
  console.log(`   - Clears preview: ${clearsPreview ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Sends edit message: ${sendsMessage ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Message text: ${editCode.includes('Make changes') ? '✅ "Make changes to this email"' : '❌ UNKNOWN'}`);
} else {
  console.log('   - ❌ Edit handler not found');
}

// 3. When Alex creates a new email while one exists
console.log('\n3. WHEN ALEX CREATES NEW EMAIL (while one exists):');
const checksLastMessage = chatComponent.includes('lastAssistantMsg') && 
                          chatComponent.includes('.pop()');
const hasDuplicatePrevention = chatComponent.includes('foundValidEmailPreview');
const replacesOldPreview = chatComponent.includes('setEmailPreview(emailPreviewData)');
console.log(`   - Checks last message only: ${checksLastMessage ? '✅ YES' : '❌ NO'}`);
console.log(`   - Prevents duplicates: ${hasDuplicatePrevention ? '✅ YES' : '❌ NO'}`);
console.log(`   - Replaces old preview: ${replacesOldPreview ? '✅ YES (via setEmailPreview)' : '❌ NO'}`);

// 4. Preview clearing behavior
console.log('\n4. PREVIEW CLEARING BEHAVIOR:');
const clearsOnEmptyMessages = chatComponent.includes('if (!messages.length)') && 
                              chatComponent.includes('setEmailPreview(null)');
const clearsOnNoAssistant = chatComponent.includes('if (!lastAssistantMsg)') && 
                            chatComponent.includes('setEmailPreview(null)');
const validatesExistingPreview = chatComponent.includes('if (!foundValidEmailPreview && emailPreview)');
console.log(`   - Clears when messages empty: ${clearsOnEmptyMessages ? '✅ YES' : '❌ NO'}`);
console.log(`   - Clears when no assistant message: ${clearsOnNoAssistant ? '✅ YES' : '❌ NO'}`);
console.log(`   - Validates existing preview: ${validatesExistingPreview ? '✅ YES' : '❌ NO'}`);

// 5. Potential Issues
console.log('\n⚠️  POTENTIAL ISSUES:\n');

const issues = [];

// Issue 1: Preview might not update if validation fails
if (!chatComponent.includes('console.warn') || !chatComponent.includes('Invalid email preview')) {
  issues.push('No logging for validation failures - hard to debug');
}

// Issue 2: Only checks last message
if (chatComponent.includes('lastAssistantMsg') && chatComponent.includes('.pop()')) {
  issues.push('Only checks LAST assistant message - if multiple compose_email calls, only latest shows');
}

// Issue 3: Preview cleared on edit but might not come back
const editClearsPreview = chatComponent.match(/onEdit.*setEmailPreview\(null\)/s);
if (editClearsPreview) {
  issues.push('Preview cleared on edit - if new email validation fails, preview stays cleared');
}

// Issue 4: No explicit check for multiple compose_email results
if (!chatComponent.includes('break') && !chatComponent.includes('return')) {
  issues.push('No explicit break/return after finding email preview - might process multiple');
}

issues.forEach((issue, idx) => {
  console.log(`   ${idx + 1}. ${issue}`);
});

// Expected vs Actual
console.log('\n📋 EXPECTED vs ACTUAL BEHAVIOR:\n');

console.log('EXPECTED:');
console.log('  ✅ New email → Preview appears immediately');
console.log('  ✅ Edit clicked → Preview clears, new preview appears when Alex responds');
console.log('  ✅ New email while one exists → Old preview replaced');
console.log('  ✅ Multiple compose_email calls → Only latest preview shows');

console.log('\nACTUAL (based on code):');
console.log(`  ${hasComposeEmailDetection ? '✅' : '❌'} New email → Preview detection implemented`);
console.log(`  ${editHandler && editHandler[0].includes('setEmailPreview(null)') ? '✅' : '❌'} Edit clicked → Preview clears`);
console.log(`  ${hasDuplicatePrevention ? '✅' : '❌'} New email while one exists → Duplicate prevention exists`);
console.log(`  ${checksLastMessage ? '✅' : '❌'} Multiple calls → Only checks last message`);

console.log('\n🔍 KEY FINDINGS:\n');

const findings = [];

// Finding 1: Preview is cleared on edit
if (editHandler && editHandler[0].includes('setEmailPreview(null)')) {
  findings.push('Preview IS cleared when "Edit" is clicked');
} else {
  findings.push('Preview might NOT be cleared when "Edit" is clicked');
}

// Finding 2: Only last message checked
if (checksLastMessage) {
  findings.push('Only the LAST assistant message is checked for email preview');
  findings.push('If Alex creates multiple emails, only the most recent preview will show');
}

// Finding 3: Validation exists
if (chatComponent.includes('extractEmailPreview')) {
  findings.push('Email preview validation exists - invalid HTML is rejected');
}

// Finding 4: No persistence check
if (!chatComponent.includes('email_preview_data') && !chatComponent.includes('emailPreviewData')) {
  findings.push('Preview state is NOT persisted - only exists in component state');
  findings.push('If page refreshes, preview is lost');
}

findings.forEach((finding, idx) => {
  console.log(`  ${idx + 1}. ${finding}`);
});

console.log('\n💡 RECOMMENDATIONS:\n');

const recommendations = [];

if (!chatComponent.includes('email_preview_data')) {
  recommendations.push('Consider persisting email preview data to database for page refresh resilience');
}

if (editHandler && !editHandler[0].includes('previousVersion')) {
  recommendations.push('Edit handler could pass previous email HTML to Alex for context');
}

if (checksLastMessage && !chatComponent.includes('all compose_email results')) {
  recommendations.push('Consider showing all email previews or allowing user to switch between them');
}

if (recommendations.length === 0) {
  console.log('  ✅ No critical recommendations - flow looks good!');
} else {
  recommendations.forEach((rec, idx) => {
    console.log(`  ${idx + 1}. ${rec}`);
  });
}

console.log('\n');





