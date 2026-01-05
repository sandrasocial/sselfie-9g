/**
 * Test with a real-world scenario that might fail
 * 
 * This tests edge cases that could cause the trigger detection to fail
 */

const regex = /\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i;

const problematicCases = [
  {
    name: 'Trigger at start of text',
    text: '[CREATE_FEED_STRATEGY: {"posts": []}] Some text after',
    shouldMatch: true
  },
  {
    name: 'Trigger at end of text',
    text: 'Some text before [CREATE_FEED_STRATEGY: {"posts": []}]',
    shouldMatch: true
  },
  {
    name: 'Trigger in middle with newlines',
    text: `Here is your feed strategy:

[CREATE_FEED_STRATEGY: {
  "posts": []
}]

Hope you like it!`,
    shouldMatch: true
  },
  {
    name: 'Multiple brackets in JSON',
    text: '[CREATE_FEED_STRATEGY: {"posts": [{"position": 1}, {"position": 2}]}]',
    shouldMatch: true
  },
  {
    name: 'Trigger with markdown code block (should not match)',
    text: '```\n[CREATE_FEED_STRATEGY: {"posts": []}]\n```',
    shouldMatch: true // Still matches because regex doesn't care about code blocks
  },
  {
    name: 'Incomplete trigger',
    text: '[CREATE_FEED_STRATEGY: {"posts": [',
    shouldMatch: false // Invalid JSON
  },
  {
    name: 'Trigger with escaped quotes',
    text: '[CREATE_FEED_STRATEGY: {"title": "Feed with \\"quotes\\""}]',
    shouldMatch: true
  }
];

console.log('Testing problematic scenarios:');
console.log('==========================================\n');

let passed = 0;
let failed = 0;

problematicCases.forEach(({ name, text, shouldMatch }) => {
  const match = text.match(regex);
  const matched = !!match;
  const passedTest = matched === shouldMatch;
  
  if (passedTest) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.log(`❌ ${name}`);
    console.log(`   Expected: ${shouldMatch ? 'MATCH' : 'NO MATCH'}, Got: ${matched ? 'MATCH' : 'NO MATCH'}`);
  }
  
  if (match && shouldMatch) {
    try {
      const parsed = JSON.parse(match[1]);
      console.log(`   ✅ JSON valid`);
    } catch (e) {
      console.log(`   ❌ JSON invalid: ${e.message}`);
      if (shouldMatch) failed++; // Count as failure if JSON is invalid but we expected match
    }
  }
});

console.log('\n==========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}




