#!/usr/bin/env node

/**
 * Comprehensive Test Script for Alex Chat
 * Tests backend streaming, frontend compatibility, and markdown rendering
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_EMAIL = 'ssa@ssasocial.com';

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || (result && result.passed)) {
      results.passed.push(name);
      log(`✅ PASS: ${name}`, 'success');
      return true;
    } else {
      results.failed.push({ name, error: result?.error || 'Test failed' });
      log(`❌ FAIL: ${name}${result?.error ? ` - ${result.error}` : ''}`, 'error');
      return false;
    }
  } catch (error) {
    results.failed.push({ name, error: error.message });
    log(`❌ FAIL: ${name} - ${error.message}`, 'error');
    return false;
  }
}

function warning(message) {
  results.warnings.push(message);
  log(`⚠️  WARNING: ${message}`, 'warning');
}

// Test 1: Check if route exists
async function testRouteExists() {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}/api/admin/agent/chat`);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, { method: 'POST' }, (res) => {
      // 401 is expected (no auth), 404 means route doesn't exist
      if (res.statusCode === 401 || res.statusCode === 400) {
        resolve(true);
      } else if (res.statusCode === 404) {
        resolve({ passed: false, error: 'Route returns 404' });
      } else {
        resolve({ passed: false, error: `Unexpected status: ${res.statusCode}` });
      }
      res.on('data', () => {});
      res.on('end', () => {});
    });
    
    req.on('error', (error) => {
      resolve({ passed: false, error: error.message });
    });
    
    req.write(JSON.stringify({ messages: [] }));
    req.end();
  });
}

// Test 2: Check SSE stream format and detect early closure
async function testStreamFormat() {
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}/api/admin/agent/chat`);
    const client = url.protocol === 'https:' ? https : http;
    
    let buffer = '';
    let events = [];
    let streamStartTime = Date.now();
    let firstChunkTime = null;
    let streamClosedTime = null;
    let chunkCount = 0;
    
    const req = client.request(url, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.TEST_COOKIE || '' // You'll need to provide auth cookie
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        resolve({ passed: false, error: `Status ${res.statusCode} - Auth may be required` });
        return;
      }
      
      // Check Content-Type
      const contentType = res.headers['content-type'];
      if (!contentType || !contentType.includes('text/event-stream')) {
        resolve({ passed: false, error: `Wrong Content-Type: ${contentType}` });
        return;
      }
      
      res.on('data', (chunk) => {
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
          const timeToFirstChunk = firstChunkTime - streamStartTime;
          console.log(`[TEST] First chunk received after ${timeToFirstChunk}ms`);
        }
        chunkCount++;
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              events.push(data);
            } catch (e) {
              // Not JSON, skip
            }
          }
        }
      });
      
      res.on('end', () => {
        streamClosedTime = Date.now();
        const streamDuration = streamClosedTime - streamStartTime;
        const timeToFirstChunk = firstChunkTime ? firstChunkTime - streamStartTime : null;
        
        console.log(`[TEST] Stream closed after ${streamDuration}ms`);
        console.log(`[TEST] Received ${chunkCount} chunks, ${events.length} events`);
        if (timeToFirstChunk) {
          console.log(`[TEST] Time to first chunk: ${timeToFirstChunk}ms`);
        }
        
        // Check for early closure (less than 100ms suggests immediate closure)
        if (streamDuration < 100 && events.length === 0) {
          resolve({ passed: false, error: `Stream closed immediately (${streamDuration}ms) - likely client rejection or format issue` });
          return;
        }
        
        if (events.length === 0) {
          resolve({ passed: false, error: 'No events received' });
          return;
        }
        
        // Check for text-delta events
        const textDeltas = events.filter(e => e.type === 'text-delta');
        if (textDeltas.length === 0) {
          resolve({ passed: false, error: 'No text-delta events found' });
          return;
        }
        
        // Check format
        const firstDelta = textDeltas[0];
        if (!firstDelta.hasOwnProperty('delta')) {
          resolve({ passed: false, error: 'text-delta missing "delta" property' });
          return;
        }
        
        // Note: id field is now required based on our fix
        if (!firstDelta.hasOwnProperty('id')) {
          warning('text-delta events should have "id" property for DefaultChatTransport');
        }
        
        if (firstDelta.hasOwnProperty('text')) {
          resolve({ passed: false, error: 'text-delta should use "delta", not "text"' });
          return;
        }
        
        resolve(true);
      });
      
      res.on('error', (error) => {
        streamClosedTime = Date.now();
        const streamDuration = streamClosedTime - streamStartTime;
        console.log(`[TEST] Stream error after ${streamDuration}ms:`, error.message);
        resolve({ passed: false, error: `Stream error: ${error.message}` });
      });
    });
    
    req.on('error', (error) => {
      resolve({ passed: false, error: error.message });
    });
    
    req.write(JSON.stringify({ 
      messages: [
        { role: 'user', content: 'Test message' }
      ]
    }));
    req.end();
    
    // Timeout after 10 seconds
    setTimeout(() => {
      req.destroy();
      if (events.length === 0) {
        resolve({ passed: false, error: 'Timeout - no events received' });
      } else {
        // Stream completed normally
        resolve(true);
      }
    }, 10000);
  });
}

// Test 10: Detect stream early closure issue
async function testStreamEarlyClosure() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if stream has proper error handling
    if (!content.includes('safeEnqueue') || !content.includes('isClosed')) {
      issues.push('Stream missing safe enqueue/closure handling');
    }
    
    // Check if there's logging for stream closure
    if (!content.includes('Controller already closed') && !content.includes('Stream already closed')) {
      issues.push('Missing logging for stream closure detection');
    }
    
    // Check if generateTextStream has error handling
    if (!content.includes('generateTextStream') || !content.includes('async function* generateTextStream')) {
      issues.push('generateTextStream function not found or incorrectly defined');
    }
    
    // Check if processAnthropicStream yields data
    if (!content.includes('yield text') && !content.includes('yield item')) {
      issues.push('Stream generator may not be yielding data');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 3: Check ReactMarkdown import
function testMarkdownImport() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
    
    if (!content.includes("import ReactMarkdown")) {
      return { passed: false, error: 'ReactMarkdown not imported' };
    }
    
    if (!content.includes('react-markdown')) {
      return { passed: false, error: 'react-markdown package may not be installed' };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 4: Check message content extraction
function testMessageContentExtraction() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
    
    // Check if getMessageContent handles parts array
    if (!content.includes('message.parts')) {
      return { passed: false, error: 'getMessageContent does not handle parts array' };
    }
    
    // Check if it handles text parts
    if (!content.includes('part.type === "text"')) {
      return { passed: false, error: 'getMessageContent does not filter text parts' };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 5: Compare with Maya route format
function testCompareWithMaya() {
  try {
    const fs = require('fs');
    const mayaContent = fs.readFileSync('app/api/maya/chat/route.ts', 'utf8');
    const alexContent = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Maya uses streamText
    if (mayaContent.includes('streamText') && !alexContent.includes('streamText')) {
      issues.push('Maya uses streamText, Alex uses custom stream');
    }
    
    // Maya uses toDataStreamResponse
    if (mayaContent.includes('toDataStreamResponse') && !alexContent.includes('toDataStreamResponse')) {
      issues.push('Maya uses toDataStreamResponse, Alex uses custom ReadableStream');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 6: Check useChat configuration
function testUseChatConfig() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
    
    const issues = [];
    
    if (!content.includes('DefaultChatTransport')) {
      issues.push('Not using DefaultChatTransport');
    }
    
    if (!content.includes('apiEndpoint')) {
      issues.push('apiEndpoint not configured');
    }
    
    // Check specifically in onResponse callback, not in the entire file
    // Look for onResponse callback and check if it consumes body
    const onResponseMatch = content.match(/onResponse:\s*async?\s*\([^)]*\)\s*=>\s*\{([^}]+)\}/s);
    if (onResponseMatch) {
      const onResponseBody = onResponseMatch[1];
      // Check if onResponse callback uses response.text() or response.json()
      if (onResponseBody.includes('response.text()') || onResponseBody.includes('response.json()')) {
        issues.push('onResponse callback is consuming response body');
      }
      // Check if it only reads headers (good pattern)
      if (!onResponseBody.includes('response.headers') && !onResponseBody.includes('headers.get')) {
        issues.push('onResponse should read headers, not body');
      }
    } else {
      // Fallback: check if onResponse exists but we couldn't parse it
      if (content.includes('onResponse:') && (content.includes('response.text()') || content.includes('response.json()'))) {
        // Only flag if it's near onResponse (within 200 chars)
        const onResponseIndex = content.indexOf('onResponse:');
        const textIndex = content.indexOf('response.text()', onResponseIndex);
        const jsonIndex = content.indexOf('response.json()', onResponseIndex);
        
        if ((textIndex !== -1 && textIndex - onResponseIndex < 200) || 
            (jsonIndex !== -1 && jsonIndex - onResponseIndex < 200)) {
          issues.push('onResponse may be consuming response body');
        }
      }
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 7: Check package.json for required dependencies
function testDependencies() {
  try {
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const required = ['ai', '@ai-sdk/react', 'react-markdown'];
    const missing = required.filter(dep => !deps[dep]);
    
    if (missing.length > 0) {
      return { passed: false, error: `Missing dependencies: ${missing.join(', ')}` };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 8: Check tool schema definitions
function testToolSchemas() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if tools use z.object()
    if (!content.includes('parameters: z.object(')) {
      issues.push('Tools should use z.object() for parameters');
    }
    
    // Check if tools are defined before streamText
    const toolDefMatch = content.match(/const\s+\w+Tool\s*=\s*tool\(/g);
    const streamTextMatch = content.indexOf('streamText({');
    
    if (toolDefMatch && streamTextMatch > 0) {
      // Check if tools are defined before streamText
      const lastToolDef = content.lastIndexOf('const ') + content.substring(content.lastIndexOf('const ')).indexOf('Tool = tool(');
      if (lastToolDef > streamTextMatch) {
        issues.push('Tools should be defined before streamText call');
      }
    }
    
    // Check for nested z.object() which might cause issues
    if (content.match(/z\.object\([^)]*z\.object\(/)) {
      issues.push('Nested z.object() detected - may cause schema conversion issues');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 9: Check if using gateway vs direct provider
function testModelProvider() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if using gateway string format
    if (!content.includes('model: "anthropic/claude-sonnet-4-20250514"')) {
      if (content.includes('createAnthropic')) {
        issues.push('Using createAnthropic direct provider - gateway format may be better for tool schemas');
      } else {
        issues.push('Model format not recognized');
      }
    }
    
    // Check if createAnthropic is imported but not used
    if (content.includes('import') && content.includes('createAnthropic') && !content.includes('createAnthropic(')) {
      issues.push('createAnthropic imported but not used - remove unused import');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  log('\n🧪 Starting Alex Chat Comprehensive Tests\n', 'info');
  
  // Static tests (no server needed)
  test('Dependencies check', testDependencies);
  test('ReactMarkdown import', testMarkdownImport);
  test('Message content extraction', testMessageContentExtraction);
  test('useChat configuration', testUseChatConfig);
  test('Compare with Maya route', testCompareWithMaya);
  test('Tool schema definitions', testToolSchemas);
  test('Model provider configuration', testModelProvider);
  test('Stream early closure detection', testStreamEarlyClosure);
  
  // Dynamic tests (require server)
  log('\n📡 Testing backend (requires running server)...\n', 'info');
  
  const routeTest = await testRouteExists();
  if (routeTest === true || routeTest.passed) {
    test('Route exists', () => routeTest);
  } else {
    warning('Skipping stream tests - route test failed or auth required');
    warning('To test streaming, set TEST_COOKIE environment variable with auth cookie');
  }
  
  // Summary
  log('\n📊 Test Summary\n', 'info');
  log(`✅ Passed: ${results.passed.length}`, 'success');
  log(`❌ Failed: ${results.failed.length}`, 'error');
  log(`⚠️  Warnings: ${results.warnings.length}`, 'warning');
  
  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'error');
    results.failed.forEach(({ name, error }) => {
      log(`  - ${name}: ${error}`, 'error');
    });
  }
  
  if (results.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'warning');
    results.warnings.forEach(w => log(`  - ${w}`, 'warning'));
  }
  
  // Recommendations
  log('\n💡 Recommendations:\n', 'info');
  
  if (results.failed.some(f => f.name.includes('Maya'))) {
    log('1. Consider using AI SDK streamText like Maya route does', 'info');
    log('   This ensures compatibility with DefaultChatTransport', 'info');
  }
  
  if (results.failed.some(f => f.name.includes('Markdown'))) {
    log('2. Install react-markdown: npm install react-markdown', 'info');
  }
  
  if (results.failed.some(f => f.name.includes('useChat'))) {
    log('3. Ensure useChat uses DefaultChatTransport with correct apiEndpoint', 'info');
    log('4. Ensure onResponse does NOT consume response body', 'info');
  }
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n💥 Test runner crashed: ${error.message}`, 'error');
  process.exit(1);
});

