/**
 * Test script to verify Loops API connection
 * 
 * Usage: npx tsx scripts/test-loops-connection.ts
 * or: ts-node scripts/test-loops-connection.ts
 */

import { LoopsClient } from 'loops'

async function testLoopsConnection() {
  const apiKey = process.env.LOOPS_API_KEY
  
  if (!apiKey) {
    console.error('❌ LOOPS_API_KEY not found in environment')
    console.error('💡 Add LOOPS_API_KEY to your .env.local file')
    process.exit(1)
  }
  
  console.log('✅ LOOPS_API_KEY found')
  console.log('🔑 Key preview:', apiKey.substring(0, 10) + '...')
  
  // Test API connection using Loops SDK
  try {
    const loops = new LoopsClient(apiKey)
    
    // Test API key validity (Loops SDK has testApiKey method)
    const testResult = await loops.testApiKey()
    console.log('✅ Successfully connected to Loops API')
    console.log('✅ API key is valid')
    
    // Try to find a contact to verify full API access
    // Using a test email that likely doesn't exist (won't error if contact not found)
    try {
      await loops.findContact({ email: 'test-connection-verify@example.com' })
      console.log('✅ API methods working correctly')
    } catch (findError: any) {
      // Contact not found is fine - means API is working
      if (findError.message?.includes('not found') || findError.statusCode === 404) {
        console.log('✅ API methods working correctly (test contact not found, which is expected)')
      } else {
        throw findError
      }
    }
  } catch (error) {
    console.error('❌ Error connecting to Loops:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    process.exit(1)
  }
}

testLoopsConnection()

