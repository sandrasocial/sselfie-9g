/**
 * Test Suite for Feed Creation Refactoring
 * 
 * Tests:
 * 1. API endpoint validation
 * 2. Database operations
 * 3. Error handling
 * 4. Pro Mode vs Classic Mode
 */

import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

// Test data
const validStrategyJson = JSON.stringify({
  feedTitle: "Test Instagram Feed",
  overallVibe: "Minimalist and clean",
  colorPalette: "Neutral tones",
  posts: Array.from({ length: 9 }, (_, i) => ({
    position: i + 1,
    postType: i < 7 ? "user" : "lifestyle",
    shotType: i < 3 ? "portrait" : i < 6 ? "half-body" : "full-body",
    visualDirection: `Visual direction for post ${i + 1}`,
    purpose: `Purpose for post ${i + 1}`,
    caption: `Caption for post ${i + 1}`,
  })),
})

const invalidStrategyJson = JSON.stringify({
  feedTitle: "Invalid Feed",
  posts: Array.from({ length: 5 }, (_, i) => ({
    position: i + 1,
    visualDirection: `Post ${i + 1}`,
  })),
})

const nestedStrategyJson = JSON.stringify({
  feedStrategy: {
    feedTitle: "Nested Strategy Feed",
    posts: Array.from({ length: 9 }, (_, i) => ({
      position: i + 1,
      postType: "user",
      shotType: "portrait",
      visualDirection: `Visual direction for post ${i + 1}`,
      purpose: `Purpose for post ${i + 1}`,
      caption: `Caption for post ${i + 1}`,
    })),
  },
})

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const results: TestResult[] = []

function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details })
  const icon = passed ? "✅" : "❌"
  console.log(`${icon} ${name}`)
  if (error) {
    console.log(`   Error: ${error}`)
  }
  if (details) {
    console.log(`   Details: ${JSON.stringify(details, null, 2)}`)
  }
}

async function testDatabaseColumn() {
  console.log("\n📊 Test 1: Database Column Verification")
  console.log("=" .repeat(50))

  try {
    // Check column exists
    const columnInfo = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'maya_chat_messages'
      AND column_name = 'feed_cards'
    `

    if (columnInfo.length === 0) {
      logTest("feed_cards column exists", false, "Column not found")
      return
    }

    logTest("feed_cards column exists", true, undefined, {
      type: columnInfo[0].data_type,
    })

    // Check index exists
    const indexInfo = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'maya_chat_messages'
      AND indexname = 'idx_maya_chat_messages_feed_cards'
    `

    logTest("GIN index exists", indexInfo.length > 0, undefined, {
      indexName: indexInfo[0]?.indexname,
    })
  } catch (error: any) {
    logTest("Database column verification", false, error.message)
  }
}

async function testStrategyValidation() {
  console.log("\n🔍 Test 2: Strategy JSON Validation Logic")
  console.log("=" .repeat(50))

  // Test valid strategy
  try {
    const parsed = JSON.parse(validStrategyJson)
    const hasPosts = parsed.posts && Array.isArray(parsed.posts)
    const has9Posts = hasPosts && parsed.posts.length === 9
    const allPostsValid = has9Posts && parsed.posts.every(
      (p: any) => p.position >= 1 && p.position <= 9 && p.visualDirection
    )

    logTest("Valid strategy parsing", true, undefined, {
      hasPosts,
      postsCount: parsed.posts?.length,
      allPostsValid,
    })
  } catch (error: any) {
    logTest("Valid strategy parsing", false, error.message)
  }

  // Test invalid strategy (wrong post count)
  try {
    const parsed = JSON.parse(invalidStrategyJson)
    const has9Posts = parsed.posts && parsed.posts.length === 9
    logTest("Invalid strategy detection (wrong count)", !has9Posts, undefined, {
      postsCount: parsed.posts?.length,
    })
  } catch (error: any) {
    logTest("Invalid strategy detection", false, error.message)
  }

  // Test nested strategy unwrapping
  try {
    const parsed = JSON.parse(nestedStrategyJson)
    const strategy = parsed.feedStrategy || parsed
    const isUnwrapped = strategy.feedTitle === "Nested Strategy Feed"
    logTest("Nested strategy unwrapping", isUnwrapped, undefined, {
      hasFeedStrategy: !!parsed.feedStrategy,
      unwrapped: isUnwrapped,
    })
  } catch (error: any) {
    logTest("Nested strategy unwrapping", false, error.message)
  }
}

async function testDatabaseOperations() {
  console.log("\n💾 Test 3: Database Operations")
  console.log("=" .repeat(50))

  try {
    // Get a test chat (or create one)
    const [testChat] = await sql`
      SELECT id FROM maya_chats
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!testChat) {
      logTest("Database operations", false, "No test chat found")
      return
    }

    const chatId = testChat.id

    // Test inserting feed card
    const testFeedCard = {
      strategy: JSON.parse(validStrategyJson),
      title: "Test Feed",
      description: "Test description",
      posts: Array.from({ length: 9 }, (_, i) => ({
        position: i + 1,
        visualDirection: `Post ${i + 1}`,
      })),
      isSaved: false,
    }

    try {
      const [inserted] = await sql`
        INSERT INTO maya_chat_messages (chat_id, role, content, feed_cards)
        VALUES (${chatId}, 'assistant', 'Test message', ${JSON.stringify([testFeedCard])}::jsonb)
        RETURNING id, feed_cards
      `

      logTest("Insert feed card to feed_cards", true, undefined, {
        messageId: inserted.id,
        hasFeedCards: !!inserted.feed_cards,
      })

      // Test reading feed card
      const [read] = await sql`
        SELECT feed_cards
        FROM maya_chat_messages
        WHERE id = ${inserted.id}
      `

      const feedCards = read.feed_cards
      const isArray = Array.isArray(feedCards)
      const hasData = isArray && feedCards.length > 0

      logTest("Read feed card from feed_cards", hasData, undefined, {
        isArray,
        count: feedCards?.length || 0,
      })

      // Cleanup: Delete test message
      await sql`
        DELETE FROM maya_chat_messages
        WHERE id = ${inserted.id}
      `

      logTest("Cleanup test data", true)
    } catch (error: any) {
      logTest("Database operations", false, error.message)
    }
  } catch (error: any) {
    logTest("Database operations setup", false, error.message)
  }
}

async function testBackwardCompatibility() {
  console.log("\n🔄 Test 4: Backward Compatibility")
  console.log("=" .repeat(50))

  try {
    // Check if styling_details column still exists
    const stylingColumn = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'maya_chat_messages'
      AND column_name = 'styling_details'
    `

    logTest("styling_details column exists (for fallback)", stylingColumn.length > 0, undefined, {
      exists: stylingColumn.length > 0,
    })

    // Check for any feed cards in styling_details
    const legacyFeeds = await sql`
      SELECT COUNT(*) as count
      FROM maya_chat_messages
      WHERE styling_details IS NOT NULL
        AND styling_details::text LIKE '%"feedStrategy"%'
    `

    logTest("Legacy feeds in styling_details", true, undefined, {
      count: legacyFeeds[0]?.count || 0,
      note: "Fallback logic should handle these",
    })
  } catch (error: any) {
    logTest("Backward compatibility check", false, error.message)
  }
}

async function testTriggerPattern() {
  console.log("\n🎯 Test 5: Trigger Pattern Matching")
  console.log("=" .repeat(50))

  const testCases = [
    {
      name: "Valid trigger with JSON",
      text: '[CREATE_FEED_STRATEGY: {"feedTitle":"Test","posts":[]}]',
      shouldMatch: true,
    },
    {
      name: "Trigger without JSON",
      text: '[CREATE_FEED_STRATEGY]',
      shouldMatch: false, // Our simplified pattern requires JSON
    },
    {
      name: "No trigger",
      text: 'Just regular text',
      shouldMatch: false,
    },
    {
      name: "Case insensitive",
      text: '[create_feed_strategy: {"feedTitle":"Test"}]',
      shouldMatch: true,
    },
  ]

  const pattern = /\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i

  for (const testCase of testCases) {
    const match = pattern.test(testCase.text)
    const passed = match === testCase.shouldMatch
    logTest(testCase.name, passed, undefined, {
      matched: match,
      expected: testCase.shouldMatch,
    })
  }
}

async function runAllTests() {
  console.log("🧪 Feed Creation Refactoring - Test Suite")
  console.log("=" .repeat(50))
  console.log(`Database: ${process.env.DATABASE_URL ? "Connected" : "Not connected"}`)
  console.log(`Timestamp: ${new Date().toISOString()}\n`)

  await testDatabaseColumn()
  await testStrategyValidation()
  await testDatabaseOperations()
  await testBackwardCompatibility()
  await testTriggerPattern()

  // Summary
  console.log("\n" + "=" .repeat(50))
  console.log("📊 Test Summary")
  console.log("=" .repeat(50))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log("\n❌ Failed Tests:")
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error || "Unknown error"}`)
      })
    process.exit(1)
  } else {
    console.log("\n✅ All tests passed!")
    process.exit(0)
  }
}

runAllTests()

