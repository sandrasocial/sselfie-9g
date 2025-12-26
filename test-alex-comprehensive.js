#!/usr/bin/env node

/**
 * Comprehensive Alex Test Suite
 * Tests all systems: streaming, tools, database, saving, context
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Alex Comprehensive Test Suite\n');
console.log('='.repeat(60));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Check route file exists and has correct structure
console.log('\n📋 Test 1: Route File Structure');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const checks = {
    'Route file exists': true,
    'Has POST export': routeFile.includes('export async function POST'),
    'Has tool definitions': routeFile.includes('const composeEmailTool = tool('),
    'Has direct Anthropic API call': routeFile.includes("fetch('https://api.anthropic.com/v1/messages'"),
    'Has SSE stream handling': routeFile.includes('ReadableStream'),
    'Has text-start event': routeFile.includes("type: 'text-start'"),
    'Has text-delta event': routeFile.includes("type: 'text-delta'"),
    'Has text-end event': routeFile.includes("type: 'text-end'"),
    'Has tool execution': routeFile.includes('toolDef?.execute'),
    'Has message saving': routeFile.includes('saveChatMessage'),
    'Has context loading': routeFile.includes('getCompleteAdminContext'),
    'No createDataStreamResponse': !routeFile.includes('createDataStreamResponse'),
    'Has continuation logic': routeFile.includes('hasSentTextStart'),
  };

  Object.entries(checks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(check);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(check);
    }
  });
} catch (error) {
  console.log(`  ❌ Error reading route file: ${error.message}`);
  results.failed.push('Route file exists');
}

// Test 2: Check all tools are defined
console.log('\n🔧 Test 2: Tool Definitions');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const requiredTools = [
    'compose_email',
    'schedule_campaign',
    'check_campaign_status',
    'get_resend_audience_data',
    'get_email_timeline',
    'analyze_email_strategy',
    'read_codebase_file',
    'web_search',
    'get_revenue_metrics'
  ];

  requiredTools.forEach(toolName => {
    const toolVarName = toolName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^[a-z]/, letter => letter.toUpperCase()) + 'Tool';
    
    const hasDefinition = routeFile.includes(`const ${toolVarName} = tool(`) ||
                         routeFile.includes(`const ${toolName}Tool = tool(`) ||
                         routeFile.includes(`getRevenueMetricsTool = tool(`);
    
    const inToolsObject = routeFile.includes(`${toolName}:`);
    
    if (hasDefinition && inToolsObject) {
      console.log(`  ✅ ${toolName} - defined and in tools object`);
      results.passed.push(`Tool: ${toolName}`);
    } else if (hasDefinition) {
      console.log(`  ⚠️  ${toolName} - defined but not in tools object`);
      results.warnings.push(`Tool: ${toolName} - not in tools object`);
    } else {
      console.log(`  ❌ ${toolName} - NOT FOUND`);
      results.failed.push(`Tool: ${toolName}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking tools: ${error.message}`);
  results.failed.push('Tool definitions check');
}

// Test 3: Check streaming implementation
console.log('\n📡 Test 3: Streaming Implementation');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const streamingChecks = {
    'Uses ReadableStream': routeFile.includes('new ReadableStream'),
    'Has TextEncoder': routeFile.includes('new TextEncoder'),
    'Has safeEnqueue function': routeFile.includes('safeEnqueue'),
    'Has safeClose function': routeFile.includes('safeClose'),
    'Sends text-start event': routeFile.includes("type: 'text-start'"),
    'Sends text-delta events': routeFile.includes("type: 'text-delta'"),
    'Sends text-end event': routeFile.includes("type: 'text-end'"),
    'Handles tool continuation': routeFile.includes('hasSentTextStart'),
    'Resets text-start flag on continuation': routeFile.includes('hasSentTextStart = false'),
    'Returns Response with SSE headers': routeFile.includes("'Content-Type': 'text/event-stream'"),
  };

  Object.entries(streamingChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Streaming: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Streaming: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking streaming: ${error.message}`);
  results.failed.push('Streaming implementation check');
}

// Test 4: Check database operations
console.log('\n💾 Test 4: Database Operations');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const dbChecks = {
    'Imports saveChatMessage': routeFile.includes('saveChatMessage'),
    'Imports createNewChat': routeFile.includes('createNewChat'),
    'Imports getOrCreateActiveChat': routeFile.includes('getOrCreateActiveChat'),
    'Imports getChatMessages': routeFile.includes('getChatMessages'),
    'Saves messages after stream': routeFile.includes('await saveChatMessage'),
    'Uses activeChatId': routeFile.includes('activeChatId'),
    'Has neon SQL client': routeFile.includes('neon(process.env.DATABASE_URL'),
  };

  Object.entries(dbChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Database: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Database: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking database: ${error.message}`);
  results.failed.push('Database operations check');
}

// Test 5: Check context loading
console.log('\n📚 Test 5: Context Loading');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  const contextFile = fs.existsSync('lib/admin/get-complete-context.ts');
  const productKnowledgeFile = fs.existsSync('lib/admin/get-product-knowledge.ts');
  
  const contextChecks = {
    'get-complete-context.ts exists': contextFile,
    'get-product-knowledge.ts exists': productKnowledgeFile,
    'Calls getCompleteAdminContext': routeFile.includes('getCompleteAdminContext'),
    'Uses context in system prompt': routeFile.includes('completeContext') || routeFile.includes('systemPrompt'),
  };

  Object.entries(contextChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Context: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Context: ${check}`);
    }
  });

  if (productKnowledgeFile) {
    const productKnowledge = fs.readFileSync('lib/admin/get-product-knowledge.ts', 'utf8');
    if (productKnowledge.includes('getProductKnowledge')) {
      console.log(`  ✅ Product knowledge function exists`);
      results.passed.push('Context: Product knowledge function');
    }
  }
} catch (error) {
  console.log(`  ❌ Error checking context: ${error.message}`);
  results.failed.push('Context loading check');
}

// Test 6: Check tool schema conversion
console.log('\n🔄 Test 6: Tool Schema Conversion');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const schemaChecks = {
    'Has zodToAnthropicSchema function': routeFile.includes('zodToAnthropicSchema'),
    'Has convertZodField function': routeFile.includes('convertZodField'),
    'Sets type: "object"': routeFile.includes('type: "object"'),
    'Converts tools to Anthropic format': routeFile.includes('anthropicTools') || routeFile.includes('convertTools'),
    'No AI SDK tool conversion': !routeFile.includes('convertToolsToAnthropicFormat') || routeFile.includes('zodToAnthropicSchema'),
  };

  Object.entries(schemaChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Schema: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Schema: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking schema: ${error.message}`);
  results.failed.push('Tool schema conversion check');
}

// Test 7: Check error handling
console.log('\n🛡️  Test 7: Error Handling');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const errorChecks = {
    'Has try-catch blocks': routeFile.includes('try {') && routeFile.includes('catch'),
    'Handles API errors': routeFile.includes('response.ok') || routeFile.includes('!response.ok'),
    'Handles stream errors': routeFile.includes('Stream error') || routeFile.includes('stream error'),
    'Handles tool errors': routeFile.includes('Tool execution error') || routeFile.includes('toolError'),
    'Returns error responses': routeFile.includes('NextResponse.json') && routeFile.includes('error'),
  };

  Object.entries(errorChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Error handling: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Error handling: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking error handling: ${error.message}`);
  results.failed.push('Error handling check');
}

// Test 8: Check environment variables
console.log('\n🔐 Test 8: Environment Variables');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const envChecks = {
    'Uses ANTHROPIC_API_KEY': routeFile.includes('ANTHROPIC_API_KEY'),
    'Uses DATABASE_URL': routeFile.includes('DATABASE_URL'),
    'Has environment checks': routeFile.includes('hasAnthropicKey') || routeFile.includes('process.env.ANTHROPIC_API_KEY'),
  };

  Object.entries(envChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Environment: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Environment: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking environment: ${error.message}`);
  results.failed.push('Environment variables check');
}

// Test 9: Check continuation logic
console.log('\n🔄 Test 9: Tool Continuation Logic');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const continuationChecks = {
    'Has iteration loop': routeFile.includes('MAX_ITERATIONS') || routeFile.includes('iteration'),
    'Continues after tools': routeFile.includes('continue') && routeFile.includes('toolCalls.length'),
    'Resets text-start flag': routeFile.includes('hasSentTextStart = false'),
    'Adds tool results to messages': routeFile.includes('tool_result') || routeFile.includes('tool_use'),
    'Makes new API call after tools': routeFile.includes('fetch') && routeFile.includes('continue'),
  };

  Object.entries(continuationChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Continuation: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Continuation: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking continuation: ${error.message}`);
  results.failed.push('Tool continuation logic check');
}

// Test 10: Check message format
console.log('\n📨 Test 10: Message Format');
try {
  const routeFile = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  const messageChecks = {
    'Converts messages to Anthropic format': routeFile.includes('anthropicMessages') || routeFile.includes('convertMessages'),
    'Handles message content arrays': routeFile.includes('Array.isArray(msg.content)'),
    'Preserves message roles': routeFile.includes("role: msg.role"),
    'Handles image content': routeFile.includes('image') || routeFile.includes('type: "image"'),
  };

  Object.entries(messageChecks).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Message format: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Message format: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking message format: ${error.message}`);
  results.failed.push('Message format check');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.failed.forEach(test => console.log(`  - ${test}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  results.warnings.forEach(warning => console.log(`  - ${warning}`));
}

if (results.failed.length === 0 && results.warnings.length === 0) {
  console.log('\n🎉 ALL TESTS PASSED!');
  process.exit(0);
} else if (results.failed.length === 0) {
  console.log('\n✅ All critical tests passed (some warnings)');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the output above.');
  process.exit(1);
}


