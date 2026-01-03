#!/usr/bin/env node

/**
 * Test Feed Card Filtering
 * 
 * Tests if filteredMessages might be filtering out messages with feed cards
 */

console.log('🧪 Testing Feed Card Filtering Logic\n')

// Simulate messages with feed card
const messagesWithFeedCard = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Create a feed' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'I\'ll create a feed!' },
      {
        type: "tool-generateFeed",
        output: {
          strategy: { feedTitle: 'Test Feed', posts: [] },
          title: 'Test Feed',
          posts: [],
          isSaved: false,
        },
      },
    ],
  },
]

// Simulate contentFilter logic (from maya-chat-screen.tsx)
function filterMessages(messages, contentFilter) {
  return messages.filter((msg) => {
    if (contentFilter === "all") return true

    if (contentFilter === "photos") {
      // Show messages with concept cards (photos)
      return msg.parts?.some((inv) => inv.type === "tool-generateConcepts" && inv.output?.state === "ready")
    }

    if (contentFilter === "videos") {
      // Show messages with video cards
      return msg.parts?.some((inv) => inv.type === "tool-generateVideo")
    }

    return true
  })
}

console.log('Test 1: Filtering with contentFilter="all"')
const filteredAll = filterMessages(messagesWithFeedCard, "all")
console.log('  Total messages:', messagesWithFeedCard.length)
console.log('  Filtered messages:', filteredAll.length)
console.log('  All messages included:', filteredAll.length === messagesWithFeedCard.length ? '✅ YES' : '❌ NO')

const feedCardMessage = filteredAll.find(msg => 
  msg.parts?.some(p => p.type === "tool-generateFeed")
)
console.log('  Feed card message included:', feedCardMessage ? '✅ YES' : '❌ NO')

console.log('\nTest 2: Filtering with contentFilter="photos"')
const filteredPhotos = filterMessages(messagesWithFeedCard, "photos")
console.log('  Total messages:', messagesWithFeedCard.length)
console.log('  Filtered messages:', filteredPhotos.length)
console.log('  All messages included:', filteredPhotos.length === messagesWithFeedCard.length ? '✅ YES' : '❌ NO')

const feedCardMessagePhotos = filteredPhotos.find(msg => 
  msg.parts?.some(p => p.type === "tool-generateFeed")
)
console.log('  Feed card message included:', feedCardMessagePhotos ? '✅ YES' : '❌ NO (FILTERED OUT!)')

console.log('\nTest 3: Filtering with contentFilter="videos"')
const filteredVideos = filterMessages(messagesWithFeedCard, "videos")
console.log('  Total messages:', messagesWithFeedCard.length)
console.log('  Filtered messages:', filteredVideos.length)
console.log('  All messages included:', filteredVideos.length === messagesWithFeedCard.length ? '✅ YES' : '❌ NO')

const feedCardMessageVideos = filteredVideos.find(msg => 
  msg.parts?.some(p => p.type === "tool-generateFeed")
)
console.log('  Feed card message included:', feedCardMessageVideos ? '✅ YES' : '❌ NO (FILTERED OUT!)')

console.log('\n' + '='.repeat(60))
console.log('📊 FINDINGS')
console.log('='.repeat(60))

const issueFound = !feedCardMessagePhotos || !feedCardMessageVideos

if (issueFound) {
  console.log('\n❌ ISSUE FOUND!')
  console.log('\nThe contentFilter logic does NOT account for feed cards!')
  console.log('If contentFilter is "photos" or "videos", messages with feed cards are filtered out.')
  console.log('\n💡 SOLUTION:')
  console.log('   Add feed card check to the filter logic, OR')
  console.log('   Ensure contentFilter is "all" in the feed tab context')
  process.exit(1)
} else {
  console.log('\n✅ No filtering issues found')
  console.log('   (But feed cards should still work even if filtered - need to check feed tab context)')
  process.exit(0)
}

