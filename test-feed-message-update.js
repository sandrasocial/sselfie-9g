#!/usr/bin/env node

/**
 * Test Feed Message Update Logic
 * 
 * Simulates the setMessages callback from handleCreateFeed
 * to verify the message update logic works correctly
 */

console.log('🧪 Testing Feed Message Update Logic\n')

// Simulate initial messages
const initialMessages = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Create a feed' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'I\'ll create a feed strategy for you!\n\n[CREATE_FEED_STRATEGY: {...}]' },
    ],
  },
]

console.log('Initial messages:')
console.log('  Total messages:', initialMessages.length)
console.log('  Last message role:', initialMessages[initialMessages.length - 1].role)
console.log('  Last message parts:', initialMessages[initialMessages.length - 1].parts.length)

// Simulate handleCreateFeed logic
const strategy = {
  feedTitle: 'Test Feed',
  posts: [
    { position: 1, postType: 'portrait' },
    { position: 2, postType: 'lifestyle' },
  ],
}

const updatedMessages = [...initialMessages]

// Find the last assistant message (iterate backwards)
let found = false
for (let i = updatedMessages.length - 1; i >= 0; i--) {
  if (updatedMessages[i].role === "assistant") {
    const lastAssistant = updatedMessages[i]
    
    console.log('\nFound last assistant message:')
    console.log('  Message ID:', lastAssistant.id)
    console.log('  Current parts:', lastAssistant.parts?.length || 0)
    
    // Check if feed card already exists
    const hasFeedCard = lastAssistant.parts?.some(
      (p) => p.type === "tool-generateFeed"
    )
    
    console.log('  Already has feed card:', hasFeedCard)
    
    if (!hasFeedCard) {
      // Store strategy data in message part (not saved to DB yet)
      const updatedParts = [
        ...(lastAssistant.parts || []),
        {
          type: "tool-generateFeed",
          output: {
            strategy: strategy,
            title: strategy.feedTitle || strategy.title || "Instagram Feed",
            description: strategy.overallVibe || strategy.colorPalette || "",
            posts: strategy.posts || [],
            isSaved: false,
          },
        },
      ]

      updatedMessages[i] = {
        ...lastAssistant,
        parts: updatedParts,
      }
      
      console.log('\n✅ Added feed card part:')
      console.log('  New parts count:', updatedParts.length)
      console.log('  Feed card part type:', updatedParts[updatedParts.length - 1].type)
      console.log('  Has output:', !!updatedParts[updatedParts.length - 1].output)
      console.log('  Has strategy:', !!updatedParts[updatedParts.length - 1].output.strategy)
      console.log('  Posts count:', updatedParts[updatedParts.length - 1].output.posts?.length || 0)
      
      found = true
      break
    }
  }
}

if (!found) {
  console.log('\n❌ Could not find assistant message or feed card already exists')
  process.exit(1)
}

// Verify the update
console.log('\n' + '='.repeat(60))
console.log('📊 VERIFICATION')
console.log('='.repeat(60))

const updatedLastMessage = updatedMessages[updatedMessages.length - 1]
const feedCardPart = updatedLastMessage.parts?.find((p) => p.type === "tool-generateFeed")

console.log('\nUpdated message:')
console.log('  Message ID:', updatedLastMessage.id)
console.log('  Total parts:', updatedLastMessage.parts.length)
console.log('  Has feed card part:', !!feedCardPart)

if (feedCardPart) {
  console.log('\nFeed card part details:')
  console.log('  Type:', feedCardPart.type)
  console.log('  Has output:', !!feedCardPart.output)
  
  if (feedCardPart.output) {
    console.log('  Output keys:', Object.keys(feedCardPart.output))
    console.log('  Has strategy:', !!feedCardPart.output.strategy)
    console.log('  Has posts:', !!feedCardPart.output.posts)
    console.log('  Posts count:', feedCardPart.output.posts?.length || 0)
    console.log('  isSaved:', feedCardPart.output.isSaved)
    console.log('  feedId:', feedCardPart.output.feedId || 'undefined (unsaved)')
    
    // Check rendering condition
    const wouldRender = !!feedCardPart.output
    console.log('\n  Would render (NEW condition: output):', wouldRender ? 'YES ✅' : 'NO ❌')
    
    const wouldRenderOld = feedCardPart.output && feedCardPart.output.feedId
    console.log('  Would render (OLD condition: output && output.feedId):', wouldRenderOld ? 'YES ✅' : 'NO ❌ (unsaved)')
  }
}

// Test: Check if messages array is properly updated
console.log('\n' + '='.repeat(60))
console.log('📊 ARRAY UPDATE TEST')
console.log('='.repeat(60))

const messagesAreSameReference = initialMessages === updatedMessages
const lastMessagesAreDifferent = initialMessages[initialMessages.length - 1] !== updatedMessages[updatedMessages.length - 1]
const partsAreDifferent = initialMessages[initialMessages.length - 1].parts !== updatedMessages[updatedMessages.length - 1].parts

console.log('  Messages array is new reference:', !messagesAreSameReference, messagesAreSameReference ? '❌ (mutated)' : '✅')
console.log('  Last message is new object:', lastMessagesAreDifferent, lastMessagesAreDifferent ? '✅' : '❌ (mutated)')
console.log('  Parts array is new reference:', partsAreDifferent, partsAreDifferent ? '✅' : '❌ (mutated)')

const immutableUpdate = !messagesAreSameReference && lastMessagesAreDifferent && partsAreDifferent
console.log('\n  Immutable update:', immutableUpdate ? '✅ CORRECT' : '❌ INCORRECT (React won\'t detect changes)')

if (!immutableUpdate) {
  console.log('\n❌ CRITICAL: Message update is not immutable!')
  console.log('   React requires immutable updates for state changes.')
  console.log('   This could be why feed cards are not rendering.')
  process.exit(1)
}

console.log('\n✅ All tests passed!')
console.log('\n💡 The message update logic looks correct.')
console.log('   If feed cards are still not showing, check:')
console.log('   1. Is setMessages actually being called?')
console.log('   2. Are messages reaching MayaChatInterface?')
console.log('   3. Is filteredMessages filtering out the message?')
console.log('   4. Are there any React errors in the console?')

process.exit(0)

