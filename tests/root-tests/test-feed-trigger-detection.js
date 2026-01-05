/**
 * Test script for feed trigger detection
 * 
 * This script tests:
 * 1. Regex pattern for CREATE_FEED_STRATEGY detection
 * 2. JSON parsing of strategy data
 * 3. Message structure validation
 * 
 * Run with: node test-feed-trigger-detection.js
 */

// Test the regex pattern used for CREATE_FEED_STRATEGY detection
const regex = /\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i;

const testCases = [
  {
    name: 'Simple trigger',
    text: '[CREATE_FEED_STRATEGY: {"posts": [{"position": 1}]}]',
    shouldMatch: true
  },
  {
    name: 'Trigger with whitespace',
    text: '[CREATE_FEED_STRATEGY: { "posts": [] }]',
    shouldMatch: true
  },
  {
    name: 'Multi-line JSON',
    text: '[CREATE_FEED_STRATEGY: {\n  "posts": [\n    {"position": 1}\n  ]\n}]',
    shouldMatch: true
  },
  {
    name: 'Nested brackets in JSON',
    text: '[CREATE_FEED_STRATEGY: {"posts": [{"position": 1, "data": {"nested": true}}]}]',
    shouldMatch: true
  },
  {
    name: 'No trigger',
    text: 'Just regular text without trigger',
    shouldMatch: false
  },
  {
    name: 'Case insensitive',
    text: '[create_feed_strategy: {"posts": []}]',
    shouldMatch: true
  },
  {
    name: 'Real-world example with 9 posts',
    text: `[CREATE_FEED_STRATEGY: {
      "userRequest": "Create a wellness coaching feed",
      "gridPattern": "3x3 grid with alternating warm and cool tones",
      "visualRhythm": "Cohesive visual flow with warm/cool alternation",
      "posts": [
        {"position": 1, "type": "portrait", "description": "Morning routine", "purpose": "Introduce brand", "tone": "warm", "generationMode": "classic", "prompt": "user123, woman, morning routine, natural light"},
        {"position": 2, "type": "object", "description": "Wellness products", "purpose": "Show products", "tone": "cool", "generationMode": "classic", "prompt": "wellness products flatlay"},
        {"position": 3, "type": "portrait", "description": "Workout", "purpose": "Show lifestyle", "tone": "warm", "generationMode": "classic", "prompt": "user123, woman, workout, gym"}
      ],
      "totalCredits": 9
    }]`,
    shouldMatch: true
  }
];

console.log('Testing CREATE_FEED_STRATEGY regex pattern:');
console.log('==========================================\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach(({ name, text, shouldMatch }) => {
  const match = text.match(regex);
  const matched = !!match;
  const passed = matched === shouldMatch;
  
  if (passed) {
    passedTests++;
  } else {
    failedTests++;
  }
  
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  console.log(`   Expected: ${shouldMatch ? 'MATCH' : 'NO MATCH'}, Got: ${matched ? 'MATCH' : 'NO MATCH'}`);
  
  if (match && shouldMatch) {
    console.log(`   Captured JSON length: ${match[1].length}`);
    try {
      const parsed = JSON.parse(match[1]);
      console.log(`   ✅ JSON is valid`);
      console.log(`   JSON keys: ${Object.keys(parsed).join(', ')}`);
      if (parsed.posts && Array.isArray(parsed.posts)) {
        console.log(`   Posts count: ${parsed.posts.length}`);
      }
    } catch (e) {
      console.log(`   ❌ JSON parse error: ${e.message}`);
      console.log(`   JSON preview: ${match[1].substring(0, 200)}...`);
      failedTests++;
    }
  } else if (!match && shouldMatch) {
    console.log(`   ❌ Expected match but got none`);
    console.log(`   Text preview: ${text.substring(0, 100)}...`);
  }
  console.log('');
});

console.log('==========================================');
console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
console.log(`Total: ${testCases.length} tests`);

if (failedTests > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}




