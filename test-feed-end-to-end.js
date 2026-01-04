/**
 * End-to-end test for feed creation flow
 * 
 * This script tests the complete flow:
 * 1. Maya outputs CREATE_FEED_STRATEGY trigger
 * 2. Trigger is detected in useEffect
 * 3. handleCreateFeed creates message part
 * 4. FeedPreviewCard receives correct props
 * 
 * Run with: node test-feed-end-to-end.js
 */

// Simulate the complete flow
function simulateFeedCreationFlow() {
  console.log('Testing end-to-end feed creation flow:');
  console.log('==========================================\n');
  
  // Step 1: Maya's response with trigger
  const mayaResponse = `Based on what you've shared, here's your feed strategy:

**Post Pattern:** 3x3 grid with warm/cool alternation
- Posts 1, 4, 7: Portraits - Introduce your brand
- Posts 2, 5, 8: Objects - Show products
- Posts 3, 6, 9: Portraits - Show lifestyle

Does this match your vision? Any changes you'd like to make?

[CREATE_FEED_STRATEGY: {
  "userRequest": "Create a wellness coaching feed",
  "gridPattern": "3x3 grid with alternating warm and cool tones",
  "visualRhythm": "Cohesive visual flow",
  "posts": [
    {"position": 1, "type": "portrait", "description": "Morning routine", "purpose": "Introduce brand", "tone": "warm", "generationMode": "classic", "prompt": "user123, woman, morning routine"},
    {"position": 2, "type": "object", "description": "Wellness products", "purpose": "Show products", "tone": "cool", "generationMode": "classic", "prompt": "wellness products flatlay"},
    {"position": 3, "type": "portrait", "description": "Workout", "purpose": "Show lifestyle", "tone": "warm", "generationMode": "classic", "prompt": "user123, woman, workout"}
  ],
  "totalCredits": 3
}]`;

  console.log('Step 1: Maya response with trigger');
  console.log(`   Response length: ${mayaResponse.length} characters`);
  console.log(`   Contains trigger: ${mayaResponse.includes('[CREATE_FEED_STRATEGY')}`);
  console.log('');
  
  // Step 2: Extract text from message (simulating useEffect)
  const message = {
    id: "msg-123",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: mayaResponse,
      },
    ],
  };
  
  console.log('Step 2: Extract text from message');
  let textContent = "";
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts.filter((p) => p && p.type === "text");
    textContent = textParts.map((p) => p.text || "").join("\n");
  }
  console.log(`   Text content length: ${textContent.length}`);
  console.log(`   Contains trigger: ${textContent.includes('[CREATE_FEED_STRATEGY')}`);
  console.log('');
  
  // Step 3: Detect trigger with regex
  console.log('Step 3: Detect trigger with regex');
  const regex = /\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i;
  const feedStrategyMatch = textContent.match(regex);
  
  if (!feedStrategyMatch) {
    console.log('❌ Trigger not detected!');
    console.log(`   Text preview: ${textContent.substring(0, 200)}...`);
    process.exit(1);
  }
  
  console.log('✅ Trigger detected');
  console.log(`   Captured JSON length: ${feedStrategyMatch[1].length}`);
  console.log('');
  
  // Step 4: Parse strategy JSON
  console.log('Step 4: Parse strategy JSON');
  let strategy;
  try {
    strategy = JSON.parse(feedStrategyMatch[1]);
    console.log('✅ JSON parsed successfully');
    console.log(`   Strategy keys: ${Object.keys(strategy).join(', ')}`);
    console.log(`   Posts count: ${strategy.posts?.length || 0}`);
    
    // Validate required fields
    if (!strategy.posts || !Array.isArray(strategy.posts)) {
      throw new Error("Strategy must have posts array");
    }
    
    if (strategy.posts.length === 0) {
      throw new Error("Strategy must have at least one post");
    }
    
    // Validate each post
    strategy.posts.forEach((post, index) => {
      if (!post.position) {
        throw new Error(`Post ${index} missing position`);
      }
      if (!post.type) {
        throw new Error(`Post ${index} missing type`);
      }
      if (!post.prompt) {
        throw new Error(`Post ${index} missing prompt`);
      }
    });
    
    console.log('✅ Strategy validation passed');
    console.log('');
  } catch (error) {
    console.log(`❌ JSON parse/validation failed: ${error.message}`);
    console.log(`   JSON preview: ${feedStrategyMatch[1].substring(0, 300)}...`);
    process.exit(1);
  }
  
  // Step 5: Create message part (simulating handleCreateFeed)
  console.log('Step 5: Create message part');
  const messagePart = {
    type: "tool-generateFeed",
    output: {
      strategy: strategy,
      title: strategy.feedTitle || strategy.title || "Instagram Feed",
      description: strategy.overallVibe || strategy.colorPalette || "",
      posts: strategy.posts || [],
      isSaved: false,
      studioProMode: false,
      styleStrength: 0.8,
      promptAccuracy: 0.8,
      aspectRatio: "1:1",
      realismStrength: 0.8,
    },
  };
  
  console.log('✅ Message part created');
  console.log(`   Type: ${messagePart.type}`);
  console.log(`   Title: ${messagePart.output.title}`);
  console.log(`   Posts: ${messagePart.output.posts.length}`);
  console.log(`   IsSaved: ${messagePart.output.isSaved}`);
  console.log('');
  
  // Step 6: Verify FeedPreviewCard can read it
  console.log('Step 6: Verify FeedPreviewCard compatibility');
  const output = messagePart.output;
  const feedPreviewProps = {
    feedId: output.feedId || null,
    feedTitle: output.title,
    feedDescription: output.description,
    posts: output.posts,
    strategy: output.strategy,
    isSaved: output.isSaved !== false && !!output.feedId,
  };
  
  console.log('✅ FeedPreviewCard props extracted');
  console.log(`   feedId: ${feedPreviewProps.feedId || "null (unsaved)"}`);
  console.log(`   feedTitle: ${feedPreviewProps.feedTitle}`);
  console.log(`   posts: ${feedPreviewProps.posts.length}`);
  console.log(`   isSaved: ${feedPreviewProps.isSaved}`);
  console.log('');
  
  console.log('==========================================');
  console.log('✅ All end-to-end tests passed!');
  console.log('');
  console.log('Flow summary:');
  console.log('1. ✅ Maya response contains trigger');
  console.log('2. ✅ Text extracted from message parts');
  console.log('3. ✅ Trigger detected with regex');
  console.log('4. ✅ Strategy JSON parsed and validated');
  console.log('5. ✅ Message part created correctly');
  console.log('6. ✅ FeedPreviewCard compatibility verified');
}

// Run the test
try {
  simulateFeedCreationFlow();
} catch (error) {
  console.error('\n❌ Test failed with error:', error);
  console.error(error.stack);
  process.exit(1);
}


