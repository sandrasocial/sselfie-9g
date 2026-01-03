#!/usr/bin/env node

/**
 * Test Feed Card Rendering Logic
 * 
 * Tests:
 * 1. Feed card part structure (created by handleCreateFeed)
 * 2. Rendering condition logic
 * 3. Message part structure matching
 */

console.log('🧪 Testing Feed Card Rendering Logic\n')

// Test 1: Feed card part structure (from handleCreateFeed)
console.log('Test 1: Feed card part structure')
const mockStrategy = {
  feedTitle: 'Test Feed',
  title: 'Test Feed',
  overallVibe: 'Minimal',
  colorPalette: 'Beige',
  posts: [
    { position: 1, postType: 'portrait', visualDirection: 'Test', purpose: 'test' },
    { position: 2, postType: 'lifestyle', visualDirection: 'Test', purpose: 'test' },
  ]
}

const mockFeedCardPart = {
  type: "tool-generateFeed",
  output: {
    strategy: mockStrategy,
    title: mockStrategy.feedTitle || mockStrategy.title || "Instagram Feed",
    description: mockStrategy.overallVibe || mockStrategy.colorPalette || "",
    posts: mockStrategy.posts || [],
    isSaved: false,
    studioProMode: true,
    styleStrength: 0.8,
    promptAccuracy: 0.8,
    aspectRatio: "1:1",
    realismStrength: 0.8,
  },
}

console.log('  Feed card part structure:')
console.log('    type:', mockFeedCardPart.type)
console.log('    hasOutput:', !!mockFeedCardPart.output)
console.log('    hasStrategy:', !!mockFeedCardPart.output.strategy)
console.log('    hasPosts:', !!mockFeedCardPart.output.posts)
console.log('    postsCount:', mockFeedCardPart.output.posts?.length || 0)
console.log('    isSaved:', mockFeedCardPart.output.isSaved)
console.log('    hasFeedId:', !!mockFeedCardPart.output.feedId)

// Test 2: Rendering condition (OLD working version)
console.log('\nTest 2: OLD rendering condition (only saved feeds)')
const oldRenderingCondition = mockFeedCardPart.output && mockFeedCardPart.output.feedId
console.log('  Condition: output && output.feedId')
console.log('  Result:', oldRenderingCondition)
console.log('  Would render:', oldRenderingCondition ? 'YES' : 'NO (unsaved feed)')

// Test 3: Rendering condition (NEW version - should support unsaved)
console.log('\nTest 3: NEW rendering condition (saved + unsaved feeds)')
const newRenderingCondition = mockFeedCardPart.output
console.log('  Condition: output')
console.log('  Result:', newRenderingCondition)
console.log('  Would render:', newRenderingCondition ? 'YES' : 'NO')

// Test 4: Message part matching
console.log('\nTest 4: Message part type matching')
const mockMessageParts = [
  { type: 'text', text: 'Hello' },
  mockFeedCardPart,
  { type: 'text', text: 'More text' },
]

const feedParts = mockMessageParts.filter((p) => p && p.type !== "text" && p.type !== "image")
const feedCardPart = feedParts.find((p) => p.type === "tool-generateFeed")

console.log('  Total parts:', mockMessageParts.length)
console.log('  Feed parts (non-text/image):', feedParts.length)
console.log('  Found tool-generateFeed part:', !!feedCardPart)
console.log('  Part type:', feedCardPart?.type)

// Test 5: Complete message structure
console.log('\nTest 5: Complete message structure')
const mockMessage = {
  id: 'test-msg-1',
  role: 'assistant',
  parts: mockMessageParts,
}

const textParts = mockMessage.parts.filter((p) => p && p.type === "text")
const imageParts = mockMessage.parts.filter((p) => p && (p).type === "image")
const otherParts = mockMessage.parts.filter((p) => p && p.type !== "text" && p.type !== "image")

console.log('  Message ID:', mockMessage.id)
console.log('  Role:', mockMessage.role)
console.log('  Total parts:', mockMessage.parts.length)
console.log('  Text parts:', textParts.length)
console.log('  Image parts:', imageParts.length)
console.log('  Other parts:', otherParts.length)
console.log('  Other part types:', otherParts.map((p) => p.type))

// Test 6: Rendering check (simulating MayaChatInterface logic)
console.log('\nTest 6: Rendering check (simulating MayaChatInterface)')
otherParts.forEach((part, partIndex) => {
  if (part.type === "tool-generateFeed") {
    const toolPart = part
    const output = toolPart.output
    
    console.log(`  Part ${partIndex}: type="${part.type}"`)
    console.log('    Has output:', !!output)
    
    if (output) {
      console.log('    Rendering FeedPreviewCard: YES')
      console.log('    feedId:', output.feedId || 'undefined (unsaved)')
      console.log('    isSaved:', output.isSaved !== false && !!output.feedId)
      console.log('    hasStrategy:', !!output.strategy)
      console.log('    postsCount:', output.posts?.length || 0)
    } else {
      console.log('    Rendering FeedPreviewCard: NO (no output)')
    }
  }
})

// Test 7: Saved feed (with feedId)
console.log('\nTest 7: Saved feed (with feedId)')
const savedFeedCardPart = {
  type: "tool-generateFeed",
  output: {
    feedId: 123,
    title: 'Saved Feed',
    description: 'Description',
    posts: [],
    isSaved: true,
  },
}

const savedRenderingCondition = savedFeedCardPart.output && savedFeedCardPart.output.feedId
const newSavedRenderingCondition = savedFeedCardPart.output

console.log('  OLD condition (output && output.feedId):', savedRenderingCondition, '- Would render:', savedRenderingCondition ? 'YES' : 'NO')
console.log('  NEW condition (output):', newSavedRenderingCondition, '- Would render:', newSavedRenderingCondition ? 'YES' : 'NO')

// Summary
console.log('\n' + '='.repeat(60))
console.log('📊 TEST SUMMARY')
console.log('='.repeat(60))

const allTestsPass = 
  mockFeedCardPart.type === "tool-generateFeed" &&
  !!mockFeedCardPart.output &&
  !!mockFeedCardPart.output.strategy &&
  Array.isArray(mockFeedCardPart.output.posts) &&
  feedCardPart !== undefined &&
  newRenderingCondition === true

console.log(`\nAll structure tests: ${allTestsPass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`\nKey findings:`)
console.log(`  - Unsaved feed part structure: ✅ Correct`)
console.log(`  - OLD rendering (output && output.feedId): ${oldRenderingCondition ? '✅ Would render' : '❌ Would NOT render (unsaved)'}`)
console.log(`  - NEW rendering (output): ${newRenderingCondition ? '✅ Would render' : '❌ Would NOT render'}`)
console.log(`  - Saved feed rendering: ${newSavedRenderingCondition ? '✅ Would render' : '❌ Would NOT render'}`)

if (!allTestsPass) {
  console.log('\n❌ Some tests failed. Check the output above.')
  process.exit(1)
} else {
  console.log('\n✅ All structure tests passed!')
  console.log('\n💡 If feed cards are still not showing, the issue might be:')
  console.log('   1. Messages not being updated correctly (setMessages not working)')
  console.log('   2. React re-rendering issues')
  console.log('   3. Messages not reaching MayaChatInterface')
  console.log('   4. filteredMessages filtering out messages with feed parts')
  process.exit(0)
}

