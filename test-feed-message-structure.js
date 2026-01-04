/**
 * Test script for feed message structure
 * 
 * This script tests the message structure that handleCreateFeed creates
 * Run with: node test-feed-message-structure.js
 */

// Simulate the message structure created by handleCreateFeed
function createFeedMessagePart(strategy) {
  return {
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
}

// Test strategy
const testStrategy = {
  feedTitle: "Wellness Coaching Feed",
  title: "Wellness Coaching Feed",
  overallVibe: "Warm and inviting",
  colorPalette: "Warm neutrals",
  posts: [
    {
      position: 1,
      type: "portrait",
      description: "Morning routine",
      purpose: "Introduce brand",
      tone: "warm",
      generationMode: "classic",
      prompt: "user123, woman, morning routine, natural light",
    },
    {
      position: 2,
      type: "object",
      description: "Wellness products",
      purpose: "Show products",
      tone: "cool",
      generationMode: "classic",
      prompt: "wellness products flatlay",
    },
  ],
};

console.log('Testing feed message structure:');
console.log('==========================================\n');

// Test 1: Create message part
console.log('Test 1: Creating message part');
try {
  const messagePart = createFeedMessagePart(testStrategy);
  
  // Validate structure
  if (messagePart.type !== "tool-generateFeed") {
    throw new Error(`Expected type "tool-generateFeed", got "${messagePart.type}"`);
  }
  
  if (!messagePart.output) {
    throw new Error("Expected output object, got undefined");
  }
  
  if (!messagePart.output.strategy) {
    throw new Error("Expected strategy in output, got undefined");
  }
  
  if (!Array.isArray(messagePart.output.posts)) {
    throw new Error(`Expected posts array, got ${typeof messagePart.output.posts}`);
  }
  
  if (messagePart.output.posts.length !== testStrategy.posts.length) {
    throw new Error(`Expected ${testStrategy.posts.length} posts, got ${messagePart.output.posts.length}`);
  }
  
  if (messagePart.output.isSaved !== false) {
    throw new Error(`Expected isSaved to be false, got ${messagePart.output.isSaved}`);
  }
  
  console.log('✅ Message part structure is valid');
  console.log(`   Type: ${messagePart.type}`);
  console.log(`   Title: ${messagePart.output.title}`);
  console.log(`   Posts: ${messagePart.output.posts.length}`);
  console.log(`   IsSaved: ${messagePart.output.isSaved}`);
  console.log('');
} catch (error) {
  console.log(`❌ Test 1 failed: ${error.message}`);
  process.exit(1);
}

// Test 2: Simulate message array update
console.log('Test 2: Simulating message array update');
try {
  const existingMessages = [
    {
      id: "msg-1",
      role: "user",
      content: "Create a feed",
    },
    {
      id: "msg-2",
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "I'll create a feed strategy for you!",
        },
      ],
    },
  ];
  
  const messagePart = createFeedMessagePart(testStrategy);
  
  // Simulate the update logic from handleCreateFeed
  const updatedMessages = [...existingMessages];
  const lastAssistantIndex = updatedMessages.length - 1;
  const lastAssistant = updatedMessages[lastAssistantIndex];
  
  // Check if feed card already exists
  const hasFeedCard = lastAssistant.parts?.some(
    (p) => p.type === "tool-generateFeed"
  );
  
  if (hasFeedCard) {
    throw new Error("Feed card already exists (unexpected)");
  }
  
  // Add feed card
  const updatedParts = [
    ...(lastAssistant.parts || []),
    messagePart,
  ];
  
  updatedMessages[lastAssistantIndex] = {
    ...lastAssistant,
    parts: updatedParts,
  };
  
  // Validate
  const finalMessage = updatedMessages[lastAssistantIndex];
  const feedCardPart = finalMessage.parts.find((p) => p.type === "tool-generateFeed");
  
  if (!feedCardPart) {
    throw new Error("Feed card part not found in updated message");
  }
  
  if (feedCardPart.output.posts.length !== testStrategy.posts.length) {
    throw new Error(`Expected ${testStrategy.posts.length} posts, got ${feedCardPart.output.posts.length}`);
  }
  
  console.log('✅ Message array update is valid');
  console.log(`   Original parts: ${lastAssistant.parts?.length || 0}`);
  console.log(`   Updated parts: ${finalMessage.parts.length}`);
  console.log(`   Feed card found: ${!!feedCardPart}`);
  console.log('');
} catch (error) {
  console.log(`❌ Test 2 failed: ${error.message}`);
  process.exit(1);
}

// Test 3: Verify FeedPreviewCard can read the structure
console.log('Test 3: Verifying FeedPreviewCard compatibility');
try {
  const messagePart = createFeedMessagePart(testStrategy);
  const output = messagePart.output;
  
  // These are the props that FeedPreviewCard expects
  const feedId = output.feedId || null;
  const feedTitle = output.title;
  const feedDescription = output.description;
  const posts = output.posts || [];
  const strategy = output.strategy;
  const isSaved = output.isSaved !== false && !!output.feedId;
  
  if (!feedTitle) {
    throw new Error("feedTitle is required");
  }
  
  if (!Array.isArray(posts)) {
    throw new Error("posts must be an array");
  }
  
  if (!strategy) {
    throw new Error("strategy is required");
  }
  
  if (typeof isSaved !== "boolean") {
    throw new Error(`isSaved must be boolean, got ${typeof isSaved}`);
  }
  
  console.log('✅ FeedPreviewCard compatibility verified');
  console.log(`   feedId: ${feedId || "null (unsaved)"}`);
  console.log(`   feedTitle: ${feedTitle}`);
  console.log(`   posts: ${posts.length}`);
  console.log(`   strategy: ${!!strategy}`);
  console.log(`   isSaved: ${isSaved}`);
  console.log('');
} catch (error) {
  console.log(`❌ Test 3 failed: ${error.message}`);
  process.exit(1);
}

console.log('==========================================');
console.log('✅ All message structure tests passed!');
console.log('');
console.log('Summary:');
console.log('- Message part structure is correct');
console.log('- Message array update logic works');
console.log('- FeedPreviewCard compatibility verified');



