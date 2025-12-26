#!/usr/bin/env node

/**
 * Alex Runtime Test - Tests actual API calls and streaming
 * Requires: Server running on localhost:3000
 */

const http = require('http');

console.log('🧪 Alex Runtime Test Suite\n');
console.log('='.repeat(60));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'ssa@ssasocial.com'; // You'll need to provide actual auth token

// Helper to make API request
function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test 1: Check if server is running
console.log('\n🌐 Test 1: Server Availability');
makeRequest('/')
  .then(response => {
    if (response.status === 200 || response.status === 404) {
      console.log('  ✅ Server is running');
      results.passed.push('Server running');
    } else {
      console.log(`  ⚠️  Server returned status: ${response.status}`);
      results.warnings.push(`Server status: ${response.status}`);
    }
  })
  .catch(error => {
    console.log(`  ❌ Server not accessible: ${error.message}`);
    console.log('  ⚠️  Make sure dev server is running on localhost:3000');
    results.failed.push('Server not accessible');
  });

// Test 2: Check route exists
console.log('\n📍 Test 2: Route Existence');
makeRequest('/api/admin/agent/chat', 'POST', { messages: [] })
  .then(response => {
    if (response.status === 401 || response.status === 403) {
      console.log('  ✅ Route exists (auth required)');
      results.passed.push('Route exists');
    } else if (response.status === 400) {
      console.log('  ✅ Route exists (validation error)');
      results.passed.push('Route exists');
    } else {
      console.log(`  ⚠️  Unexpected status: ${response.status}`);
      results.warnings.push(`Route status: ${response.status}`);
    }
  })
  .catch(error => {
    console.log(`  ❌ Route check failed: ${error.message}`);
    results.failed.push('Route check');
  });

// Test 3: Check streaming response format
console.log('\n📡 Test 3: Streaming Response Format');
console.log('  ⚠️  This test requires authentication');
console.log('  ℹ️  Manual test: Send a message to Alex and check:');
console.log('     - Stream starts with text-start event');
console.log('     - Text deltas are sent as text-delta events');
console.log('     - Stream ends with text-end event');
console.log('     - After tool execution, new text-start is sent');
results.warnings.push('Streaming format - requires manual testing');

// Test 4: Check tool execution flow
console.log('\n🔧 Test 4: Tool Execution Flow');
console.log('  ⚠️  This test requires authentication');
console.log('  ℹ️  Manual test: Ask Alex to use a tool and check:');
console.log('     - Tool is executed');
console.log('     - Tool result is added to conversation');
console.log('     - New API call is made with tool results');
console.log('     - Streaming continues after tool execution');
results.warnings.push('Tool execution - requires manual testing');

// Test 5: Check database operations
console.log('\n💾 Test 5: Database Operations');
console.log('  ⚠️  This test requires authentication');
console.log('  ℹ️  Manual test: Check database after conversation:');
console.log('     - Messages are saved to admin_agent_chats table');
console.log('     - Messages are saved to admin_agent_chat_messages table');
console.log('     - Email preview data is saved if compose_email is used');
results.warnings.push('Database operations - requires manual testing');

// Test 6: Check context loading
console.log('\n📚 Test 6: Context Loading');
try {
  const fs = require('fs');
  const contextFile = fs.readFileSync('lib/admin/get-complete-context.ts', 'utf8');
  const productKnowledgeFile = fs.readFileSync('lib/admin/get-product-knowledge.ts', 'utf8');
  
  if (contextFile.includes('getProductKnowledge')) {
    console.log('  ✅ Product knowledge is integrated');
    results.passed.push('Product knowledge integrated');
  }
  
  if (contextFile.includes('getCompleteAdminContext')) {
    console.log('  ✅ Context function exists');
    results.passed.push('Context function exists');
  }
} catch (error) {
  console.log(`  ❌ Error checking context files: ${error.message}`);
  results.failed.push('Context file check');
}

// Test 7: Check for common issues
console.log('\n🔍 Test 7: Common Issues Check');
try {
  const routeFile = require('fs').readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
  
  // Check for potential issues
  const issues = {
    'No duplicate accumulatedText': (routeFile.match(/let accumulatedText/g) || []).length <= 1,
    'Has proper stream closing': routeFile.includes('safeClose()'),
    'Has proper error handling in stream': routeFile.includes('catch') && routeFile.includes('Stream error'),
    'Text-start sent before each iteration': routeFile.includes('hasSentTextStart') && routeFile.includes('hasSentTextStart = false'),
  };

  Object.entries(issues).forEach(([check, passed]) => {
    if (passed) {
      console.log(`  ✅ ${check}`);
      results.passed.push(`Issue check: ${check}`);
    } else {
      console.log(`  ❌ ${check}`);
      results.failed.push(`Issue check: ${check}`);
    }
  });
} catch (error) {
  console.log(`  ❌ Error checking for issues: ${error.message}`);
  results.failed.push('Common issues check');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 RUNTIME TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.failed.forEach(test => console.log(`  - ${test}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  MANUAL TESTS NEEDED:');
  results.warnings.forEach(warning => console.log(`  - ${warning}`));
}

console.log('\n📝 MANUAL TESTING CHECKLIST:');
console.log('  1. Open http://localhost:3000/admin/alex');
console.log('  2. Send a simple message: "Hi Alex"');
console.log('  3. Check browser console for streaming events');
console.log('  4. Ask Alex to use a tool: "Show me my segments"');
console.log('  5. Check if streaming continues after tool execution');
console.log('  6. Check database for saved messages');
console.log('  7. Try multiple tools in sequence');

if (results.failed.length === 0) {
  console.log('\n✅ All automated tests passed!');
  console.log('⚠️  Please run manual tests to verify streaming works correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some automated tests failed. Please review.');
  process.exit(1);
}


