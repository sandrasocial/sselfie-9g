#!/usr/bin/env node

/**
 * Test script to check Alex's completeness:
 * 1. Markdown rendering configuration
 * 2. Missing tools or capabilities
 * 3. System prompt completeness
 * 4. Context and knowledge gaps
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Alex Completeness & Markdown Issues\n');

let issues = [];
let warnings = [];
let recommendations = [];

// ==========================================
// 1. MARKDOWN RENDERING CONFIGURATION
// ==========================================
console.log('1️⃣  MARKDOWN RENDERING CONFIGURATION\n');

try {
  const chatComponent = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
  
  // Check ReactMarkdown usage
  const hasReactMarkdown = chatComponent.includes('ReactMarkdown');
  const hasProse = chatComponent.includes('prose');
  
  console.log(`   ${hasReactMarkdown ? '✅' : '❌'} ReactMarkdown imported and used`);
  console.log(`   ${hasProse ? '✅' : '❌'} Tailwind Typography (prose) classes applied`);
  
  // Check for markdown plugins
  const hasRemarkPlugins = chatComponent.includes('remarkPlugins') || chatComponent.includes('remark-');
  const hasRehypePlugins = chatComponent.includes('rehypePlugins') || chatComponent.includes('rehype-');
  const hasCustomComponents = chatComponent.includes('components:') || chatComponent.includes('components={{');
  
  console.log(`   ${hasRemarkPlugins ? '✅' : '⚠️ '} Remark plugins configured`);
  console.log(`   ${hasRehypePlugins ? '✅' : '⚠️ '} Rehype plugins configured`);
  console.log(`   ${hasCustomComponents ? '✅' : '⚠️ '} Custom markdown components configured`);
  
  if (!hasRemarkPlugins && !hasRehypePlugins && !hasCustomComponents) {
    warnings.push('ReactMarkdown is using default configuration - may not handle all markdown features properly');
    recommendations.push('Consider adding remark-gfm (GitHub Flavored Markdown) for better markdown support');
    recommendations.push('Add custom components for better styling of lists, headings, and code blocks');
  }
  
  // Check for markdown style conflicts
  const hasInlineStyles = chatComponent.match(/style=\{[^}]*markdown|markdown[^}]*\}/);
  const hasConflictingClasses = chatComponent.includes('prose') && chatComponent.includes('text-') && chatComponent.includes('max-w-');
  
  if (hasConflictingClasses) {
    warnings.push('Potential CSS class conflicts between prose and custom Tailwind classes');
  }
  
  // Check if markdown content is properly extracted
  const hasContentExtraction = chatComponent.includes('getMessageContent') || chatComponent.includes('message.content');
  console.log(`   ${hasContentExtraction ? '✅' : '❌'} Message content extraction logic present`);
  
} catch (error) {
  issues.push(`Failed to check markdown configuration: ${error.message}`);
}

// ==========================================
// 2. TOOLS & CAPABILITIES CHECK
// ==========================================
console.log('\n2️⃣  TOOLS & CAPABILITIES CHECK\n');

try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const requiredTools = [
    { name: 'compose_email', pattern: /composeEmailTool|compose_email/ },
    { name: 'schedule_campaign', pattern: /scheduleCampaignTool|schedule_campaign/ },
    { name: 'check_campaign_status', pattern: /checkCampaignStatusTool|check_campaign_status/ },
    { name: 'get_resend_audience_data', pattern: /getResendAudienceDataTool|get_resend_audience_data/ },
    { name: 'analyze_email_strategy', pattern: /analyzeEmailStrategyTool|analyze_email_strategy/ },
    { name: 'get_email_timeline', pattern: /getEmailTimelineTool|get_email_timeline/ },
  ];
  
  const foundTools = [];
  const missingTools = [];
  
  requiredTools.forEach(tool => {
    const found = tool.pattern.test(routeFile);
    console.log(`   ${found ? '✅' : '❌'} ${tool.name}`);
    if (found) {
      foundTools.push(tool.name);
    } else {
      missingTools.push(tool.name);
    }
  });
  
  if (missingTools.length > 0) {
    issues.push(`Missing tools: ${missingTools.join(', ')}`);
  }
  
  // Check tool descriptions
  const toolDescriptions = routeFile.match(/description:\s*`([^`]+)`/g) || [];
  const hasDetailedDescriptions = toolDescriptions.some(desc => desc.length > 100);
  
  console.log(`   ${hasDetailedDescriptions ? '✅' : '⚠️ '} Tool descriptions are detailed`);
  
  if (!hasDetailedDescriptions) {
    warnings.push('Some tool descriptions may be too brief - Alex might not understand when to use them');
  }
  
} catch (error) {
  issues.push(`Failed to check tools: ${error.message}`);
}

// ==========================================
// 3. SYSTEM PROMPT COMPLETENESS
// ==========================================
console.log('\n3️⃣  SYSTEM PROMPT COMPLETENESS\n');

try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const systemPromptMatch = routeFile.match(/const systemPrompt = `([\s\S]*?)`/);
  if (!systemPromptMatch) {
    issues.push('System prompt not found');
  } else {
    const systemPrompt = systemPromptMatch[1];
    const promptLength = systemPrompt.length;
    
    console.log(`   System prompt length: ${promptLength} characters`);
    
    // Check for key sections
    const keySections = [
      { name: 'Brand Identity', pattern: /BRAND IDENTITY|Brand Identity|SSELFIE BRAND/ },
      { name: 'Sandra\'s Story', pattern: /SANDRA.*STORY|Sandra.*story|completeContext/ },
      { name: 'Email Guidelines', pattern: /Email.*Guideline|Email.*Style|Email.*Standard/ },
      { name: 'Tool Instructions', pattern: /Tool|capabilities|Use this when/ },
      { name: 'Voice & Tone', pattern: /Voice|Tone|communicate|speak/ },
      { name: 'HTML Styling', pattern: /HTML|table-based|inline styles|SSELFIE.*color/ },
    ];
    
    keySections.forEach(section => {
      const found = section.pattern.test(systemPrompt);
      console.log(`   ${found ? '✅' : '❌'} ${section.name} section`);
      if (!found) {
        warnings.push(`Missing or unclear ${section.name} section in system prompt`);
      }
    });
    
    // Check for markdown formatting instructions
    const hasMarkdownInstructions = systemPrompt.includes('markdown') || systemPrompt.includes('**') || systemPrompt.includes('#');
    console.log(`   ${hasMarkdownInstructions ? '✅' : '⚠️ '} Markdown formatting guidance`);
    
    if (!hasMarkdownInstructions) {
      recommendations.push('Add explicit markdown formatting instructions to system prompt');
    }
    
    // Check for conflicting instructions
    const hasRawHtmlInstructions = systemPrompt.includes('[SHOW_EMAIL_PREVIEW]') || systemPrompt.includes('[EMAIL_PREVIEW:');
    if (hasRawHtmlInstructions) {
      issues.push('System prompt still contains raw HTML/JSON instructions (should be removed)');
    }
    
    // Check prompt structure
    const hasClearSections = (systemPrompt.match(/^##|^###|^\*\*/gm) || []).length > 5;
    console.log(`   ${hasClearSections ? '✅' : '⚠️ '} Clear section structure`);
    
  }
  
} catch (error) {
  issues.push(`Failed to check system prompt: ${error.message}`);
}

// ==========================================
// 4. CONTEXT & KNOWLEDGE GAPS
// ==========================================
console.log('\n4️⃣  CONTEXT & KNOWLEDGE GAPS\n');

try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  // Check if completeContext is loaded
  const hasCompleteContext = routeFile.includes('completeContext') || routeFile.includes('getCompleteAdminContext');
  console.log(`   ${hasCompleteContext ? '✅' : '❌'} Complete context loaded`);
  
  if (!hasCompleteContext) {
    issues.push('Complete admin context not loaded - Alex may be missing critical brand/story information');
  }
  
  // Check for Resend integration
  const hasResendIntegration = routeFile.includes('resend.') || routeFile.includes('Resend');
  console.log(`   ${hasResendIntegration ? '✅' : '❌'} Resend API integration`);
  
  // Check for database access
  const hasDatabaseAccess = routeFile.includes('sql`') || routeFile.includes('neon(');
  console.log(`   ${hasDatabaseAccess ? '✅' : '❌'} Database access configured`);
  
  // Check for image handling
  const hasImageHandling = routeFile.includes('imageUrls') || routeFile.includes('image');
  console.log(`   ${hasImageHandling ? '✅' : '⚠️ '} Image handling`);
  
  // Check for error handling
  const hasErrorHandling = (routeFile.match(/try\s*\{/g) || []).length > 5;
  console.log(`   ${hasErrorHandling ? '✅' : '⚠️ '} Error handling present`);
  
} catch (error) {
  issues.push(`Failed to check context: ${error.message}`);
}

// ==========================================
// 5. MARKDOWN STYLE CONFLICTS
// ==========================================
console.log('\n5️⃣  MARKDOWN STYLE CONFLICTS\n');

try {
  const chatComponent = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
  
  // Check for conflicting CSS classes
  const proseUsage = chatComponent.match(/prose[^"']*/g) || [];
  const customTextClasses = chatComponent.match(/text-(stone|gray|black|white)-\d+/g) || [];
  
  if (proseUsage.length > 0 && customTextClasses.length > 5) {
    warnings.push('Potential conflict: prose classes may override custom text color classes');
    console.log('   ⚠️  Potential class conflicts detected');
  } else {
    console.log('   ✅ No obvious class conflicts');
  }
  
  // Check if markdown is properly scoped
  const hasScopedMarkdown = chatComponent.includes('prose') && chatComponent.includes('max-w-none');
  console.log(`   ${hasScopedMarkdown ? '✅' : '⚠️ '} Markdown properly scoped`);
  
  // Check for list styling
  const hasListStyling = chatComponent.includes('prose-ul') || chatComponent.includes('prose-ol') || chatComponent.includes('prose-li');
  console.log(`   ${hasListStyling ? '✅' : '⚠️ '} List styling configured`);
  
} catch (error) {
  warnings.push(`Failed to check markdown conflicts: ${error.message}`);
}

// ==========================================
// SUMMARY
// ==========================================
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY\n');

if (issues.length === 0 && warnings.length === 0 && recommendations.length === 0) {
  console.log('✅ All checks passed! Alex appears to be complete and properly configured.\n');
  process.exit(0);
}

if (issues.length > 0) {
  console.log('❌ CRITICAL ISSUES:');
  issues.forEach((issue, idx) => {
    console.log(`   ${idx + 1}. ${issue}`);
  });
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach((warning, idx) => {
    console.log(`   ${idx + 1}. ${warning}`);
  });
  console.log('');
}

if (recommendations.length > 0) {
  console.log('💡 RECOMMENDATIONS:');
  recommendations.forEach((rec, idx) => {
    console.log(`   ${idx + 1}. ${rec}`);
  });
  console.log('');
}

process.exit(issues.length > 0 ? 1 : 0);





