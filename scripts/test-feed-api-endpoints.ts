/**
 * Test Feed Creation API Endpoints
 * 
 * Tests the API endpoint validation logic without making actual HTTP requests
 */

import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

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

// Simulate API endpoint validation logic
function validateStrategy(strategyJson: string): { valid: boolean; error?: string; strategy?: any } {
  try {
    const parsed = JSON.parse(strategyJson)
    
    // Unwrap if nested
    let strategy = parsed.feedStrategy || parsed
    
    // Validate required fields
    if (!strategy.posts || !Array.isArray(strategy.posts)) {
      return { valid: false, error: "Strategy must contain a posts array" }
    }
    
    if (strategy.posts.length !== 9) {
      return { valid: false, error: `Strategy must contain exactly 9 posts, found ${strategy.posts.length}` }
    }
    
    // Validate each post
    const invalidPosts: number[] = []
    strategy.posts.forEach((post: any, index: number) => {
      if (!post.position || post.position < 1 || post.position > 9) {
        invalidPosts.push(index + 1)
      }
      if (!post.visualDirection || post.visualDirection.trim() === '') {
        invalidPosts.push(index + 1)
      }
    })
    
    if (invalidPosts.length > 0) {
      return { valid: false, error: `Invalid posts at positions: ${invalidPosts.join(', ')}` }
    }
    
    // Normalize title
    if (!strategy.feedTitle && strategy.title) {
      strategy.feedTitle = strategy.title
    }
    
    return { valid: true, strategy }
  } catch (error: any) {
    return { valid: false, error: "Invalid JSON format" }
  }
}

async function testAPIValidation() {
  console.log("\n🔍 Test: API Endpoint Validation Logic")
  console.log("=" .repeat(50))

  // Test 1: Valid strategy
  const validJson = JSON.stringify({
    feedTitle: "Test Feed",
    posts: Array.from({ length: 9 }, (_, i) => ({
      position: i + 1,
      visualDirection: `Post ${i + 1}`,
      caption: `Caption ${i + 1}`,
    })),
  })

  const result1 = validateStrategy(validJson)
  logTest("Valid strategy validation", result1.valid, result1.error, {
    hasStrategy: !!result1.strategy,
    postsCount: result1.strategy?.posts?.length,
  })

  // Test 2: Invalid JSON
  const result2 = validateStrategy("{ invalid json }")
  logTest("Invalid JSON detection", !result2.valid, undefined, {
    error: result2.error,
  })

  // Test 3: Missing posts
  const noPostsJson = JSON.stringify({ feedTitle: "No Posts" })
  const result3 = validateStrategy(noPostsJson)
  logTest("Missing posts detection", !result3.valid, undefined, {
    error: result3.error,
  })

  // Test 4: Wrong post count
  const wrongCountJson = JSON.stringify({
    feedTitle: "Wrong Count",
    posts: Array.from({ length: 5 }, (_, i) => ({
      position: i + 1,
      visualDirection: `Post ${i + 1}`,
    })),
  })
  const result4 = validateStrategy(wrongCountJson)
  logTest("Wrong post count detection", !result4.valid, undefined, {
    error: result4.error,
    postsCount: JSON.parse(wrongCountJson).posts.length,
  })

  // Test 5: Missing visualDirection
  const missingFieldJson = JSON.stringify({
    feedTitle: "Missing Field",
    posts: Array.from({ length: 9 }, (_, i) => ({
      position: i + 1,
      // Missing visualDirection
    })),
  })
  const result5 = validateStrategy(missingFieldJson)
  logTest("Missing visualDirection detection", !result5.valid, undefined, {
    error: result5.error,
  })

  // Test 6: Nested feedStrategy
  const nestedJson = JSON.stringify({
    feedStrategy: {
      feedTitle: "Nested Feed",
      posts: Array.from({ length: 9 }, (_, i) => ({
        position: i + 1,
        visualDirection: `Post ${i + 1}`,
      })),
    },
  })
  const result6 = validateStrategy(nestedJson)
  logTest("Nested feedStrategy unwrapping", result6.valid, result6.error, {
    hasStrategy: !!result6.strategy,
    title: result6.strategy?.feedTitle,
  })

  // Test 7: Title normalization
  const titleJson = JSON.stringify({
    title: "Alternative Title",
    posts: Array.from({ length: 9 }, (_, i) => ({
      position: i + 1,
      visualDirection: `Post ${i + 1}`,
    })),
  })
  const result7 = validateStrategy(titleJson)
  logTest("Title normalization (title -> feedTitle)", result7.valid && result7.strategy?.feedTitle === "Alternative Title", undefined, {
    feedTitle: result7.strategy?.feedTitle,
  })
}

async function testDatabaseSaveRead() {
  console.log("\n💾 Test: Database Save/Read Operations")
  console.log("=" .repeat(50))

  try {
    // Get or create test chat
    let [testChat] = await sql`
      SELECT id FROM maya_chats
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!testChat) {
      // Create test chat
      const [newChat] = await sql`
        INSERT INTO maya_chats (user_id, created_at, updated_at)
        VALUES ('test-user', NOW(), NOW())
        RETURNING id
      `
      testChat = newChat
    }

    const chatId = testChat.id

    // Test feed card data
    const feedCardData = {
      strategy: {
        feedTitle: "API Test Feed",
        posts: Array.from({ length: 9 }, (_, i) => ({
          position: i + 1,
          visualDirection: `Post ${i + 1}`,
          caption: `Caption ${i + 1}`,
        })),
      },
      title: "API Test Feed",
      description: "Test description",
      posts: Array.from({ length: 9 }, (_, i) => ({
        position: i + 1,
        visualDirection: `Post ${i + 1}`,
      })),
      isSaved: false,
    }

    // Test INSERT
    const [inserted] = await sql`
      INSERT INTO maya_chat_messages (chat_id, role, content, feed_cards)
      VALUES (${chatId}, 'assistant', 'Test API feed creation', ${JSON.stringify([feedCardData])}::jsonb)
      RETURNING id, feed_cards
    `

    logTest("Save feed card to feed_cards", true, undefined, {
      messageId: inserted.id,
      feedCardsType: typeof inserted.feed_cards,
      isArray: Array.isArray(inserted.feed_cards),
    })

    // Test READ
    const [read] = await sql`
      SELECT feed_cards
      FROM maya_chat_messages
      WHERE id = ${inserted.id}
    `

    const feedCards = read.feed_cards
    const isValid = Array.isArray(feedCards) && feedCards.length > 0
    const hasCorrectData = isValid && feedCards[0].title === "API Test Feed"

    logTest("Read feed card from feed_cards", hasCorrectData, undefined, {
      isArray: Array.isArray(feedCards),
      count: feedCards?.length || 0,
      hasTitle: feedCards?.[0]?.title,
    })

    // Test UPDATE
    const updatedFeedCard = {
      ...feedCardData,
      feedId: 999,
      isSaved: true,
    }

    await sql`
      UPDATE maya_chat_messages
      SET feed_cards = ${JSON.stringify([updatedFeedCard])}::jsonb
      WHERE id = ${inserted.id}
    `

    const [updated] = await sql`
      SELECT feed_cards
      FROM maya_chat_messages
      WHERE id = ${inserted.id}
    `

    const updatedCards = updated.feed_cards
    const isUpdated = Array.isArray(updatedCards) && updatedCards[0].feedId === 999

    logTest("Update feed card in feed_cards", isUpdated, undefined, {
      feedId: updatedCards?.[0]?.feedId,
      isSaved: updatedCards?.[0]?.isSaved,
    })

    // Cleanup
    await sql`
      DELETE FROM maya_chat_messages
      WHERE id = ${inserted.id}
    `

    logTest("Cleanup test data", true)
  } catch (error: any) {
    logTest("Database save/read operations", false, error.message)
  }
}

async function testBackwardCompatibilityRead() {
  console.log("\n🔄 Test: Backward Compatibility (Read from styling_details)")
  console.log("=" .repeat(50))

  try {
    // Simulate old feed card in styling_details
    const testChat = await sql`
      SELECT id FROM maya_chats
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (testChat.length === 0) {
      logTest("Backward compatibility test", false, "No test chat found")
      return
    }

    const chatId = testChat[0].id

    // Create message with feed card in styling_details (old format)
    const oldFeedCard = {
      strategy: {
        feedTitle: "Legacy Feed",
        posts: Array.from({ length: 9 }, (_, i) => ({
          position: i + 1,
          visualDirection: `Post ${i + 1}`,
        })),
      },
      title: "Legacy Feed",
    }

    const [legacyMessage] = await sql`
      INSERT INTO maya_chat_messages (chat_id, role, content, styling_details)
      VALUES (${chatId}, 'assistant', 'Legacy feed card', ${JSON.stringify([oldFeedCard])}::jsonb)
      RETURNING id, styling_details, feed_cards
    `

    // Simulate load-chat logic: Check feed_cards first, then fallback to styling_details
    const feedCards = legacyMessage.feed_cards
    const stylingDetails = legacyMessage.styling_details

    // Should fallback to styling_details
    const finalFeedCards = feedCards || (Array.isArray(stylingDetails) ? stylingDetails : null)

    const fallbackWorks = Array.isArray(finalFeedCards) && finalFeedCards.length > 0

    logTest("Fallback to styling_details works", fallbackWorks, undefined, {
      hasFeedCards: !!feedCards,
      hasStylingDetails: !!stylingDetails,
      finalFeedCardsCount: finalFeedCards?.length || 0,
    })

    // Cleanup
    await sql`
      DELETE FROM maya_chat_messages
      WHERE id = ${legacyMessage.id}
    `

    logTest("Cleanup legacy test data", true)
  } catch (error: any) {
    logTest("Backward compatibility test", false, error.message)
  }
}

async function runAllTests() {
  console.log("🧪 Feed Creation API Endpoints - Test Suite")
  console.log("=" .repeat(50))
  console.log(`Database: ${process.env.DATABASE_URL ? "Connected" : "Not connected"}`)
  console.log(`Timestamp: ${new Date().toISOString()}\n`)

  await testAPIValidation()
  await testDatabaseSaveRead()
  await testBackwardCompatibilityRead()

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
    console.log("\n✅ All API tests passed!")
    process.exit(0)
  }
}

runAllTests()

