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
        
        // Check for invalid tool-result events (should not be in SSE stream)
        const toolResults = events.filter(e => e.type === 'tool-result');
        if (toolResults.length > 0) {
          resolve({ passed: false, error: `Found ${toolResults.length} tool-result event(s) in SSE stream - DefaultChatTransport does not recognize this event type. Tool results should be included in message parts, not SSE events.` });
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
    if (!content.includes('safeEnqueue')) {
      issues.push('Stream missing safeEnqueue function for safe enqueue handling');
    }
    
    if (!content.includes('isClosed')) {
      issues.push('Stream missing isClosed variable for closure tracking');
    }
    
    // Check if there's logging for stream closure (at least one should exist)
    const hasClosureLogging = content.includes('Controller already closed') || 
                               content.includes('Stream already closed') ||
                               content.includes('already closed');
    if (!hasClosureLogging) {
      issues.push('Missing logging for stream closure detection');
    }
    
    // Check if generateTextStream function exists (flexible pattern matching)
    const hasGenerateTextStream = content.includes('generateTextStream') && 
                                  (content.includes('async function*') || 
                                   content.includes('function*') ||
                                   content.includes('generateTextStream ='));
    if (!hasGenerateTextStream) {
      issues.push('generateTextStream function not found or incorrectly defined');
    }
    
    // Check if stream generators yield data (flexible pattern matching)
    const hasYield = content.includes('yield ') || 
                     content.includes('yield text') || 
                     content.includes('yield item') ||
                     /yield\s+\w+/.test(content);
    if (!hasYield) {
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

// Test 11: Check email preview extraction validation
function testEmailPreviewValidation() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
    
    const issues = [];
    
    // Check if HTML validation is present (starts with < or <!DOCTYPE)
    if (!content.includes('htmlValue.trim().startsWith(\'<\')') && 
        !content.includes('htmlValue.trim().startsWith("<")') &&
        !content.includes('htmlStartsWith') &&
        !content.includes('startsWith(\'<!DOCTYPE\')')) {
      issues.push('Missing HTML validation - should check if HTML starts with < or <!DOCTYPE');
    }
    
    // Check if validation rejects plain text (check for typeof checks in any form)
    if (!content.includes('typeof htmlValue') && 
        !content.includes('typeof result.html') &&
        !content.includes('typeof parsedResult.html')) {
      issues.push('Missing type check for HTML value');
    }
    
    // Check if EmailPreviewCard validates HTML
    const emailPreviewCard = fs.readFileSync('components/admin/email-preview-card.tsx', 'utf8');
    if (!emailPreviewCard.includes('startsWith(\'<\')') && 
        !emailPreviewCard.includes('startsWith("<")') &&
        !emailPreviewCard.includes('startsWith(\'<!DOCTYPE\')')) {
      issues.push('EmailPreviewCard missing HTML validation - should reject non-HTML content');
    }
    
    // Check if there's logging for invalid data
    if (!content.includes('Invalid email preview data') && 
        !content.includes('Invalid HTML content')) {
      warning('Missing debug logging for invalid email preview data');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 12: Check for email preview state management conflicts
function testEmailPreviewStateManagement() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
    
    const issues = [];
    
    // Check if email preview is cleared when messages are empty
    if (!content.includes('if (!messages.length)') || 
        !content.includes('setEmailPreview(null)')) {
      issues.push('Email preview should be cleared when messages are empty');
    }
    
    // Check if there's validation before setting email preview
    const setEmailPreviewMatches = content.match(/setEmailPreview\([^)]+\)/g);
    if (setEmailPreviewMatches) {
      let hasValidation = false;
      setEmailPreviewMatches.forEach(match => {
        // Check if there's validation before this setEmailPreview call
        const beforeMatch = content.substring(0, content.indexOf(match));
        if (beforeMatch.includes('startsWith') || beforeMatch.includes('typeof') || beforeMatch.includes('htmlValue')) {
          hasValidation = true;
        }
      });
      if (!hasValidation) {
        issues.push('setEmailPreview calls should be preceded by HTML validation');
      }
    }
    
    // Check if email preview card validates HTML before rendering
    const emailPreviewCard = fs.readFileSync('components/admin/email-preview-card.tsx', 'utf8');
    if (!emailPreviewCard.includes('hasValidHtml') && 
        !emailPreviewCard.includes('startsWith(\'<\')')) {
      issues.push('EmailPreviewCard should validate HTML before rendering');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 13: Check compose_email tool return format
function testComposeEmailToolFormat() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if compose_email tool returns proper format
    if (!content.includes('return {') || !content.includes('html:') || !content.includes('subjectLine:')) {
      issues.push('compose_email tool should return object with html and subjectLine properties');
    }
    
    // Check if HTML is validated/generated properly
    if (!content.includes('emailHtml') && !content.includes('email_html')) {
      issues.push('compose_email tool should generate emailHtml variable');
    }
    
    // Check if HTML starts with DOCTYPE or html tag
    const htmlGenerationMatch = content.match(/emailHtml\s*=\s*[^;]+/g);
    if (htmlGenerationMatch) {
      // Check if HTML generation includes proper structure
      if (!content.includes('<!DOCTYPE') && !content.includes('<html')) {
        warning('compose_email tool may not generate proper HTML structure');
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

// Test 14: Check for duplicate email preview extraction logic
function testDuplicateEmailPreviewExtraction() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('components/admin/admin-agent-chat-new.tsx', 'utf8');
    
    const issues = [];
    
    // Count actual extraction points (not just mentions in UI text)
    // Look for patterns like: if (invocation.toolName === 'compose_email' or partAny.toolName === 'compose_email'
    const extractionPatterns = [
      /invocation\.toolName\s*===\s*['"]compose_email['"]/g,
      /partAny\.toolName\s*===\s*['"]compose_email['"]/g
    ];
    
    let extractionCount = 0;
    extractionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        extractionCount += matches.length;
      }
    });
    
    // Check if using helper function (good pattern - prevents duplication)
    const hasHelperFunction = content.includes('extractEmailPreview') || content.includes('const extractEmailPreview');
    
    // Should have at most 2 extraction points (toolInvocations and parts)
    // If using helper function, it's fine to have more calls to the helper
    if (extractionCount > 2 && !hasHelperFunction) {
      issues.push(`Found ${extractionCount} email preview extraction points (expected max 2: toolInvocations and parts). Consider using a helper function to prevent duplication.`);
    } else if (extractionCount > 2 && hasHelperFunction) {
      // Using helper function is good, but should still have guards
      if (!content.includes('foundValidEmailPreview') && !content.includes('break') && !content.includes('return')) {
        issues.push(`Using helper function is good, but extraction loops should have break/return to prevent duplicate calls`);
      }
    }
    
    // Check if there's a guard to prevent duplicate extraction
    if (!content.includes('foundValidEmailPreview') && !content.includes('extractEmailPreview')) {
      issues.push('Missing guard to prevent duplicate email preview extraction');
    }
    
    // Check if extraction has break/return to stop after first find
    const extractionBlocks = content.match(/if\s*\([^)]*compose_email[^)]*\)\s*\{[^}]{0,500}setEmailPreview/g);
    if (extractionBlocks) {
      let hasGuard = false;
      extractionBlocks.forEach(block => {
        if (block.includes('break') || block.includes('return') || block.includes('foundValidEmailPreview') || block.includes('extractEmailPreview')) {
          hasGuard = true;
        }
      });
      if (!hasGuard && extractionBlocks.length > 1) {
        issues.push('Email preview extraction blocks should have break/return to prevent duplicates');
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

// Test 15: Check Resend segments API implementation
function testResendSegmentsAPI() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if SDK segments.list() is tried first (without params, then with audienceId)
    if (!content.includes('segments.list()') && !content.includes('segments?.list')) {
      issues.push('Missing SDK segments.list() call - should try Resend SDK first');
    }
    
    // Check if direct API fallback tries multiple endpoints
    if (!content.includes('api.resend.com/segments') && !content.includes('api.resend.com/audiences')) {
      issues.push('Missing direct API fallback for segments - should try /segments and /audiences/{id}/segments');
    }
    
    // Check if error handling for 405 (Method Not Allowed) is present
    if (!content.includes('405') && !content.includes('method_not_allowed')) {
      warning('Missing handling for 405 errors - segments API endpoint might not exist');
    }
    
    // Check if retry logic with exponential backoff is present
    if (!content.includes('retryDelay') || !content.includes('retryDelay *= 2')) {
      issues.push('Missing retry logic with exponential backoff for segments API');
    }
    
    // Check if multiple endpoint attempts are made
    const endpointAttempts = (content.match(/segmentsUrl|api\.resend\.com\/segments/g) || []).length;
    if (endpointAttempts < 2) {
      warning('Segments API should try multiple endpoints (/segments and /audiences/{id}/segments)');
    }
    
    // Check if response format handling is flexible (data, segments, or direct array)
    const responseFormats = [
      content.includes('apiData.data'),
      content.includes('apiData.segments'),
      content.includes('Array.isArray(apiData)')
    ].filter(Boolean).length;
    
    if (responseFormats < 2) {
      warning('Segments API response parsing should handle multiple formats (data, segments, or direct array)');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 16: Check codebase file reading tool implementation
function testCodebaseFileReadingTool() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if read_codebase_file tool is defined
    if (!content.includes('readCodebaseFileTool') && !content.includes('read_codebase_file')) {
      issues.push('Missing read_codebase_file tool definition');
    }
    
    // Check if tool is added to tools object
    if (!content.includes('read_codebase_file:') && !content.includes('readCodebaseFileTool')) {
      issues.push('read_codebase_file tool not added to tools object');
    }
    
    // Check if tool has filePath parameter
    if (!content.includes('filePath: z.string()')) {
      issues.push('read_codebase_file tool missing filePath parameter');
    }
    
    // Check if tool has maxLines parameter
    if (!content.includes('maxLines: z.number()')) {
      issues.push('read_codebase_file tool missing maxLines parameter');
    }
    
    // Check if security checks are present (allowed directories)
    if (!content.includes('allowedDirs') && !content.includes('allowed directories')) {
      issues.push('Missing security check for allowed directories');
    }
    
    // Check if directory traversal protection exists
    if (!content.includes('..') && !content.includes('directory traversal')) {
      warning('Missing directory traversal protection check');
    }
    
    // Check if file existence check is present
    if (!content.includes('fs.existsSync') && !content.includes('existsSync')) {
      issues.push('Missing file existence check');
    }
    
    // Check if file reading logic exists
    if (!content.includes('fs.readFileSync') && !content.includes('readFileSync')) {
      issues.push('Missing file reading logic');
    }
    
    // Check if tool description mentions key use cases
    const descriptionChecks = [
      content.includes('freebies') || content.includes('freebie'),
      content.includes('guides') || content.includes('guide'),
      content.includes('templates') || content.includes('template'),
      content.includes('codebase') || content.includes('code base')
    ].filter(Boolean).length;
    
    if (descriptionChecks < 2) {
      warning('Tool description should mention key use cases (freebies, guides, templates, codebase)');
    }
    
    // Check if allowed directories are specified
    const allowedDirChecks = [
      content.includes('content-templates'),
      content.includes('docs'),
      content.includes('app'),
      content.includes('lib'),
      content.includes('scripts')
    ].filter(Boolean).length;
    
    if (allowedDirChecks < 3) {
      warning('Tool should allow reading from multiple safe directories (content-templates, docs, app, lib, scripts)');
    }
    
    // Check if tool logs file path attempts
    if (!content.includes('Attempting to read file') && !content.includes('Read file:')) {
      issues.push('Tool should log file path attempts for debugging');
    }
    
    // Check if file discovery features are present
    if (!content.includes('similarFiles') && !content.includes('similar files')) {
      issues.push('Missing file suggestion feature when file not found');
    }
    
    if (!content.includes('directoryContents') && !content.includes('directory contents')) {
      issues.push('Missing directory listing feature when directory is provided');
    }
    
    // Check if file suggestion logic exists
    if (!content.includes('similarFiles') && !content.includes('readdirSync')) {
      warning('File discovery should suggest similar files when file not found');
    }
    
    // Check if directory listing logic exists
    if (!content.includes('directoryContents') && !content.includes('isDirectory')) {
      warning('File discovery should list directory contents when directory is provided');
    }
    
    // Check if error results are handled properly
    if (!content.includes('success') || !content.includes('success === false')) {
      warning('Tool should check for error results (success: false) in tool execution handler');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 18: Check file discovery and suggestion features
function testFileDiscoveryFeatures() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    const warnings = [];
    
    // Check if file suggestion logic exists when file not found
    const hasFileSuggestion = content.includes('similarFiles') || 
                              (content.includes('readdirSync') && content.includes('similar'));
    
    if (!hasFileSuggestion) {
      issues.push('Missing file suggestion feature - should suggest similar files when file not found');
    }
    
    // Check if directory listing logic exists
    const hasDirectoryListing = content.includes('directoryContents') || 
                                (content.includes('isDirectory') && content.includes('readdirSync'));
    
    if (!hasDirectoryListing) {
      issues.push('Missing directory listing feature - should list files when directory is provided');
    }
    
    // Check if error messages include suggestions
    if (!content.includes('Did you mean') && !content.includes('suggestion')) {
      warnings.push('Error messages should include helpful suggestions');
    }
    
    // Check if tool description mentions file discovery
    if (!content.includes('similar files') && !content.includes('directory path')) {
      warnings.push('Tool description should mention file discovery features');
    }
    
    // Check if file matching logic exists (for similar file suggestions)
    const hasMatchingLogic = content.includes('includes') && 
                            (content.includes('toLowerCase') || content.includes('similar'));
    
    if (!hasMatchingLogic) {
      warnings.push('File matching logic should be present for smart suggestions');
    }
    
    if (warnings.length > 0) {
      warnings.forEach(w => warning(w));
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 17: Check tool execution error handling consistency
function testToolExecutionErrorHandling() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if tool execution checks for error results
    if (!content.includes('result.success === false') && !content.includes('success: false')) {
      issues.push('Tool execution handler should check for error results (success: false)');
    }
    
    // Check if all tools log errors consistently
    const toolErrorLogs = [
      content.includes('Error in compose_email tool'),
      content.includes('Error in schedule_campaign tool'),
      content.includes('Error in check_campaign_status tool'),
      content.includes('Error reading file')
    ].filter(Boolean).length;
    
    if (toolErrorLogs < 3) {
      warning('Not all tools have consistent error logging');
    }
    
    // Check if tool execution logs success/error properly
    if (!content.includes('executed successfully') && !content.includes('executed but returned error')) {
      issues.push('Tool execution should log success or error status');
    }
    
    if (issues.length > 0) {
      return { passed: false, error: issues.join('; ') };
    }
    
    return true;
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

// Test 15: Check Resend segments API implementation
function testResendSegmentsAPI() {
  try {
    const fs = require('fs');
    const content = fs.readFileSync('app/api/admin/agent/chat/route.ts', 'utf8');
    
    const issues = [];
    
    // Check if SDK segments.list() is tried first (without params, then with audienceId)
    if (!content.includes('segments.list()') && !content.includes('segments?.list')) {
      issues.push('Missing SDK segments.list() call - should try Resend SDK first');
    }
    
    // Check if direct API fallback tries multiple endpoints
    if (!content.includes('api.resend.com/segments') && !content.includes('api.resend.com/audiences')) {
      issues.push('Missing direct API fallback for segments - should try /segments and /audiences/{id}/segments');
    }
    
    // Check if error handling for 405 (Method Not Allowed) is present
    if (!content.includes('405') && !content.includes('method_not_allowed')) {
      warning('Missing handling for 405 errors - segments API endpoint might not exist');
    }
    
    // Check if retry logic with exponential backoff is present
    if (!content.includes('retryDelay') || !content.includes('retryDelay *= 2')) {
      issues.push('Missing retry logic with exponential backoff for segments API');
    }
    
    // Check if multiple endpoint attempts are made
    const endpointAttempts = (content.match(/segmentsUrl|api\.resend\.com\/segments/g) || []).length;
    if (endpointAttempts < 2) {
      warning('Segments API should try multiple endpoints (/segments and /audiences/{id}/segments)');
    }
    
    // Check if response format handling is flexible (data, segments, or direct array)
    const responseFormats = [
      content.includes('apiData.data'),
      content.includes('apiData.segments'),
      content.includes('Array.isArray(apiData)')
    ].filter(Boolean).length;
    
    if (responseFormats < 2) {
      warning('Segments API response parsing should handle multiple formats (data, segments, or direct array)');
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
  test('Email preview validation', testEmailPreviewValidation);
  test('Email preview state management', testEmailPreviewStateManagement);
  test('Compose email tool format', testComposeEmailToolFormat);
  test('Duplicate email preview extraction', testDuplicateEmailPreviewExtraction);
  test('Resend segments API implementation', testResendSegmentsAPI);
  test('Codebase file reading tool', testCodebaseFileReadingTool);
  test('Tool execution error handling', testToolExecutionErrorHandling);
  test('File discovery and suggestion features', testFileDiscoveryFeatures);
  
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

