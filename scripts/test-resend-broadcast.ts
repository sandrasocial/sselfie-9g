/**
 * Test script to verify Resend broadcast creation works
 * Run with: npx tsx scripts/test-resend-broadcast.ts
 */

import { Resend } from "resend"
import { config } from "dotenv"
import { join } from "path"

// Load environment variables
config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID

async function testResendBroadcast() {
  console.log("🧪 Testing Resend Broadcast Creation\n")
  
  if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY not found in environment variables")
    process.exit(1)
  }
  
  if (!RESEND_AUDIENCE_ID) {
    console.error("❌ RESEND_AUDIENCE_ID not found in environment variables")
    process.exit(1)
  }
  
  console.log("✅ Environment variables found")
  console.log(`   Audience ID: ${RESEND_AUDIENCE_ID.substring(0, 20)}...`)
  console.log(`   API Key: ${RESEND_API_KEY.substring(0, 20)}...\n`)
  
  const resend = new Resend(RESEND_API_KEY)
  
  const testEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px;">
        <h1 style="color: #1c1917; margin: 0 0 20px;">Test Broadcast</h1>
        <p style="color: #292524; line-height: 1.6;">
          This is a test broadcast to verify Resend integration is working correctly.
        </p>
        <p style="color: #292524; line-height: 1.6;">
          If you see this email, the broadcast was created and sent successfully! ✅
        </p>
      </div>
    </body>
    </html>
  `
  
  try {
    console.log("📧 Creating broadcast...")
    console.log("   From: Sandra from SSELFIE <hello@sselfie.ai>")
    console.log("   Subject: Test Broadcast - Resend Integration")
    console.log("   Audience ID:", RESEND_AUDIENCE_ID)
    console.log()
    
    const broadcast = await resend.broadcasts.create({
      audienceId: RESEND_AUDIENCE_ID,
      from: 'Sandra from SSELFIE <hello@sselfie.ai>',
      subject: 'Test Broadcast - Resend Integration',
      html: testEmailHtml
    })
    
    // Check for errors in response
    if (broadcast.error) {
      console.error("❌ Resend API Error:")
      console.error("   Error:", JSON.stringify(broadcast.error, null, 2))
      process.exit(1)
    }
    
    const broadcastId = broadcast.data?.id
    
    if (!broadcastId) {
      console.error("❌ No broadcast ID returned:")
      console.error("   Response:", JSON.stringify(broadcast, null, 2))
      process.exit(1)
    }
    
    console.log("✅ Broadcast created successfully!")
    console.log(`   Broadcast ID: ${broadcastId}`)
    console.log(`   Dashboard URL: https://resend.com/broadcasts/${broadcastId}`)
    console.log()
    console.log("📝 Next Steps:")
    console.log("   1. Go to https://resend.com/broadcasts")
    console.log("   2. Find the broadcast with ID:", broadcastId)
    console.log("   3. Review the email preview")
    console.log("   4. Click 'Send' to actually send the broadcast")
    console.log()
    console.log("ℹ️  Note: Broadcasts are created as drafts and must be sent manually from the Resend dashboard.")
    
  } catch (error: any) {
    console.error("❌ Exception creating broadcast:")
    console.error("   Error:", error.message)
    console.error("   Stack:", error.stack)
    process.exit(1)
  }
}

testResendBroadcast()
  .then(() => {
    console.log("\n✅ Test completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error)
    process.exit(1)
  })

