#!/usr/bin/env node

// Test Gumloop API connection directly
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          value = value.replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
    console.log('✅ Loaded .env.local');
  } catch (error) {
    console.log('⚠️  Could not load .env.local:', error.message);
  }
}

loadEnv();

const GUMLOOP_API_KEY = process.env.GUMLOOP_API_KEY;

console.log('\n🔍 Environment Check:');
console.log(`   GUMLOOP_API_KEY: ${GUMLOOP_API_KEY ? '✅ Found (' + GUMLOOP_API_KEY.substring(0, 8) + '...)' : '❌ Not found'}`);

if (!GUMLOOP_API_KEY) {
  console.error('\n❌ GUMLOOP_API_KEY not found in .env.local');
  process.exit(1);
}

// Test agents
const AGENTS = [
  {
    name: "Content Writer",
    flowId: "9aftKi7RHgGbDFCAxoj2J8",
    testMessage: "Write a very short Instagram caption about morning coffee (max 10 words)"
  }
];

async function testGumloopAgent(agent) {
  console.log(`\n📞 Testing: ${agent.name}`);
  console.log(`   Flow ID: ${agent.flowId}`);
  console.log(`   Message: "${agent.testMessage}"`);

  try {
    const url = `https://api.gumloop.com/api/v1/flow/${agent.flowId}/run`;
    console.log(`   URL: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GUMLOOP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_data: {
          message: agent.testMessage
        }
      })
    });

    console.log(`   HTTP Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ ERROR Response:`);
      console.error(`   ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`   ✅ Response received!`);
    console.log(`   Run ID: ${data.run_id || 'N/A'}`);
    console.log(`   Status: ${data.status || 'N/A'}`);

    console.log('\n   📦 Full Response Data:');
    console.log(JSON.stringify(data, null, 2));

    // Extract response
    const agentResponse = data.output_data?.response || data.output_data?.message || JSON.stringify(data.output_data);
    console.log(`\n   🤖 Agent Response:`);
    console.log(`   "${agentResponse}"\n`);

    return true;
  } catch (error) {
    console.error(`   ❌ Network error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING GUMLOOP CONNECTION');
  console.log('='.repeat(70));

  let allPassed = true;

  for (const agent of AGENTS) {
    const passed = await testGumloopAgent(agent);
    if (!passed) allPassed = false;
    console.log('='.repeat(70));
  }

  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED! Your Gumloop integration works!\n');
    console.log('Next steps:');
    console.log('1. Test in browser: http://localhost:3000/admin/agents');
    console.log('2. Build Agent 5 to replace email cron jobs');
    console.log('3. Save 20+ hours/week!\n');
  } else {
    console.log('\n❌ SOME TESTS FAILED. Check errors above.\n');
    console.log('Troubleshooting:');
    console.log('- Verify Flow ID is correct in Gumloop dashboard');
    console.log('- Check API key is valid: https://app.gumloop.com/settings');
    console.log('- Make sure flow is published and not deleted\n');
  }
}

runTests().catch(console.error);
